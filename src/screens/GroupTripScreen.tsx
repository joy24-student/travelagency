/**
 * Collaborative Group Trip Screen - Shopno Jatra (স্বপ্নযাত্রা)
 *
 * Implements:
 * 1. Trip Home: Member roster, roles ('owner', 'editor', 'viewer'), TripTopBudgetBar.
 * 2. Live Itinerary: Day tabs, reordering with optimistic updates & version checking.
 * 3. Proposals & Voting: Creation, live countdown, up/down voting, atomic accept_proposal RPC.
 * 4. Expenses & Settlement: Zero-float integer paisa balance computation, debt minimisation,
 *    and direct "Settle up" handoff into /screens/payments flow.
 * 5. Invite Hub: Token generation, QR Code rendering, deep links, and atomic join_trip RPC.
 * 6. Viewers read-only protection, Realtime pub-sub via Supabase & appEventBus.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";

import { useAuth } from "../hooks/useAuth";
import {
  groupTripService,
  GroupTrip,
  GroupMember,
  TripItem,
  TripProposal,
  GroupMemberRole,
  VersionConflictError,
} from "../services/trip/groupTripService";
import {
  GroupExpense,
  bdtToPaisa,
  paisaToBdt,
  Transfer,
} from "../utils/groupTripBalances";
import { TripTopBudgetBar } from "../components/trip/TripTopBudgetBar";
import { TripSplitBillModal } from "../components/trip/TripSplitBillModal";
import { TripShareExportModal } from "../components/trip/TripShareExportModal";
import { appEventBus, APP_EVENTS } from "../services/events/appEventBus";
import { copyToClipboard } from "../utils/clipboard";
import { safeGoBack } from "../utils/navigationHelper";

const BRAND_BLUE = "#0055F2";
const SUCCESS_GREEN = "#10B981";
const DANGER_RED = "#EF4444";
const WARNING_AMBER = "#F59E0B";

export const GroupTripScreen: React.FC = () => {
  const { user } = useAuth();
  const params = useLocalSearchParams();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "home" | "itinerary" | "proposals" | "expenses" | "invite"
  >(
    (params?.tab as any) || "home"
  );

  // Trips & Active Trip State
  const [trips, setTrips] = useState<GroupTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<GroupTrip | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [items, setItems] = useState<TripItem[]>([]);
  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);

  // Concurrency & Notice
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [showShareExportModal, setShowShareExportModal] = useState(false);

  // Form states: Create Trip
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripStart, setNewTripStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newTripEnd, setNewTripEnd] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
  );

  // Form states: Add Item
  const [itemTitle, setItemTitle] = useState("");
  const [itemDay, setItemDay] = useState("");
  const [itemTime, setItemTime] = useState("10:00");
  const [itemLocation, setItemLocation] = useState("");
  const [itemCostBdt, setItemCostBdt] = useState("");

  // Form states: Create Proposal
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalKind, setProposalKind] = useState("activity");
  const [proposalDay, setProposalDay] = useState("");
  const [proposalCostBdt, setProposalCostBdt] = useState("");
  const [proposalHours, setProposalHours] = useState("24");

  // Form states: Add Expense
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmountBdt, setExpenseAmountBdt] = useState("");
  const [expensePayerId, setExpensePayerId] = useState("");

  // Invite Link & QR State
  const [activeInviteLink, setActiveInviteLink] = useState("");
  const [joinTokenInput, setJoinTokenInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Countdown timer trigger (ticks every 1s)
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current user's role in active trip
  const myRole: GroupMemberRole = useMemo(() => {
    if (!activeTrip || !user) return "viewer";
    if (activeTrip.owner_id === user.id) return "owner";
    const membership = members.find((m) => m.user_id === user.id);
    return membership?.role || "viewer";
  }, [activeTrip, members, user]);

  const isReadOnly = myRole === "viewer";

  // Days list for itinerary tabs
  const tripDaysList = useMemo(() => {
    if (!activeTrip) return [];
    const days: string[] = [];
    const start = new Date(activeTrip.start_date);
    const end = new Date(activeTrip.end_date);
    const curr = new Date(start);
    while (curr <= end) {
      days.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return days.length > 0 ? days : [activeTrip.start_date];
  }, [activeTrip]);

  const [selectedDay, setSelectedDay] = useState<string>("");

  useEffect(() => {
    if (tripDaysList.length > 0 && !selectedDay) {
      setSelectedDay(tripDaysList[0]);
    }
  }, [tripDaysList, selectedDay]);

  // Load Trips & Active Trip Data
  const loadTripData = useCallback(
    async (targetTripId?: string) => {
      try {
        const userTrips = await groupTripService.getUserTrips();
        setTrips(userTrips);

        let selected = activeTrip;
        const requestedId = targetTripId || params?.tripId;

        if (requestedId) {
          selected =
            userTrips.find((t) => t.id === requestedId) ||
            (await groupTripService.getTrip(requestedId as string));
        } else if (!selected && userTrips.length > 0) {
          selected = userTrips[0];
        }

        if (selected) {
          setActiveTrip(selected);
          const [mList, iList, pList, eList] = await Promise.all([
            groupTripService.getMembers(selected.id),
            groupTripService.getItems(selected.id),
            groupTripService.getProposals(selected.id),
            groupTripService.getExpenses(selected.id),
          ]);
          setMembers(mList);
          setItems(iList);
          setProposals(pList);
          setExpenses(eList);
          if (!expensePayerId && user?.id) {
            setExpensePayerId(user.id);
          }
        }
      } catch (err) {
        console.warn("Error loading group trip data:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTrip, params?.tripId, user?.id, expensePayerId]
  );

  useEffect(() => {
    loadTripData();
  }, []);

  // Handle Join via Deep Link parameter
  useEffect(() => {
    const joinToken = params?.joinToken as string;
    if (joinToken && user?.id) {
      (async () => {
        try {
          setIsJoining(true);
          const joinedTripId = await groupTripService.joinTrip(joinToken);
          Alert.alert("স্বাগতম!", "আপনি সফলভাবে গ্রুপ ট্রিপে যুক্ত হয়েছেন!");
          await loadTripData(joinedTripId);
          setActiveTab("home");
        } catch (err: any) {
          Alert.alert("যোগদানে ব্যর্থ", err?.message || "ইনভাইট লিংকটি সঠিক নয়।");
        } finally {
          setIsJoining(false);
        }
      })();
    }
  }, [params?.joinToken, user?.id]);

  // Realtime & appEventBus subscription
  useEffect(() => {
    if (!activeTrip?.id) return;

    // 1. Supabase Realtime channel
    const unsubscribeRealtime = groupTripService.subscribeTripRealtime(
      activeTrip.id,
      () => {
        loadTripData(activeTrip.id);
      }
    );

    // 2. appEventBus subscribers
    const unsubTrip = appEventBus.subscribe(APP_EVENTS.GROUP_TRIP_UPDATED, () => {
      loadTripData(activeTrip.id);
    });
    const unsubItem = appEventBus.subscribe(APP_EVENTS.TRIP_ITEM_MUTATED, () => {
      loadTripData(activeTrip.id);
    });
    const unsubProp = appEventBus.subscribe(
      APP_EVENTS.TRIP_PROPOSAL_MUTATED,
      () => {
        loadTripData(activeTrip.id);
      }
    );
    const unsubExp = appEventBus.subscribe(
      APP_EVENTS.TRIP_EXPENSE_MUTATED,
      () => {
        loadTripData(activeTrip.id);
      }
    );

    return () => {
      unsubscribeRealtime();
      unsubTrip();
      unsubItem();
      unsubProp();
      unsubExp();
    };
  }, [activeTrip?.id, loadTripData]);

  // Settlement calculations
  const settlement = useMemo(() => {
    const memberIds = members.map((m) => m.user_id);
    return groupTripService.calculateSettlement(expenses, memberIds);
  }, [expenses, members]);

  // Convert paisa to BDT for Top Budget Bar
  const totalSpentBdt = useMemo(() => {
    return Number(settlement.totalSpentPaisa) / 100;
  }, [settlement.totalSpentPaisa]);

  // Planned budget estimate
  const plannedBudgetBdt = useMemo(() => {
    const itemTotalPaisa = items.reduce(
      (acc, it) => acc + (it.cost_paisa ? BigInt(it.cost_paisa) : BigInt(0)),
      BigInt(0)
    );
    const bdt = Number(itemTotalPaisa) / 100;
    return bdt > 0 ? bdt : 30000;
  }, [items]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setConflictNotice(null);
    loadTripData(activeTrip?.id);
  }, [activeTrip?.id, loadTripData]);

  // --------------------------------------------------------------------------
  // ACTION HANDLERS
  // --------------------------------------------------------------------------

  // Create Trip
  const handleCreateTrip = async () => {
    if (!newTripTitle.trim()) {
      Alert.alert("নাম আবশ্যক", "অনুগ্রহ করে ট্রিপের নাম লিখুন।");
      return;
    }
    try {
      setLoading(true);
      const trip = await groupTripService.createTrip({
        title: newTripTitle.trim(),
        startDate: newTripStart,
        endDate: newTripEnd,
      });
      setShowCreateTripModal(false);
      setNewTripTitle("");
      await loadTripData(trip.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("ত্রুটি", err?.message || "ট্রিপ তৈরিতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  // Add Itinerary Item
  const handleAddItem = async () => {
    if (isReadOnly) {
      Alert.alert("অনুমতি নেই", "দর্শকদের জন্য সম্পাদনা অনুমোদিত নয়।");
      return;
    }
    if (!activeTrip) return;
    if (!itemTitle.trim()) {
      Alert.alert("শিরোনাম আবশ্যক", "আইটিনারি আইটেমের শিরোনাম দিন।");
      return;
    }

    try {
      const costPaisa = itemCostBdt ? bdtToPaisa(itemCostBdt) : null;
      await groupTripService.createItem({
        trip_id: activeTrip.id,
        day: itemDay || selectedDay || activeTrip.start_date,
        start_time: itemTime,
        title: itemTitle.trim(),
        location: itemLocation ? { name: itemLocation } : null,
        cost_paisa: costPaisa,
        order_index: items.length,
      });

      setShowAddItemModal(false);
      setItemTitle("");
      setItemLocation("");
      setItemCostBdt("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTripData(activeTrip.id);
    } catch (err: any) {
      Alert.alert("ত্রুটি", err?.message || "আইটেম যুক্ত করতে ব্যর্থ।");
    }
  };

  // Reorder Itinerary Items (Up / Down) with Version Check
  const handleMoveItem = async (index: number, direction: "up" | "down") => {
    if (isReadOnly) {
      Alert.alert("অনুমতি নেই", "দর্শকদের জন্য সম্পাদনা অনুমোদিত নয়।");
      return;
    }
    if (!activeTrip) return;

    const dayItems = items.filter((it) => it.day === selectedDay);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dayItems.length) return;

    const itemA = dayItems[index];
    const itemB = dayItems[targetIndex];

    // Optimistic local state swap
    const nextItems = [...items];
    const idxA = nextItems.findIndex((it) => it.id === itemA.id);
    const idxB = nextItems.findIndex((it) => it.id === itemB.id);

    const tempOrder = itemA.order_index;
    itemA.order_index = itemB.order_index;
    itemB.order_index = tempOrder;

    nextItems[idxA] = { ...itemB };
    nextItems[idxB] = { ...itemA };
    setItems(nextItems);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await groupTripService.reorderItemsOptimistic([
        {
          id: itemA.id,
          trip_id: activeTrip.id,
          day: itemA.day,
          order_index: itemB.order_index,
          version: itemA.version,
          title: itemA.title,
        },
        {
          id: itemB.id,
          trip_id: activeTrip.id,
          day: itemB.day,
          order_index: tempOrder,
          version: itemB.version,
          title: itemB.title,
        },
      ]);
    } catch (err: any) {
      if (err instanceof VersionConflictError) {
        setConflictNotice(
          "সংস্করণ দ্বন্দ্ব: অন্য সহযাত্রী আইটিনারি পরিবর্তন করেছেন। সর্বশেষ তথ্য রিফ্রেশ করা হচ্ছে..."
        );
        loadTripData(activeTrip.id);
      } else {
        Alert.alert("রিঅর্ডার ত্রুটি", err?.message);
        loadTripData(activeTrip.id);
      }
    }
  };

  // Create Proposal
  const handleCreateProposal = async () => {
    if (isReadOnly) {
      Alert.alert("অনুমতি নেই", "দর্শকদের জন্য প্রস্তাবনা অনুমোদিত নয়।");
      return;
    }
    if (!activeTrip || !proposalTitle.trim()) {
      Alert.alert("তথ্য পূরণ করুন", "প্রস্তাবনার শিরোনাম লিখুন।");
      return;
    }

    try {
      const hours = parseInt(proposalHours, 10) || 24;
      const closesAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      const costPaisa = proposalCostBdt ? bdtToPaisa(proposalCostBdt) : null;

      await groupTripService.createProposal({
        trip_id: activeTrip.id,
        trip_title: activeTrip.title,
        kind: proposalKind,
        title: proposalTitle.trim(),
        details: {
          day: proposalDay || selectedDay || activeTrip.start_date,
          cost_paisa: costPaisa ? costPaisa.toString() : null,
        },
        closes_at: closesAt,
      });

      setShowCreateProposalModal(false);
      setProposalTitle("");
      setProposalCostBdt("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTripData(activeTrip.id);
    } catch (err: any) {
      Alert.alert("ত্রুটি", err?.message || "প্রস্তাব তৈরিতে সমস্যা হয়েছে।");
    }
  };

  // Vote on Proposal
  const handleVote = async (proposalId: string, voteValue: -1 | 0 | 1) => {
    if (isReadOnly) {
      Alert.alert("অনুমতি নেই", "দর্শকদের জন্য ভোট দেওয়া অনুমোদিত নয়।");
      return;
    }
    if (!activeTrip) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await groupTripService.castVote(proposalId, activeTrip.id, voteValue);
      loadTripData(activeTrip.id);
    } catch (err: any) {
      Alert.alert("ভোট ত্রুটি", err?.message);
    }
  };

  // Accept Proposal atomically
  const handleAcceptProposal = async (proposal: TripProposal) => {
    if (isReadOnly) {
      Alert.alert("অনুমতি নেই", "কেবলমাত্র এডিটর বা মালিক প্রস্তাব গ্রহণ করতে পারেন।");
      return;
    }
    if (!activeTrip) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await groupTripService.acceptProposal(proposal.id, activeTrip.title);
      Alert.alert(
        "প্রস্তাবনা গৃহীত!",
        `"${proposal.title}" আইটিনারিতে যুক্ত হয়েছে!`
      );
      loadTripData(activeTrip.id);
    } catch (err: any) {
      Alert.alert("ত্রুটি", err?.message || "প্রস্তাবনা গ্রহণে সমস্যা হয়েছে।");
    }
  };

  // Add Expense
  const handleAddExpense = async () => {
    if (isReadOnly) {
      Alert.alert("অনুমতি নেই", "দর্শকদের জন্য খরচ যোগ করা অনুমোদিত নয়।");
      return;
    }
    if (!activeTrip || !expenseDesc.trim() || !expenseAmountBdt.trim()) {
      Alert.alert("তথ্য পূরণ করুন", "বিবরণ এবং টাকার পরিমাণ লিখুন।");
      return;
    }

    try {
      const amountPaisa = bdtToPaisa(expenseAmountBdt);
      if (amountPaisa <= BigInt(0)) {
        Alert.alert("অবৈধ পরিমাণ", "টাকার পরিমাণ শূন্য হতে পারে না।");
        return;
      }

      const allMemberIds = members.map((m) => m.user_id);
      await groupTripService.addExpense({
        trip_id: activeTrip.id,
        trip_title: activeTrip.title,
        amount_paisa: amountPaisa,
        description: expenseDesc.trim(),
        split: { type: "equal", participants: allMemberIds },
        paid_by: expensePayerId || user?.id,
        allMemberIds,
      });

      setShowAddExpenseModal(false);
      setExpenseDesc("");
      setExpenseAmountBdt("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTripData(activeTrip.id);
    } catch (err: any) {
      Alert.alert("ত্রুটি", err?.message || "খরচ যোগ করতে ব্যর্থ।");
    }
  };

  // Generate Invite Link & QR
  const handleGenerateInvite = async () => {
    if (!activeTrip) return;
    try {
      const invite = await groupTripService.createInvite({
        trip_id: activeTrip.id,
        expiresInHours: 72,
        max_uses: 10,
      });
      setActiveInviteLink(invite.link);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("ইনভাইট লিংক ত্রুটি", err?.message);
    }
  };

  // Native Share Invite Link
  const handleShareInvite = async () => {
    if (!activeInviteLink && !activeTrip) return;
    const link =
      activeInviteLink || `https://shopnojatra.com/group-trip/${activeTrip?.id}`;
    try {
      await Share.share({
        title: `${activeTrip?.title} - স্বপ্নযাত্রা গ্রুপ ট্রিপে যোগ দিন`,
        message: `আমাদের সাথে "${activeTrip?.title}" গ্রুপ ট্রিপে যুক্ত হতে এই লিংকে ক্লিক করুন:\n${link}`,
        url: link,
      });
    } catch {
      // User cancelled
    }
  };

  // Join Existing Trip with Token
  const handleJoinTripWithInput = async () => {
    if (!joinTokenInput.trim()) {
      Alert.alert("টোকেন আবশ্যক", "অনুগ্রহ করে ইনভাইট কোড বা টোকেন দিন।");
      return;
    }
    try {
      setIsJoining(true);
      const joinedId = await groupTripService.joinTrip(joinTokenInput.trim());
      setJoinTokenInput("");
      Alert.alert("সফল!", "আপনি ট্রিপে সফলভাবে যুক্ত হয়েছেন!");
      await loadTripData(joinedId);
      setActiveTab("home");
    } catch (err: any) {
      Alert.alert("যোগদান ব্যর্থ", err?.message || "টোকেনটি অবৈধ বা মেয়াদোত্তীর্ণ।");
    } finally {
      setIsJoining(false);
    }
  };

  // Settle up: Navigate to payment flow with prefilled amount
  const handleSettleUpPayment = (transfer: Transfer) => {
    const creditor = members.find((m) => m.user_id === transfer.to);
    const creditorName =
      creditor?.display_name ||
      creditor?.user_id.slice(0, 8) ||
      "सहযাত্রী";
    const amountBdt = paisaToBdt(transfer.amount_paisa);

    router.push({
      pathname: "/screens/payments",
      params: {
        amount: amountBdt,
        reference: `Settlement: Trip ${activeTrip?.title} to ${creditorName}`,
        bookingId: activeTrip?.id,
      },
    });
  };

  // --------------------------------------------------------------------------
  // RENDER SECTIONS
  // --------------------------------------------------------------------------

  if (loading && !activeTrip) {
    return (
      <SafeAreaView style={styles.shell} edges={["top"]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND_BLUE} />
          <Text style={styles.loadingText}>গ্রুপ ট্রিপ লোড হচ্ছে...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack("/(tabs)/trips")}
        >
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeTrip ? activeTrip.title : "গ্রুপ ট্রিপ"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeTrip
              ? `${activeTrip.start_date} হতে ${activeTrip.end_date}`
              : "সহযাত্রীদের সাথে ভ্রমণ"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowCreateTripModal(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color={BRAND_BLUE} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowShareExportModal(true)}
          >
            <Ionicons name="share-social-outline" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Concurrency / Viewer Alert Banner ─────────────────────────── */}
      {conflictNotice && (
        <View style={styles.conflictBanner}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.conflictBannerText}>{conflictNotice}</Text>
          <TouchableOpacity onPress={() => onRefresh()}>
            <Text style={styles.refreshLink}>রিফ্রেশ</Text>
          </TouchableOpacity>
        </View>
      )}

      {isReadOnly && (
        <View style={styles.viewerBadgeRow}>
          <Ionicons name="eye-outline" size={14} color="#6B7280" />
          <Text style={styles.viewerBadgeText}>
            দর্শক মোড (রিড-অনলি): আপনি এই ট্রিপের তথ্য দেখতে পারবেন।
          </Text>
        </View>
      )}

      {/* ─── Navigation Tabs Bar ───────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "home" && styles.tabItemActive]}
          onPress={() => setActiveTab("home")}
        >
          <Ionicons
            name="home-outline"
            size={16}
            color={activeTab === "home" ? BRAND_BLUE : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "home" && styles.tabTextActive,
            ]}
          >
            হোম
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "itinerary" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("itinerary")}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === "itinerary" ? BRAND_BLUE : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "itinerary" && styles.tabTextActive,
            ]}
          >
            আইটিনারি
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "proposals" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("proposals")}
        >
          <Ionicons
            name="thumbs-up-outline"
            size={16}
            color={activeTab === "proposals" ? BRAND_BLUE : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "proposals" && styles.tabTextActive,
            ]}
          >
            ভোট ({proposals.filter((p) => p.status === "open").length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "expenses" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("expenses")}
        >
          <Ionicons
            name="wallet-outline"
            size={16}
            color={activeTab === "expenses" ? BRAND_BLUE : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "expenses" && styles.tabTextActive,
            ]}
          >
            হিসাব
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "invite" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("invite")}
        >
          <Ionicons
            name="person-add-outline"
            size={16}
            color={activeTab === "invite" ? BRAND_BLUE : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "invite" && styles.tabTextActive,
            ]}
          >
            ইনভাইট
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Main Content Views ────────────────────────────────────────── */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ════════════ TAB 1: TRIP HOME ════════════ */}
        {activeTab === "home" && (
          <View style={styles.tabContent}>
            {/* Reused TripTopBudgetBar */}
            <TripTopBudgetBar
              plannedBudget={plannedBudgetBdt}
              totalSpent={totalSpentBdt}
              currency="BDT"
              onAddExpensePress={() => setShowAddExpenseModal(true)}
              onSplitBillPress={() => setShowSplitBillModal(true)}
            />

            {/* Members Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="people" size={18} color={BRAND_BLUE} />
                  <Text style={styles.cardTitle}>
                    সহযাত্রী দল ({members.length} জন)
                  </Text>
                </View>
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.pillActionBtn}
                    onPress={() => setActiveTab("invite")}
                  >
                    <Ionicons name="add" size={14} color={BRAND_BLUE} />
                    <Text style={styles.pillActionBtnText}>বন্ধু যোগ করুন</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.membersList}>
                {members.map((m) => (
                  <View key={m.user_id} style={styles.memberRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(m.display_name || m.user_id)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>
                        {m.display_name || `Traveler ${m.user_id.slice(0, 6)}`}
                        {m.user_id === user?.id ? " (আপনি)" : ""}
                      </Text>
                      <Text style={styles.memberJoined}>
                        যুক্ত হয়েছেন: {new Date(m.joined_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.roleBadge,
                        m.role === "owner"
                          ? styles.roleOwner
                          : m.role === "editor"
                          ? styles.roleEditor
                          : styles.roleViewer,
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>
                        {m.role === "owner"
                          ? "মালিক"
                          : m.role === "editor"
                          ? "এডিটর"
                          : "দর্শক"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => setActiveTab("itinerary")}
              >
                <Ionicons name="map-outline" size={24} color={BRAND_BLUE} />
                <Text style={styles.gridBtnLabel}>লাইভ আইটিনারি</Text>
                <Text style={styles.gridBtnSub}>
                  {items.length}টি অ্যাক্টিভিটি
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => setActiveTab("proposals")}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={24}
                  color={SUCCESS_GREEN}
                />
                <Text style={styles.gridBtnLabel}>প্রস্তাবনা ও ভোট</Text>
                <Text style={styles.gridBtnSub}>
                  {proposals.length}টি প্রস্তাব
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => setActiveTab("expenses")}
              >
                <Ionicons
                  name="receipt-outline"
                  size={24}
                  color={WARNING_AMBER}
                />
                <Text style={styles.gridBtnLabel}>খরচ ও নিষ্পত্তি</Text>
                <Text style={styles.gridBtnSub}>
                  ৳{totalSpentBdt.toLocaleString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => setShowShareExportModal(true)}
              >
                <Ionicons name="document-text-outline" size={24} color="#6366F1" />
                <Text style={styles.gridBtnLabel}>পিডিএফ এক্সপোর্ট</Text>
                <Text style={styles.gridBtnSub}>অফলাইন ও শেয়ার</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ════════════ TAB 2: ITINERARY ════════════ */}
        {activeTab === "itinerary" && (
          <View style={styles.tabContent}>
            {/* Days Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daysScroll}
              contentContainerStyle={styles.daysContainer}
            >
              {tripDaysList.map((day, idx) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayPill,
                    selectedDay === day && styles.dayPillActive,
                  ]}
                  onPress={() => {
                    setSelectedDay(day);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.dayPillDayNum,
                      selectedDay === day && styles.dayPillDayNumActive,
                    ]}
                  >
                    দিন {idx + 1}
                  </Text>
                  <Text
                    style={[
                      styles.dayPillDate,
                      selectedDay === day && styles.dayPillDateActive,
                    ]}
                  >
                    {day.slice(5)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Bar for Day */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {selectedDay} এর ভ্রমণ পরিকল্পনা
              </Text>
              {!isReadOnly && (
                <TouchableOpacity
                  style={styles.actionAddBtn}
                  onPress={() => {
                    setItemDay(selectedDay);
                    setShowAddItemModal(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.actionAddBtnText}>আইটেম যোগ</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Items List */}
            {items.filter((it) => it.day === selectedDay).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="trail-sign-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>এই দিনে কোনো আইটেম নেই</Text>
                <Text style={styles.emptySub}>
                  নতুন অ্যাক্টিভিটি বা পরিকল্পনা যোগ করতে উপরের বাটনে চাপুন।
                </Text>
              </View>
            ) : (
              items
                .filter((it) => it.day === selectedDay)
                .map((it, idx, arr) => (
                  <View key={it.id} style={styles.itineraryCard}>
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeText}>
                        {it.start_time ? it.start_time.slice(0, 5) : "--:--"}
                      </Text>
                      <View style={styles.timelineDot} />
                    </View>

                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{it.title}</Text>
                      {it.location?.name && (
                        <View style={styles.locRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color="#6B7280"
                          />
                          <Text style={styles.locText}>{it.location.name}</Text>
                        </View>
                      )}
                      {it.cost_paisa != null && (
                        <Text style={styles.costText}>
                          আনুমানিক: ৳{paisaToBdt(it.cost_paisa)}
                        </Text>
                      )}
                    </View>

                    {!isReadOnly && (
                      <View style={styles.reorderCol}>
                        <TouchableOpacity
                          disabled={idx === 0}
                          style={[
                            styles.reorderBtn,
                            idx === 0 && styles.reorderBtnDisabled,
                          ]}
                          onPress={() => handleMoveItem(idx, "up")}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={16}
                            color={idx === 0 ? "#D1D5DB" : "#4B5563"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={idx === arr.length - 1}
                          style={[
                            styles.reorderBtn,
                            idx === arr.length - 1 && styles.reorderBtnDisabled,
                          ]}
                          onPress={() => handleMoveItem(idx, "down")}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={idx === arr.length - 1 ? "#D1D5DB" : "#4B5563"}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
            )}
          </View>
        )}

        {/* ════════════ TAB 3: PROPOSALS & VOTING ════════════ */}
        {activeTab === "proposals" && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>প্রস্তাবনা ও ভোটিং</Text>
              {!isReadOnly && (
                <TouchableOpacity
                  style={styles.actionAddBtn}
                  onPress={() => setShowCreateProposalModal(true)}
                >
                  <Ionicons name="bulb-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionAddBtnText}>নতুন প্রস্তাবনা</Text>
                </TouchableOpacity>
              )}
            </View>

            {proposals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>এখনো কোনো প্রস্তাব নেই</Text>
                <Text style={styles.emptySub}>
                  ভ্রমণে কোথায় যাবেন বা কী করবেন তা সহযাত্রীদের ভোটে প্রস্তাব করুন!
                </Text>
              </View>
            ) : (
              proposals.map((prop) => {
                const closesAtMs = new Date(prop.closes_at).getTime();
                const remainingSec = Math.max(
                  0,
                  Math.floor((closesAtMs - nowTimestamp) / 1000)
                );
                const isClosed = remainingSec <= 0 || prop.status !== "open";
                const hoursLeft = Math.floor(remainingSec / 3600);
                const minsLeft = Math.floor((remainingSec % 3600) / 60);
                const secsLeft = remainingSec % 60;

                return (
                  <View key={prop.id} style={styles.proposalCard}>
                    <View style={styles.proposalHeaderRow}>
                      <View style={styles.kindBadge}>
                        <Text style={styles.kindBadgeText}>
                          {prop.kind.toUpperCase()}
                        </Text>
                      </View>

                      {prop.status === "open" ? (
                        <View style={styles.countdownBadge}>
                          <Ionicons name="time-outline" size={12} color="#DC2626" />
                          <Text style={styles.countdownText}>
                            {remainingSec > 0
                              ? `${hoursLeft}ঘ ${minsLeft}মি ${secsLeft}সে`
                              : "মেয়াদোত্তীর্ণ"}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusBadge,
                            prop.status === "accepted"
                              ? styles.statusAccepted
                              : styles.statusRejected,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {prop.status === "accepted" ? "গৃহীত" : "বাতিল"}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.proposalTitle}>{prop.title}</Text>
                    {prop.details?.day && (
                      <Text style={styles.proposalMeta}>
                        দিন: {prop.details.day}{" "}
                        {prop.details.cost_paisa
                          ? `· খরচ ৳${paisaToBdt(prop.details.cost_paisa)}`
                          : ""}
                      </Text>
                    )}

                    {/* Voting Tally & Actions */}
                    <View style={styles.proposalFooter}>
                      <View style={styles.voteControls}>
                        <TouchableOpacity
                          disabled={isReadOnly || isClosed}
                          style={[
                            styles.voteBtn,
                            prop.userVote === 1 && styles.voteBtnUpActive,
                          ]}
                          onPress={() =>
                            handleVote(prop.id, prop.userVote === 1 ? 0 : 1)
                          }
                        >
                          <Ionicons
                            name="arrow-up"
                            size={16}
                            color={prop.userVote === 1 ? "#FFFFFF" : "#10B981"}
                          />
                          <Text
                            style={[
                              styles.voteCount,
                              prop.userVote === 1 && styles.voteCountActive,
                            ]}
                          >
                            {prop.upvotes || 0}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isReadOnly || isClosed}
                          style={[
                            styles.voteBtn,
                            prop.userVote === -1 && styles.voteBtnDownActive,
                          ]}
                          onPress={() =>
                            handleVote(prop.id, prop.userVote === -1 ? 0 : -1)
                          }
                        >
                          <Ionicons
                            name="arrow-down"
                            size={16}
                            color={prop.userVote === -1 ? "#FFFFFF" : "#EF4444"}
                          />
                          <Text
                            style={[
                              styles.voteCount,
                              prop.userVote === -1 && styles.voteCountActive,
                            ]}
                          >
                            {prop.downvotes || 0}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {prop.status === "open" && !isReadOnly && (
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => handleAcceptProposal(prop)}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.acceptBtnText}>অ্যাক্সেপ্ট</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ════════════ TAB 4: EXPENSES & SETTLEMENT ════════════ */}
        {activeTab === "expenses" && (
          <View style={styles.tabContent}>
            {/* Top Budget Bar */}
            <TripTopBudgetBar
              plannedBudget={plannedBudgetBdt}
              totalSpent={totalSpentBdt}
              currency="BDT"
              onAddExpensePress={() => setShowAddExpenseModal(true)}
              onSplitBillPress={() => setShowSplitBillModal(true)}
            />

            {/* Net Balances Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>সদস্যদের ব্যালেন্স (নেট হিসাব)</Text>
              <Text style={styles.cardSubtitle}>
                পজিটিভ মানে তারা টাকা পাবেন, নেগেটিভ মানে তারা দলের কাছে ঋণগ্রস্ত।
              </Text>

              {members.map((m) => {
                const balPaisa = settlement.balances[m.user_id] || BigInt(0);
                const isPositive = balPaisa > BigInt(0);
                const isZero = balPaisa === BigInt(0);

                return (
                  <View key={m.user_id} style={styles.balanceRow}>
                    <Text style={styles.balanceMemberName}>
                      {m.display_name || `Traveler ${m.user_id.slice(0, 6)}`}
                    </Text>
                    <Text
                      style={[
                        styles.balanceAmount,
                        isZero
                          ? styles.balanceZero
                          : isPositive
                          ? styles.balancePos
                          : styles.balanceNeg,
                      ]}
                    >
                      {isZero
                        ? "পরিশোধিত"
                        : `${isPositive ? "+" : ""}৳${paisaToBdt(balPaisa)}`}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Settlements ("কে কাকে কত দেবে") */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="swap-horizontal" size={18} color={BRAND_BLUE} />
                  <Text style={styles.cardTitle}>
                    কে কাকে কত দেবে (ন্যূনতম লেনদেন)
                  </Text>
                </View>
              </View>

              {settlement.transfers.length === 0 ? (
                <Text style={styles.settledText}>
                  সব হিসাব পরিশোধিত! কারো কোনো দেনা-পাওনা নেই।
                </Text>
              ) : (
                settlement.transfers.map((t, idx) => {
                  const fromMember = members.find((m) => m.user_id === t.from);
                  const toMember = members.find((m) => m.user_id === t.to);
                  const fromName =
                    fromMember?.display_name || t.from.slice(0, 6);
                  const toName = toMember?.display_name || t.to.slice(0, 6);
                  const amountBdt = paisaToBdt(t.amount_paisa);

                  return (
                    <View key={idx} style={styles.transferRow}>
                      <View style={styles.transferInfo}>
                        <Text style={styles.transferFrom}>{fromName}</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.transferTo}>{toName}</Text>
                        <Text style={styles.transferAmount}>৳{amountBdt}</Text>
                      </View>

                      {/* Prefilled Settle Up Button */}
                      <TouchableOpacity
                        style={styles.settleUpBtn}
                        onPress={() => handleSettleUpPayment(t)}
                      >
                        <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.settleUpBtnText}>পরিশোধ করুন</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            {/* Expense Log */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>খরচের তালিকা</Text>
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.pillActionBtn}
                    onPress={() => setShowAddExpenseModal(true)}
                  >
                    <Ionicons name="add" size={14} color={BRAND_BLUE} />
                    <Text style={styles.pillActionBtnText}>খরচ যোগ</Text>
                  </TouchableOpacity>
                )}
              </View>

              {expenses.length === 0 ? (
                <Text style={styles.emptySub}>এখনো কোনো খরচ যুক্ত করা হয়নি।</Text>
              ) : (
                expenses.map((e) => {
                  const payer = members.find((m) => m.user_id === e.paid_by);
                  return (
                    <View key={e.id} style={styles.expenseItemRow}>
                      <View style={styles.expenseIconWrap}>
                        <Ionicons name="receipt" size={16} color={BRAND_BLUE} />
                      </View>
                      <View style={styles.expenseDetails}>
                        <Text style={styles.expenseDesc}>{e.description}</Text>
                        <Text style={styles.expensePayer}>
                          পরিশোধ করেছেন:{" "}
                          {payer?.display_name || e.paid_by.slice(0, 6)}
                        </Text>
                      </View>
                      <Text style={styles.expenseAmountVal}>
                        ৳{paisaToBdt(e.amount_paisa)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ════════════ TAB 5: INVITE & JOIN ════════════ */}
        {activeTab === "invite" && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>বন্ধুদের আমন্ত্রণ জানান</Text>
              <Text style={styles.cardSubtitle}>
                ইনভাইট লিংক বা কিউআর কোড স্ক্যান করে যেকেউ এই ট্রিপে যুক্ত হতে
                পারবেন।
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGenerateInvite}
              >
                <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>
                  নতুন ইনভাইট লিংক ও QR তৈরি করুন
                </Text>
              </TouchableOpacity>

              {activeInviteLink !== "" && (
                <View style={styles.qrContainer}>
                  <View style={styles.qrCodeBox}>
                    <QRCode
                      value={activeInviteLink}
                      size={180}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.qrLinkText} numberOfLines={1}>
                    {activeInviteLink}
                  </Text>

                  <View style={styles.qrActionRow}>
                    <TouchableOpacity
                      style={styles.qrBtnSecondary}
                      onPress={() => {
                        copyToClipboard(activeInviteLink);
                        Alert.alert("কপি হয়েছে", "ইনভাইট লিংক ক্লিপবোর্ডে কপি হয়েছে।");
                      }}
                    >
                      <Ionicons name="copy-outline" size={16} color="#374151" />
                      <Text style={styles.qrBtnSecondaryText}>কপি করুন</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.qrBtnPrimary}
                      onPress={handleShareInvite}
                    >
                      <Ionicons
                        name="share-social-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.qrBtnPrimaryText}>শেয়ার করুন</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Join existing trip via token */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>অন্য কোনো ট্রিপে যোগ দিন</Text>
              <Text style={styles.cardSubtitle}>
                আপনার বন্ধু পাঠানো ইনভাইট টোকেন বা লিংক কোড পেস্ট করুন:
              </Text>

              <TextInput
                style={styles.inputField}
                placeholder="ইনভাইট টোকেন এখানে লিখুন..."
                value={joinTokenInput}
                onChangeText={setJoinTokenInput}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isJoining && styles.primaryBtnDisabled,
                ]}
                disabled={isJoining}
                onPress={handleJoinTripWithInput}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="enter-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryBtnText}>ট্রিপে যোগ দিন</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── MODAL: CREATE TRIP ────────────────────────────────────────── */}
      <Modal visible={showCreateTripModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন গ্রুপ ট্রিপ শুরু করুন</Text>
              <TouchableOpacity onPress={() => setShowCreateTripModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>ট্রিপের নাম / গন্তব্য</Text>
            <TextInput
              style={styles.inputField}
              placeholder="যেমন: সেন্টমার্টিন ফ্রেন্ডস ট্যুর"
              value={newTripTitle}
              onChangeText={setNewTripTitle}
            />

            <Text style={styles.inputLabel}>শুরুর তারিখ (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.inputField}
              value={newTripStart}
              onChangeText={setNewTripStart}
            />

            <Text style={styles.inputLabel}>শেষ তারিখ (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.inputField}
              value={newTripEnd}
              onChangeText={setNewTripEnd}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateTrip}
            >
              <Text style={styles.primaryBtnText}>ট্রিপ তৈরি করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: ADD ITINERARY ITEM ─────────────────────────────────── */}
      <Modal visible={showAddItemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>আইটিনারিতে যোগ করুন</Text>
              <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>কার্যক্রম / স্থান</Text>
            <TextInput
              style={styles.inputField}
              placeholder="যেমন: সাজেক ভ্যালিতে সানসেট দর্শন"
              value={itemTitle}
              onChangeText={setItemTitle}
            />

            <Text style={styles.inputLabel}>তারিখ</Text>
            <TextInput
              style={styles.inputField}
              value={itemDay}
              onChangeText={setItemDay}
            />

            <Text style={styles.inputLabel}>সময়</Text>
            <TextInput
              style={styles.inputField}
              placeholder="10:00"
              value={itemTime}
              onChangeText={setItemTime}
            />

            <Text style={styles.inputLabel}>লোকেশন</Text>
            <TextInput
              style={styles.inputField}
              placeholder="কংলাক পাহাড়"
              value={itemLocation}
              onChangeText={setItemLocation}
            />

            <Text style={styles.inputLabel}>আনুমানিক খরচ (টাকা)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="৳৫০০"
              keyboardType="numeric"
              value={itemCostBdt}
              onChangeText={setItemCostBdt}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddItem}>
              <Text style={styles.primaryBtnText}>আইটেম যোগ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: CREATE PROPOSAL ────────────────────────────────────── */}
      <Modal visible={showCreateProposalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন প্রস্তাবনা তৈরি করুন</Text>
              <TouchableOpacity
                onPress={() => setShowCreateProposalModal(false)}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>প্রস্তাবের বিষয়</Text>
            <TextInput
              style={styles.inputField}
              placeholder="যেমন: রাত্রে ক্যাম্পফায়ার ও বারবিকিউ"
              value={proposalTitle}
              onChangeText={setProposalTitle}
            />

            <Text style={styles.inputLabel}>ধরণ</Text>
            <View style={styles.kindSelectorRow}>
              {["activity", "dining", "stay", "transport"].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.kindSelectPill,
                    proposalKind === k && styles.kindSelectPillActive,
                  ]}
                  onPress={() => setProposalKind(k)}
                >
                  <Text
                    style={[
                      styles.kindSelectText,
                      proposalKind === k && styles.kindSelectTextActive,
                    ]}
                  >
                    {k}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>আনুমানিক খরচ (টাকা)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="৳১৫০০"
              keyboardType="numeric"
              value={proposalCostBdt}
              onChangeText={setProposalCostBdt}
            />

            <Text style={styles.inputLabel}>ভোটের মেয়াদ (ঘণ্টা)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="24"
              keyboardType="numeric"
              value={proposalHours}
              onChangeText={setProposalHours}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateProposal}
            >
              <Text style={styles.primaryBtnText}>প্রস্তাব উন্মুক্ত করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: ADD EXPENSE ────────────────────────────────────────── */}
      <Modal visible={showAddExpenseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন খরচ যুক্ত করুন</Text>
              <TouchableOpacity onPress={() => setShowAddExpenseModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>খরচের বিবরণ</Text>
            <TextInput
              style={styles.inputField}
              placeholder="যেমন: চাদের গাড়ি ভাড়া"
              value={expenseDesc}
              onChangeText={setExpenseDesc}
            />

            <Text style={styles.inputLabel}>মোট টাকা (BDT)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="৳৫০০০"
              keyboardType="numeric"
              value={expenseAmountBdt}
              onChangeText={setExpenseAmountBdt}
            />

            <Text style={styles.inputLabel}>কে পরিশোধ করেছেন?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {members.map((m) => (
                <TouchableOpacity
                  key={m.user_id}
                  style={[
                    styles.payerPill,
                    expensePayerId === m.user_id && styles.payerPillActive,
                  ]}
                  onPress={() => setExpensePayerId(m.user_id)}
                >
                  <Text
                    style={[
                      styles.payerPillText,
                      expensePayerId === m.user_id && styles.payerPillTextActive,
                    ]}
                  >
                    {m.display_name || m.user_id.slice(0, 6)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleAddExpense}
            >
              <Text style={styles.primaryBtnText}>খরচ সংরক্ষণ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── REUSED MODAL: TRIP SPLIT BILL ────────────────────────────── */}
      <TripSplitBillModal
        visible={showSplitBillModal}
        onClose={() => setShowSplitBillModal(false)}
        tripTitle={activeTrip?.title || "Group Trip"}
        destination={activeTrip?.title || "Bangladesh"}
        currency="BDT"
      />

      {/* ─── REUSED MODAL: TRIP SHARE & EXPORT ─────────────────────────── */}
      <TripShareExportModal
        visible={showShareExportModal}
        onClose={() => setShowShareExportModal(false)}
        plan={{
          id: activeTrip?.id || "trip",
          title: activeTrip?.title || "Group Trip",
          destination: activeTrip?.title || "Bangladesh",
          startDate: activeTrip?.start_date || "",
          endDate: activeTrip?.end_date || "",
          currency: "BDT",
          days: tripDaysList.map((d, i) => ({
            dayNumber: i + 1,
            date: d,
            theme: `Day ${i + 1}`,
            activities: items
              .filter((it) => it.day === d)
              .map((it) => ({
                time: it.start_time || "10:00",
                title: it.title,
                location: it.location?.name || "",
                cost: it.cost_paisa ? Number(it.cost_paisa) / 100 : 0,
                description: "",
              })),
          })),
        } as any}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
  },
  conflictBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  conflictBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#B91C1C",
  },
  refreshLink: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  viewerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  viewerBadgeText: {
    fontSize: 12,
    color: "#4B5563",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: BRAND_BLUE,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: BRAND_BLUE,
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  pillActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  pillActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: BRAND_BLUE,
  },
  membersList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  memberJoined: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleOwner: {
    backgroundColor: "#FEF3C7",
  },
  roleEditor: {
    backgroundColor: "#D1FAE5",
  },
  roleViewer: {
    backgroundColor: "#F3F4F6",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridBtn: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  gridBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 4,
  },
  gridBtnSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  daysScroll: {
    marginBottom: 8,
  },
  daysContainer: {
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  dayPillActive: {
    backgroundColor: BRAND_BLUE,
    borderColor: BRAND_BLUE,
  },
  dayPillDayNum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  dayPillDayNumActive: {
    color: "#FFFFFF",
  },
  dayPillDate: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  dayPillDateActive: {
    color: "#E0E7FF",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  actionAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionAddBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  itineraryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    alignItems: "center",
  },
  timeColumn: {
    alignItems: "center",
    width: 48,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_BLUE,
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  locText: {
    fontSize: 11,
    color: "#6B7280",
  },
  costText: {
    fontSize: 11,
    fontWeight: "600",
    color: SUCCESS_GREEN,
    marginTop: 2,
  },
  reorderCol: {
    gap: 2,
  },
  reorderBtn: {
    padding: 4,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  proposalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  proposalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kindBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusAccepted: {
    backgroundColor: "#D1FAE5",
  },
  statusRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  proposalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  proposalMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  proposalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  voteControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  voteBtnUpActive: {
    backgroundColor: SUCCESS_GREEN,
    borderColor: SUCCESS_GREEN,
  },
  voteBtnDownActive: {
    backgroundColor: DANGER_RED,
    borderColor: DANGER_RED,
  },
  voteCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  voteCountActive: {
    color: "#FFFFFF",
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  balanceMemberName: {
    fontSize: 13,
    color: "#374151",
  },
  balanceAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
  balancePos: {
    color: SUCCESS_GREEN,
  },
  balanceNeg: {
    color: DANGER_RED,
  },
  balanceZero: {
    color: "#9CA3AF",
  },
  settledText: {
    fontSize: 13,
    color: SUCCESS_GREEN,
    fontStyle: "italic",
  },
  transferRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  transferInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  transferFrom: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  transferTo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  transferAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginLeft: 4,
  },
  settleUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleUpBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  expenseItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  expenseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  expensePayer: {
    fontSize: 11,
    color: "#6B7280",
  },
  expenseAmountVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  qrCodeBox: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrLinkText: {
    fontSize: 12,
    color: "#6B7280",
    maxWidth: 240,
  },
  qrActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  qrBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  qrBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 4,
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  kindSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  kindSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  kindSelectPillActive: {
    backgroundColor: BRAND_BLUE,
  },
  kindSelectText: {
    fontSize: 12,
    color: "#4B5563",
  },
  kindSelectTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  payerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  payerPillActive: {
    backgroundColor: BRAND_BLUE,
  },
  payerPillText: {
    fontSize: 12,
    color: "#4B5563",
  },
  payerPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
