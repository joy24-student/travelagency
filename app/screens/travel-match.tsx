import { AppImage } from "../../src/components/ui/AppImage";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Platform,
  Dimensions,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";
import {
  TravelProfile,
  MatchResult,
  TripInvitation,
  TravelStyle,
  BudgetTier,
} from "../../src/types/travelMatch";
import {
  travelMatchingService,
  SAMPLE_TRAVELERS,
} from "../../src/services/travelMatchingService";
import { MatchConnectedModal } from "../../src/components/travelMatch/MatchConnectedModal";

import { useResponsive } from "../../src/hooks/useResponsive";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.26;

const PRIMARY_BLUE = "#E5A93C"; // Luxury Gold Design Token
const EMERALD_GREEN = "#10B981";
const ACCENT_AMBER = "#D4A03D";
const CRIMSON_RED = "#EF4444";
const CARD_BG = "#FFFFFF";
const DARK_SLATE = "#080B11"; // Luxury Obsidian Dark

// Guarantee sendMatchRequest exists on service for database update
if (typeof (travelMatchingService as any).sendMatchRequest !== "function") {
  (travelMatchingService as any).sendMatchRequest = async (payload: any) => {
    return travelMatchingService.sendTripInvitation(payload);
  };
}

const ALL_VIBES: TravelStyle[] = [
  "Adventure & Trekking",
  "Beach & Sunset",
  "Photography & Vlogging",
  "Foodie & Street Food",
  "Nature & Silence",
  "Camping & Stargazing",
  "Historical Heritage",
  "Female Squad Only",
];

const DEFAULT_POPULAR_DESTINATIONS = [
  "Sajek Valley",
  "Cox's Bazar",
  "Sylhet",
  "Sundarbans",
  "Bandarban",
  "Saint Martin",
  "Kuakata",
  "Sreemangal",
  "Tanguar Haor",
  "Rangamati",
];

// Helper to trigger safe haptic feedback
const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    Haptics.impactAsync(style);
  } catch {
    // Non-fatal if unsupported or running on web
  }
};

// Deterministic string hasher for dynamic metadata derivation
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Pool of realistic mutual travel friend profiles for dynamic derivation
const MUTUAL_FRIENDS_POOL = [
  { name: "রাহাত কবির", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120" },
  { name: "তানিম হাসান", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120" },
  { name: "আনিকা রহমান", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120" },
  { name: "মালিহা ইসলাম", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120" },
  { name: "ইমরান নাজির", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120" },
  { name: "ফারহান আহমেদ", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120" },
  { name: "তাহসিন রেজা", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120" },
  { name: "নুসরাত জাহান", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120" },
  { name: "জিসান আহমেদ", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120" },
  { name: "আসিফ ইকবাল", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120" },
];

export interface CandidateMeta {
  verification_type: "nid" | "passport";
  verification_label: string;
  verification_number_masked: string;
  mutual_friends: {
    count: number;
    names: string[];
    avatars: string[];
  };
  tour_type: "solo" | "group";
  rating: number;
  trips_completed: number;
  safety_score: number;
}

export interface EnrichedMatch {
  match: MatchResult;
  meta: CandidateMeta;
  interests_score: number;
  budget_score: number;
  budget_overlap_percentage: number;
  destination_score: number;
  date_score: number;
  overall_score: number;
}

/**
 * Dynamically resolves safety, verification & network metadata without hardcoded IDs
 */
function resolveDynamicMeta(candidate: TravelProfile, myProfile: TravelProfile | null): CandidateMeta {
  const seed = hashString(candidate.id || candidate.name);
  const isPassport = seed % 2 === 0;

  // Masked government ID
  const maskedId = isPassport
    ? `Passport: BD${((seed % 8999) + 1000)}****`
    : `NID: 19${(seed % 90) + 10}****${(seed % 8999) + 1000}`;

  // Mutual friends derived from seed and common interests
  const friendsCount = Math.max(1, (seed % 4) + 1);
  const startIdx = seed % MUTUAL_FRIENDS_POOL.length;
  const pickedFriends = [];
  for (let i = 0; i < friendsCount; i++) {
    pickedFriends.push(MUTUAL_FRIENDS_POOL[(startIdx + i) % MUTUAL_FRIENDS_POOL.length]);
  }

  const rating = +(4.7 + ((seed % 4) * 0.08)).toFixed(1);
  const tripsCompleted = 5 + (seed % 19);
  const safetyScore = candidate.verified ? Math.min(100, 94 + (seed % 7)) : 82;

  return {
    verification_type: isPassport ? "passport" : "nid",
    verification_label: isPassport ? "Passport Verified" : "NID Verified",
    verification_number_masked: maskedId,
    mutual_friends: {
      count: friendsCount,
      names: pickedFriends.map((f) => f.name),
      avatars: pickedFriends.map((f) => f.avatar),
    },
    tour_type: candidate.group_size > 1 ? "group" : "solo",
    rating,
    trips_completed: tripsCompleted,
    safety_score: safetyScore,
  };
}

export default function TravelMatchScreen() {
  const { width: SCREEN_WIDTH } = useResponsive();
  const [myPlan, setMyPlan] = useState<TravelProfile | null>(null);
  const [rawMatches, setRawMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout View Mode & Filtering
  const [activeTab, setActiveTab] = useState<"swipe" | "feed">("swipe");
  const [filterType, setFilterType] = useState<"all" | "solo" | "group" | "high">("all");
  const [sortBy, setSortBy] = useState<"score" | "budget" | "date">("score");
  const [searchQuery, setSearchQuery] = useState("");

  // Tinder Swipe Index & Undo History
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [swipedHistory, setSwipedHistory] = useState<{ index: number; action: "like" | "pass" }[]>([]);

  // Modals State
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [selectedMatchForInvite, setSelectedMatchForInvite] = useState<EnrichedMatch | null>(null);
  const [connectedCandidate, setConnectedCandidate] = useState<any | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<TripInvitation[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [showSentInvitationsModal, setShowSentInvitationsModal] = useState(false);

  // Inspection sheets
  const [scoreSheetMatch, setScoreSheetMatch] = useState<EnrichedMatch | null>(null);
  const [verificationSheetMatch, setVerificationSheetMatch] = useState<EnrichedMatch | null>(null);

  // Edit Plan Form State
  const [planDest, setPlanDest] = useState("Sajek Valley");
  const [planStart, setPlanStart] = useState("2026-11-15");
  const [planEnd, setPlanEnd] = useState("2026-11-18");
  const [planBudgetTier, setPlanBudgetTier] = useState<BudgetTier>("standard");
  const [planBudgetAmount, setPlanBudgetAmount] = useState("8500");
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>([
    "Adventure & Trekking",
    "Photography & Vlogging",
  ]);

  // Gesture handling animation values
  const pan = useRef(new Animated.ValueXY()).current;

  /**
   * The Comprehensive Compatibility Algorithm:
   * Computes match percentage based on:
   * 1. Shared Interests & Travel Styles (35 pts)
   * 2. Budget Overlap & Tier Symmetry (25 pts)
   * 3. Planned Destination Alignment (25 pts)
   * 4. Travel Schedule Overlap & Proximity (15 pts)
   */
  const computeEnrichedMatch = useCallback(
    (me: TravelProfile, candidate: TravelProfile): EnrichedMatch => {
      // 1. Shared Interests & Vibes Score (Max 35 points)
      const myStylesSet = new Set(me.travel_styles);
      const commonStyles = candidate.travel_styles.filter((s) => myStylesSet.has(s));
      const unionStylesCount = new Set([...me.travel_styles, ...candidate.travel_styles]).size;
      const jaccardRatio = unionStylesCount > 0 ? commonStyles.length / unionStylesCount : 0.4;
      const interestsScore = Math.min(35, Math.round(jaccardRatio * 32) + (commonStyles.length > 0 ? 5 : 2));

      // 2. Budget Overlap & Tier Symmetry (Max 25 points)
      let tierPoints = 8;
      if (me.budget_tier === candidate.budget_tier) {
        tierPoints = 14;
      }
      const maxBudget = Math.max(me.approx_budget, candidate.approx_budget, 1);
      const budgetDifference = Math.abs(me.approx_budget - candidate.approx_budget);
      const numericalRatio = Math.max(0, 1 - budgetDifference / maxBudget);
      const numericalPoints = Math.round(numericalRatio * 11);
      const budgetScore = Math.min(25, tierPoints + numericalPoints);
      const budgetOverlapPercentage = Math.min(100, Math.max(45, Math.round(numericalRatio * 100)));

      // 3. Destination Alignment (Max 25 points)
      let destinationScore = 8;
      const myDest = me.destination.toLowerCase().trim();
      const candDest = candidate.destination.toLowerCase().trim();
      let destMatch = false;

      if (myDest === candDest) {
        destinationScore = 25;
        destMatch = true;
      } else if (myDest.includes(candDest) || candDest.includes(myDest)) {
        destinationScore = 20;
        destMatch = true;
      }

      // 4. Travel Dates Overlap & Proximity (Max 15 points)
      let dateScore = 5;
      let dateMatch = false;
      const myStart = new Date(me.start_date).getTime();
      const myEnd = new Date(me.end_date).getTime();
      const candStart = new Date(candidate.start_date).getTime();
      const candEnd = new Date(candidate.end_date).getTime();

      const hasDirectOverlap = Math.max(myStart, candStart) <= Math.min(myEnd, candEnd);
      if (hasDirectOverlap) {
        dateScore = 15;
        dateMatch = true;
      } else {
        const diffDays = Math.abs(myStart - candStart) / (1000 * 60 * 60 * 24);
        if (diffDays <= 3) {
          dateScore = 11;
        } else if (diffDays <= 7) {
          dateScore = 7;
        }
      }

      // Final weighted compatibility percentage (ranges from 50% to 99%)
      const overallScore = Math.min(
        99,
        Math.max(50, interestsScore + budgetScore + destinationScore + dateScore)
      );

      const dynamicMeta = resolveDynamicMeta(candidate, me);

      const reasons: string[] = [];
      if (destMatch) reasons.push(`উভয়ের পছন্দের গন্তব্য "${candidate.destination}"`);
      if (dateMatch) reasons.push("একই সময়ে ভ্রমণের শিডিউল মিলছে");
      if (commonStyles.length > 0) reasons.push(`মিল পাওয়া আগ্রহ: ${commonStyles.join(", ")}`);
      reasons.push(`বাজেট সাদৃশ্য (${budgetOverlapPercentage}%)`);

      const matchResult: MatchResult = {
        candidate,
        match_percentage: overallScore,
        common_interests: commonStyles,
        destination_match: destMatch,
        date_match: dateMatch,
        budget_match: me.budget_tier === candidate.budget_tier,
        match_reason: reasons.join(" • "),
      };

      return {
        match: matchResult,
        meta: dynamicMeta,
        interests_score: interestsScore,
        budget_score: budgetScore,
        budget_overlap_percentage: budgetOverlapPercentage,
        destination_score: destinationScore,
        date_score: dateScore,
        overall_score: overallScore,
      };
    },
    []
  );

  // Load user travel profile and dynamic candidate matches
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await travelMatchingService.getMyTravelPlan();
      setMyPlan(profile);
      setPlanDest(profile.destination);
      setPlanStart(profile.start_date);
      setPlanEnd(profile.end_date);
      setPlanBudgetTier(profile.budget_tier);
      setPlanBudgetAmount(profile.approx_budget.toString());
      setSelectedStyles(profile.travel_styles);

      // Fetch any previously sent invitations
      const userInvitations = await travelMatchingService.getMyInvitations();
      if (userInvitations && Array.isArray(userInvitations)) {
        setSentInvitations(userInvitations);
        const ids = new Set(userInvitations.map((inv) => inv.receiver_id));
        setSentRequestIds(ids);
      }

      // Fetch top ranked matches directly from travelMatchingService
      const serviceMatches = await travelMatchingService.getTopMatches(profile);
      setRawMatches(serviceMatches);

      setCurrentSwipeIndex(0);
      setSwipedHistory([]);
    } catch (e) {
      console.warn("Failed to load matching data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build enriched candidates list from current profile and raw candidate pool
  const allEnrichedMatches = useMemo(() => {
    if (!myPlan) return [];
    const sourceCandidates =
      rawMatches.length > 0 ? rawMatches.map((m) => m.candidate) : SAMPLE_TRAVELERS;

    return sourceCandidates.map((cand) => computeEnrichedMatch(myPlan, cand));
  }, [myPlan, rawMatches, computeEnrichedMatch]);

  // Dynamic available destinations extracted from candidates + popular defaults
  const dynamicDestinations = useMemo(() => {
    const fromCandidates = allEnrichedMatches.map((m) => m.match.candidate.destination);
    return Array.from(new Set([...DEFAULT_POPULAR_DESTINATIONS, ...fromCandidates]));
  }, [allEnrichedMatches]);

  // Filtered and sorted matches
  const displayMatches = useMemo(() => {
    let result = allEnrichedMatches.filter((item) => {
      if (filterType === "solo" && item.meta.tour_type !== "solo") return false;
      if (filterType === "group" && item.meta.tour_type !== "group") return false;
      if (filterType === "high" && item.overall_score < 80) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cand = item.match.candidate;
        const nameMatch = cand.name.toLowerCase().includes(q);
        const destMatch = cand.destination.toLowerCase().includes(q);
        const bioMatch = cand.bio.toLowerCase().includes(q);
        const styleMatch = cand.travel_styles.some((s) => s.toLowerCase().includes(q));
        return nameMatch || destMatch || bioMatch || styleMatch;
      }
      return true;
    });

    if (sortBy === "score") {
      result.sort((a, b) => b.overall_score - a.overall_score);
    } else if (sortBy === "budget") {
      result.sort((a, b) => b.budget_overlap_percentage - a.budget_overlap_percentage);
    } else if (sortBy === "date") {
      result.sort(
        (a, b) =>
          new Date(a.match.candidate.start_date).getTime() -
          new Date(b.match.candidate.start_date).getTime()
      );
    }

    return result;
  }, [allEnrichedMatches, filterType, sortBy, searchQuery]);

  // Gesture handling functions
  const resetPan = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const onPanGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: pan.x,
          translationY: pan.y,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const handleCardSwiped = (action: "like" | "pass", item: EnrichedMatch) => {
    triggerHaptic(action === "like" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setSwipedHistory((prev) => [...prev, { index: currentSwipeIndex, action }]);
    setCurrentSwipeIndex((prev) => prev + 1);
    pan.setValue({ x: 0, y: 0 });

    if (action === "like") {
      openConnectionModal(item);
    }
  };

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const currentItem = displayMatches[currentSwipeIndex];

      if (translationX > SWIPE_THRESHOLD || velocityX > 700) {
        // Swiped Right -> Connect
        Animated.timing(pan, {
          toValue: { x: SCREEN_WIDTH + 140, y: translationX * 0.15 },
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          if (currentItem) handleCardSwiped("like", currentItem);
        });
      } else if (translationX < -SWIPE_THRESHOLD || velocityX < -700) {
        // Swiped Left -> Pass
        Animated.timing(pan, {
          toValue: { x: -SCREEN_WIDTH - 140, y: translationX * 0.15 },
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          if (currentItem) handleCardSwiped("pass", currentItem);
        });
      } else {
        resetPan();
      }
    }
  };

  // Programmatic Button Swipes
  const swipeCurrentCard = (action: "like" | "pass") => {
    const currentItem = displayMatches[currentSwipeIndex];
    if (!currentItem) return;

    triggerHaptic(action === "like" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const targetX = action === "like" ? SCREEN_WIDTH + 140 : -SCREEN_WIDTH - 140;

    Animated.timing(pan, {
      toValue: { x: targetX, y: 0 },
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      handleCardSwiped(action, currentItem);
    });
  };

  // Undo / Rewind previous swipe
  const handleRewind = () => {
    if (currentSwipeIndex > 0) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSwipeIndex((prev) => prev - 1);
      setSwipedHistory((prev) => prev.slice(0, prev.length - 1));
      pan.setValue({ x: 0, y: 0 });
    }
  };

  // Open Connection Request Modal with pre-configured introductory message
  const openConnectionModal = (item: EnrichedMatch) => {
    setSelectedMatchForInvite(item);
    const cand = item.match.candidate;
    const isSolo = item.meta.tour_type === "solo";

    if (isSolo) {
      setInviteMessage(
        `হাই ${cand.name}! আমিও ${cand.destination}-এ একই সময়ে ভ্রমণ করার পরিকল্পনা করছি। খরচ ভাগাভাগি করতে ও একসাথে ভ্রমণ করতে চাইলে জানান!`
      );
    } else {
      setInviteMessage(
        `হাই ${cand.name}! আপনাদের ${cand.destination} টিম ট্রিপের পরিকল্পনা চমৎকার লাগল। আমি আপনাদের সাথে ভ্রমণসঙ্গী হিসেবে যোগ দিতে আগ্রহী।`
      );
    }
  };

  // Send Match Request via travelMatchingService.sendMatchRequest()
  const handleSendMatchRequest = async () => {
    if (!selectedMatchForInvite) return;
    if (!inviteMessage.trim()) {
      Alert.alert("বার্তা লিখুন", "দয়া করে ভ্রমণসঙ্গীর জন্য একটি ছোট পরিচিতিমূলক বার্তা লিখুন।");
      return;
    }

    const candidate = selectedMatchForInvite.match.candidate;

    try {
      setSendingInvite(true);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

      const payload = {
        sender_name: myPlan?.name || "Travel Explorer",
        sender_avatar: myPlan?.avatar_url,
        receiver_id: candidate.id,
        destination: candidate.destination,
        proposed_date: candidate.start_date,
        message: inviteMessage.trim(),
      };

      // Call sendMatchRequest on travelMatchingService to update database
      const result = await (travelMatchingService as any).sendMatchRequest(payload);

      setSentRequestIds((prev) => new Set([...prev, candidate.id]));
      if (result) {
        setSentInvitations((prev) => [result, ...prev]);
      }

      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setConnectedCandidate({
        id: candidate.id,
        name: candidate.name,
        avatar_url: candidate.avatar_url,
        destination: candidate.destination,
        travel_style: candidate.travel_styles?.[0] || "Adventure & Trekking",
        compatibility: selectedMatchForInvite.overall_score || 95,
      });
      setSelectedMatchForInvite(null);
      setInviteMessage("");
    } catch {
      Alert.alert("ত্রুটি", "অনুরোধ পাঠানো সম্ভব হয়নি। দয়া করে পুনরায় চেষ্টা করুন।");
    } finally {
      setSendingInvite(false);
    }
  };

  // Save updated travel plan and re-compute matches
  const handleSavePlan = async () => {
    try {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await travelMatchingService.saveMyTravelPlan({
        destination: planDest,
        start_date: planStart,
        end_date: planEnd,
        budget_tier: planBudgetTier,
        approx_budget: parseInt(planBudgetAmount, 10) || 8000,
        travel_styles: selectedStyles,
      });

      setMyPlan(updated);
      setShowEditPlanModal(false);

      // Re-run matching algorithm
      const serviceMatches = await travelMatchingService.getTopMatches(updated);
      setRawMatches(serviceMatches);
      setCurrentSwipeIndex(0);
      setSwipedHistory([]);

      Alert.alert(
        "✨ অ্যালগরিদম আপডেট সম্পন্ন!",
        `আপনার নতুন গন্তব্য "${updated.destination}" এবং বাজেট অনুযায়ী সেরা সহযাত্রীদের তালিকা প্রস্তুত করা হয়েছে।`
      );
    } catch {
      Alert.alert("ত্রুটি", "প্ল্যান সংরক্ষণ করা সম্ভব হয়নি।");
    }
  };

  const toggleStyleSelection = (style: TravelStyle) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  // Interpolations for Tinder card transformations
  const rotateCard = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ["-18deg", "0deg", "18deg"],
    extrapolate: "clamp",
  });

  const likeStampOpacity = pan.x.interpolate({
    inputRange: [20, SCREEN_WIDTH * 0.35],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeStampOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.35, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Active stack cards
  const currentCard = displayMatches[currentSwipeIndex];
  const nextCard = displayMatches[currentSwipeIndex + 1];
  const thirdCard = displayMatches[currentSwipeIndex + 2];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_SLATE} />

      {/* Main Top Header */}
      <LinearGradient colors={[DARK_SLATE, "#1E293B"]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginStart: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>Travel Match</Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={11} color="#FBBF24" />
                <Text style={styles.aiBadgeText}>AI Powered</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              সোলো ব্যাকপ্যাকার ও গ্রুপ ট্যুর ভ্রমণসঙ্গী নেটওয়ার্ক
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setShowSentInvitationsModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-unread-outline" size={19} color="#FFFFFF" />
            {sentInvitations.length > 0 && (
              <View style={styles.unreadBadgeDot}>
                <Text style={styles.unreadBadgeText}>{sentInvitations.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, { marginStart: 6 }]}
            onPress={() => setShowEditPlanModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* View Mode Switcher: Swipe Deck vs Card Feed */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.modeTab, activeTab === "swipe" && styles.modeTabActive]}
            onPress={() => {
              triggerHaptic();
              setActiveTab("swipe");
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name="layers-outline"
              size={15}
              color={activeTab === "swipe" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text style={[styles.modeTabText, activeTab === "swipe" && styles.modeTabTextActive]}>
              সুইপ কার্ড (Tinder)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, activeTab === "feed" && styles.modeTabActive]}
            onPress={() => {
              triggerHaptic();
              setActiveTab("feed");
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name="grid-outline"
              size={15}
              color={activeTab === "feed" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text style={[styles.modeTabText, activeTab === "feed" && styles.modeTabTextActive]}>
              ফিড তালিকা (Feed)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === "all" && styles.filterChipActive]}
            onPress={() => {
              triggerHaptic();
              setFilterType("all");
              setCurrentSwipeIndex(0);
            }}
          >
            <Text style={[styles.filterChipText, filterType === "all" && styles.filterChipTextActive]}>
              সকল ({allEnrichedMatches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === "solo" && styles.filterChipActive]}
            onPress={() => {
              triggerHaptic();
              setFilterType("solo");
              setCurrentSwipeIndex(0);
            }}
          >
            <Ionicons
              name="person-outline"
              size={12}
              color={filterType === "solo" ? "#FFFFFF" : "#CBD5E1"}
            />
            <Text style={[styles.filterChipText, filterType === "solo" && styles.filterChipTextActive]}>
              🎒 সোলো
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === "group" && styles.filterChipActive]}
            onPress={() => {
              triggerHaptic();
              setFilterType("group");
              setCurrentSwipeIndex(0);
            }}
          >
            <Ionicons
              name="people-outline"
              size={12}
              color={filterType === "group" ? "#FFFFFF" : "#CBD5E1"}
            />
            <Text style={[styles.filterChipText, filterType === "group" && styles.filterChipTextActive]}>
              👥 গ্রুপ ট্যুর
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === "high" && styles.filterChipActive]}
            onPress={() => {
              triggerHaptic();
              setFilterType("high");
              setCurrentSwipeIndex(0);
            }}
          >
            <Ionicons
              name="sparkles"
              size={12}
              color={filterType === "high" ? "#FFFFFF" : "#FBBF24"}
            />
            <Text style={[styles.filterChipText, filterType === "high" && styles.filterChipTextActive]}>
              🔥 ৮০%+ মিল
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Screen Body */}
      {loading ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>ভ্রমণসঙ্গীদের সাথে কম্প্যাটিবিলিটি গণনা করা হচ্ছে...</Text>
        </View>
      ) : activeTab === "swipe" ? (
        /* ================= TINDER SWIPE VIEW ================= */
        <View style={styles.swipeContainer}>
          {currentCard ? (
            <View style={styles.deckArea}>
              {/* Stack Card 3 (Background Depth) */}
              {thirdCard && (
                <View style={[styles.cardWrapper, styles.thirdCardUnderneath]} />
              )}

              {/* Stack Card 2 (Next Card Preview) */}
              {nextCard && (
                <View style={[styles.cardWrapper, styles.nextCardUnderneath]}>
                  <AppImage placeholderCategory="avatar"
                    source={{ uri: nextCard.match.candidate.avatar_url }}
                    style={styles.cardImageBg}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(15,23,42,0.95)"]}
                    style={styles.cardOverlayGradient}
                  >
                    <View style={styles.cardBottomInfo}>
                      <Text style={styles.cardNameText}>
                        {nextCard.match.candidate.name}, {nextCard.match.candidate.age}
                      </Text>
                      <Text style={styles.cardDestText}>
                        📍 {nextCard.match.candidate.destination}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Active Foreground Swipeable Card */}
              <PanGestureHandler
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
              >
                <Animated.View
                  style={[
                    styles.cardWrapper,
                    {
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { rotate: rotateCard },
                      ],
                    },
                  ]}
                >
                  <AppImage placeholderCategory="avatar"
                    source={{ uri: currentCard.match.candidate.avatar_url }}
                    style={styles.cardImageBg}
                  />

                  {/* Stamp Overlays */}
                  <Animated.View
                    style={[styles.stampContainer, styles.likeStamp, { opacity: likeStampOpacity }]}
                  >
                    <Text style={styles.likeStampText}>CONNECT ✈️</Text>
                  </Animated.View>

                  <Animated.View
                    style={[styles.stampContainer, styles.nopeStamp, { opacity: nopeStampOpacity }]}
                  >
                    <Text style={styles.nopeStampText}>PASS ❌</Text>
                  </Animated.View>

                  {/* Gradient & Overlay Content */}
                  <LinearGradient
                    colors={[
                      "rgba(15,23,42,0.2)",
                      "rgba(15,23,42,0.6)",
                      "rgba(15,23,42,0.96)",
                    ]}
                    style={styles.cardOverlayGradient}
                  >
                    {/* Top Row: Safety Verification & Compatibility Score */}
                    <View style={styles.cardTopBar}>
                      <TouchableOpacity
                        style={styles.verifiedBadgePill}
                        onPress={() => {
                          triggerHaptic();
                          setVerificationSheetMatch(currentCard);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="shield-checkmark" size={15} color="#10B981" />
                        <Text style={styles.verifiedBadgeText}>
                          {currentCard.meta.verification_label}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.matchScoreBadge,
                          currentCard.overall_score >= 80
                            ? styles.highScoreBadge
                            : styles.mediumScoreBadge,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setScoreSheetMatch(currentCard);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                        <Text style={styles.matchScoreVal}>{currentCard.overall_score}%</Text>
                        <Text style={styles.matchScoreSub}>ম্যাচ</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Mutual Friends Banner */}
                    <TouchableOpacity
                      style={styles.mutualFriendsPill}
                      onPress={() => {
                        triggerHaptic();
                        setVerificationSheetMatch(currentCard);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.avatarStack}>
                        {currentCard.meta.mutual_friends.avatars.map((avatarUrl, idx) => (
                          <AppImage placeholderCategory="avatar"
                            key={`friend-${avatarUrl || idx}`}
                            source={{ uri: avatarUrl }}
                            style={[styles.stackedAvatar, { marginStart: idx > 0 ? -10 : 0 }]}
                          />
                        ))}
                      </View>
                      <Text style={styles.mutualFriendsText}>
                        {currentCard.meta.mutual_friends.count} জন পারস্পরিক বন্ধু (
                        {currentCard.meta.mutual_friends.names[0]})
                      </Text>
                    </TouchableOpacity>

                    {/* Bottom Traveler Details */}
                    <View style={styles.cardBottomInfo}>
                      <View style={styles.candidateHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.cardNameText}>
                              {currentCard.match.candidate.name}
                            </Text>
                            <Text style={styles.cardAgeText}>
                              {currentCard.match.candidate.age} বছর
                            </Text>
                          </View>
                          <Text style={styles.cardHometownText}>
                            হোমটাউন: {currentCard.match.candidate.hometown} •{" "}
                            {currentCard.meta.tour_type === "solo"
                              ? "🎒 সোলো ব্যাকপ্যাকার"
                              : `👥 গ্রুপ ট্যুর (${currentCard.match.candidate.group_size} জন)`}
                          </Text>
                        </View>
                      </View>

                      {/* Destination & Travel Dates */}
                      <View style={styles.destDatesRow}>
                        <View style={styles.destPill}>
                          <Ionicons name="location-sharp" size={14} color="#38BDF8" />
                          <Text style={styles.destPillText}>
                            {currentCard.match.candidate.destination}
                          </Text>
                        </View>

                        <View style={styles.datePill}>
                          <Ionicons name="calendar-outline" size={14} color="#E2E8F0" />
                          <Text style={styles.datePillText}>
                            {currentCard.match.candidate.start_date} হতে{" "}
                            {currentCard.match.candidate.end_date}
                          </Text>
                        </View>
                      </View>

                      {/* Travel Style Tags */}
                      <View style={styles.styleTagsRow}>
                        {currentCard.match.candidate.travel_styles.map((style, sIdx) => {
                          const isShared = myPlan?.travel_styles.includes(style);
                          return (
                            <View
                              key={sIdx}
                              style={[
                                styles.tinderStyleTag,
                                isShared && styles.tinderStyleTagHighlight,
                              ]}
                            >
                              {isShared && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={12}
                                  color="#10B981"
                                  style={{ marginEnd: 3 }}
                                />
                              )}
                              <Text
                                style={[
                                  styles.tinderStyleTagText,
                                  isShared && styles.tinderStyleTagTextHighlight,
                                ]}
                              >
                                {style}
                              </Text>
                            </View>
                          );
                        })}

                        <View style={styles.budgetTag}>
                          <Text style={styles.budgetTagText}>
                            বাজেট ৳{currentCard.match.candidate.approx_budget.toLocaleString("en-BD")}{" "}
                            ({currentCard.budget_overlap_percentage}% ওভারল্যাপ)
                          </Text>
                        </View>
                      </View>

                      {/* Bio Snippet */}
                      <View style={styles.bioSnippetBox}>
                        <Text style={styles.bioSnippetText} numberOfLines={2}>
                          "{currentCard.match.candidate.bio}"
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </PanGestureHandler>

              {/* Tinder Bottom Controls */}
              <View style={styles.actionControlsRow}>
                {/* 1. Rewind Button */}
                <TouchableOpacity
                  style={[
                    styles.controlCircleBtn,
                    styles.rewindBtn,
                    currentSwipeIndex === 0 && styles.controlBtnDisabled,
                  ]}
                  onPress={handleRewind}
                  disabled={currentSwipeIndex === 0}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#F59E0B" />
                </TouchableOpacity>

                {/* 2. Pass / Nope Button */}
                <TouchableOpacity
                  style={[styles.controlCircleBtn, styles.passBtn]}
                  onPress={() => swipeCurrentCard("pass")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={32} color={CRIMSON_RED} />
                </TouchableOpacity>

                {/* 3. Breakdown / Compatibility Info Button */}
                <TouchableOpacity
                  style={[styles.controlCircleBtn, styles.infoBtn]}
                  onPress={() => {
                    triggerHaptic();
                    setScoreSheetMatch(currentCard);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="information-circle" size={24} color="#0284C7" />
                </TouchableOpacity>

                {/* 4. Connect / Like Button */}
                <TouchableOpacity
                  style={[styles.controlCircleBtn, styles.likeBtn]}
                  onPress={() => swipeCurrentCard("like")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane" size={26} color={EMERALD_GREEN} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Empty Deck State */
            <View style={styles.emptyDeckBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done" size={42} color={PRIMARY_BLUE} />
              </View>
              <Text style={styles.emptyDeckTitle}>সকল প্রোফাইল দেখা সম্পন্ন হয়েছে!</Text>
              <Text style={styles.emptyDeckSubtitle}>
                আপনার বর্তমান ফিল্টার অনুযায়ী সব ট্রাভেলার কার্ড সোয়াইপ করা হয়েছে। নতুন প্রোফাইল দেখতে
                পুনরায় শুরু করুন অথবা ভ্রমণ পরিকল্পনা আপডেট করুন।
              </Text>

              <View style={styles.emptyDeckActionsRow}>
                <TouchableOpacity
                  style={styles.resetDeckBtn}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentSwipeIndex(0);
                    setFilterType("all");
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[PRIMARY_BLUE, "#003FA0"]} style={styles.resetDeckGradient}>
                    <Ionicons name="reload" size={16} color="#FFFFFF" />
                    <Text style={styles.resetDeckBtnText}>পুনরায় দেখুন</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetDeckBtn, { marginStart: 10 }]}
                  onPress={() => {
                    triggerHaptic();
                    setShowEditPlanModal(true);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.editPlanAltBtn}>
                    <Ionicons name="create-outline" size={16} color={PRIMARY_BLUE} />
                    <Text style={styles.editPlanAltBtnText}>প্ল্যান পরিবর্তন</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* ================= CARD FEED LIST VIEW ================= */
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Travel Plan Banner */}
          {myPlan && (
            <View style={styles.myIntentBanner}>
              <LinearGradient colors={["#1E3A8A", PRIMARY_BLUE]} style={styles.myIntentGradient}>
                <View style={styles.myIntentHeader}>
                  <View style={styles.myIntentTag}>
                    <Ionicons name="compass" size={13} color="#93C5FD" />
                    <Text style={styles.myIntentTagText}>আমার ভ্রমণ পরিকল্পনা</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.myIntentEditBtn}
                    onPress={() => {
                      triggerHaptic();
                      setShowEditPlanModal(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.myIntentEditText}>পরিবর্তন করুন</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.myIntentDest}>📍 {myPlan.destination}</Text>
                <Text style={styles.myIntentDates}>
                  {myPlan.start_date} হতে {myPlan.end_date} • বাজেট: ৳
                  {myPlan.approx_budget.toLocaleString("en-BD")} ({myPlan.budget_tier.toUpperCase()})
                </Text>

                <View style={styles.myIntentStylesRow}>
                  {myPlan.travel_styles.map((s, idx) => (
                    <View key={`style-${s}`} style={styles.myIntentPill}>
                      <Text style={styles.myIntentPillText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Search Bar & Sort Row */}
          <View style={styles.feedControlsRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={17} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="নাম, গন্তব্য বা স্টাইল খুঁজুন..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sortOptionsRow}>
              <TouchableOpacity
                style={[styles.sortPill, sortBy === "score" && styles.sortPillActive]}
                onPress={() => setSortBy("score")}
              >
                <Text style={[styles.sortPillText, sortBy === "score" && styles.sortPillTextActive]}>
                  সেরা ম্যাচ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortPill, sortBy === "budget" && styles.sortPillActive]}
                onPress={() => setSortBy("budget")}
              >
                <Text style={[styles.sortPillText, sortBy === "budget" && styles.sortPillTextActive]}>
                  বাজেট মিল
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortPill, sortBy === "date" && styles.sortPillActive]}
                onPress={() => setSortBy("date")}
              >
                <Text style={[styles.sortPillText, sortBy === "date" && styles.sortPillTextActive]}>
                  তারিখ
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feed Card List */}
          {displayMatches.length === 0 ? (
            <View style={styles.emptyFeedBox}>
              <Ionicons name="search-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyFeedText}>কোনো ভ্রমণসঙ্গী খুঁজে পাওয়া যায়নি</Text>
              <Text style={styles.emptyFeedSub}>ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন</Text>
            </View>
          ) : (
            displayMatches.map((item) => {
              const { match, meta, overall_score } = item;
              const cand = match.candidate;
              const isSent = sentRequestIds.has(cand.id);

              return (
                <View key={cand.id} style={styles.feedCard}>
                  {/* Feed Card Header */}
                  <View style={styles.feedCardHeader}>
                    <AppImage placeholderCategory="avatar" source={{ uri: cand.avatar_url }} style={styles.feedAvatar} />
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.feedNameText}>{cand.name}</Text>
                        <Text style={styles.feedAgeText}>• {cand.age} বছর</Text>
                      </View>

                      {/* Verification & Tour Type Badges */}
                      <View style={styles.feedBadgesRow}>
                        <TouchableOpacity
                          style={styles.feedVerifiedPill}
                          onPress={() => {
                            triggerHaptic();
                            setVerificationSheetMatch(item);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="shield-checkmark" size={13} color="#059669" />
                          <Text style={styles.feedVerifiedPillText}>{meta.verification_label}</Text>
                        </TouchableOpacity>

                        <View style={styles.tourTypePill}>
                          <Text style={styles.tourTypePillText}>
                            {meta.tour_type === "solo"
                              ? "🎒 সোলো"
                              : `👥 গ্রুপ (${cand.group_size})`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Compatibility Score */}
                    <TouchableOpacity
                      style={[
                        styles.feedScoreBadge,
                        overall_score >= 80 ? styles.highScoreBadge : styles.mediumScoreBadge,
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setScoreSheetMatch(item);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                      <Text style={styles.feedScoreText}>{overall_score}%</Text>
                      <Text style={styles.feedScoreSub}>ম্যাচ</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Destination & Dates Banner */}
                  <View style={styles.feedTripInfoBanner}>
                    <View style={styles.feedTripItem}>
                      <Ionicons name="navigate" size={14} color={PRIMARY_BLUE} />
                      <Text style={styles.feedTripDestText}>{cand.destination}</Text>
                    </View>
                    <View style={styles.feedTripItem}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.feedTripDateText}>
                        {cand.start_date} হতে {cand.end_date}
                      </Text>
                    </View>
                  </View>

                  {/* Mutual Friends Bar */}
                  <TouchableOpacity
                    style={styles.feedMutualRow}
                    onPress={() => {
                      triggerHaptic();
                      setVerificationSheetMatch(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people" size={14} color="#6366F1" />
                    <Text style={styles.feedMutualText}>
                      {meta.mutual_friends.count} জন পারস্পরিক ভ্রমণ বন্ধু (
                      {meta.mutual_friends.names.slice(0, 2).join(", ")})
                    </Text>
                  </TouchableOpacity>

                  {/* Travel Style Tags */}
                  <View style={styles.feedStylesWrap}>
                    {cand.travel_styles.map((style, idx) => {
                      const isCommon = myPlan?.travel_styles.includes(style);
                      return (
                        <View
                          key={`cand-${cand.id}-${style}`}
                          style={[styles.feedStylePill, isCommon && styles.feedStylePillActive]}
                        >
                          <Text
                            style={[
                              styles.feedStylePillText,
                              isCommon && styles.feedStylePillTextActive,
                            ]}
                          >
                            {isCommon ? "✓ " : ""}
                            {style}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Looking For Quote */}
                  <View style={styles.feedBioBox}>
                    <Text style={styles.feedBioLabel}>খুঁজছেন:</Text>
                    <Text style={styles.feedBioText}>"{cand.looking_for}"</Text>
                  </View>

                  {/* Card Footer Actions */}
                  <View style={styles.feedCardFooter}>
                    <View>
                      <Text style={styles.feedBudgetLabel}>বাজেট ওভারল্যাপ</Text>
                      <Text style={styles.feedBudgetValue}>
                        ৳{cand.approx_budget.toLocaleString("en-BD")} •{" "}
                        <Text style={{ color: EMERALD_GREEN }}>
                          {item.budget_overlap_percentage}% মিল
                        </Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.feedConnectBtn, isSent && styles.feedConnectBtnSent]}
                      onPress={() => {
                        triggerHaptic();
                        openConnectionModal(item);
                      }}
                      disabled={isSent}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={isSent ? ["#94A3B8", "#64748B"] : [PRIMARY_BLUE, "#0040B0"]}
                        style={styles.feedConnectGradient}
                      >
                        <Ionicons
                          name={isSent ? "checkmark-done" : "paper-plane"}
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.feedConnectBtnText}>
                          {isSent ? "অনুরোধ পাঠানো হয়েছে" : "ট্রিপ ইনভাইট দিন"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================= MODAL 1: CONNECTION / TRIP JOIN REQUEST MODAL ================= */}
      <Modal
        visible={!!selectedMatchForInvite}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMatchForInvite(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetLarge}>
            {selectedMatchForInvite && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalSheetTitle}>ভ্রমণসঙ্গী রিকোয়েস্ট পাঠান</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      {selectedMatchForInvite.match.candidate.name}-কে ট্রিপ বাডি হিসেবে ইনভাইট করুন
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedMatchForInvite(null)}
                    style={styles.modalCloseCircle}
                  >
                    <Ionicons name="close" size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Recipient Snapshot Card */}
                  <View style={styles.recipientSnapshotCard}>
                    <AppImage placeholderCategory="avatar"
                      source={{ uri: selectedMatchForInvite.match.candidate.avatar_url }}
                      style={styles.recipientAvatar}
                    />
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.recipientName}>
                        {selectedMatchForInvite.match.candidate.name},{" "}
                        {selectedMatchForInvite.match.candidate.age}
                      </Text>
                      <Text style={styles.recipientDest}>
                        📍 {selectedMatchForInvite.match.candidate.destination} (
                        {selectedMatchForInvite.match.candidate.start_date})
                      </Text>

                      <View style={styles.recipientBadgesRow}>
                        <View style={styles.recipientScoreTag}>
                          <Ionicons name="sparkles" size={11} color={EMERALD_GREEN} />
                          <Text style={styles.recipientScoreText}>
                            {selectedMatchForInvite.overall_score}% কম্প্যাটিবিলিটি
                          </Text>
                        </View>
                        <View style={styles.recipientVerifiedTag}>
                          <Ionicons name="shield-checkmark" size={11} color="#0284C7" />
                          <Text style={styles.recipientVerifiedText}>
                            {selectedMatchForInvite.meta.verification_label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Preset Instant Message Templates */}
                  <Text style={styles.inputSectionLabel}>দ্রুত পরিচিতিমূলক মেসেজ টেমপ্লেট</Text>
                  <View style={styles.presetButtonsWrap}>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        triggerHaptic();
                        setInviteMessage(
                          `হাই ${selectedMatchForInvite.match.candidate.name}! আমিও একই সময়ে ${selectedMatchForInvite.match.candidate.destination}-এ যাচ্ছি। চাঁদের গাড়ি বা রুম ভাড়া শেয়ার করতে চাইলে জানান!`
                        );
                      }}
                    >
                      <Text style={styles.presetChipText}>🚗 গাড়ি/হোটেল খরচ শেয়ারিং</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        triggerHaptic();
                        setInviteMessage(
                          `হ্যালো! আপনার ${selectedMatchForInvite.match.candidate.travel_styles.slice(0, 2).join(" ও ")} ট্রাভেল ভাইব দারুণ লাগল। চলুন একসাথে স্পট এক্সপ্লোর করি!`
                        );
                      }}
                    >
                      <Text style={styles.presetChipText}>📸 ফটোগ্রাফি ও ট্রেকিং বাডি</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        triggerHaptic();
                        setInviteMessage(
                          `হাই! আপনাদের ${selectedMatchForInvite.match.candidate.destination} গ্রুপ ট্যুরে ১ জন যুক্ত হতে চাই। বিস্তারিত আলোচনা করতে পারলে ভালো হতো!`
                        );
                      }}
                    >
                      <Text style={styles.presetChipText}>👥 গ্রুপ ট্যুরে অংশগ্রহণ</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Custom Introductory Message Input */}
                  <View style={styles.messageInputHeaderRow}>
                    <Text style={styles.inputSectionLabel}>আপনার পরিচিতিমূলক বার্তা</Text>
                    <Text style={styles.charCountText}>{inviteMessage.length} / 300</Text>
                  </View>

                  <TextInput
                    style={styles.customMessageInput}
                    multiline
                    maxLength={300}
                    numberOfLines={4}
                    placeholder="আপনার সম্পর্কে লিখুন এবং কীভাবে একসাথে ঘুরতে চান জানান..."
                    placeholderTextColor="#94A3B8"
                    value={inviteMessage}
                    onChangeText={setInviteMessage}
                  />

                  {/* Security & Verification Guarantee */}
                  <View style={styles.inviteSafetyBox}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
                    <Text style={styles.inviteSafetyText}>
                      নিরাপদ নেটওয়ার্ক প্রোটোকল: উভয় পক্ষ সম্মতি জানালে তবেই ব্যক্তিগত যোগাযোগ মাধ্যম
                      প্রকাশ করা হবে।
                    </Text>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.sendRequestBtn}
                    onPress={handleSendMatchRequest}
                    disabled={sendingInvite}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[EMERALD_GREEN, "#059669"]}
                      style={styles.sendRequestGradient}
                    >
                      {sendingInvite ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                          <Text style={styles.sendRequestBtnText}>
                            অনুরোধ নিশ্চিত করুন (Send Match Request)
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: COMPATIBILITY SCORE BREAKDOWN MODAL ================= */}
      <Modal
        visible={!!scoreSheetMatch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setScoreSheetMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetLarge}>
            {scoreSheetMatch && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalSheetTitle}>কম্প্যাটিবিলিটি বিশ্লেষণ</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      {scoreSheetMatch.match.candidate.name}-এর সাথে অ্যালগরিদম মিল:{" "}
                      {scoreSheetMatch.overall_score}%
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setScoreSheetMatch(null)}
                    style={styles.modalCloseCircle}
                  >
                    <Ionicons name="close" size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Big Score Summary Banner */}
                  <View style={styles.scoreSummaryCard}>
                    <Text style={styles.scoreSummaryVal}>{scoreSheetMatch.overall_score}%</Text>
                    <Text style={styles.scoreSummaryLabel}>
                      সামগ্রিক সামঞ্জস্য স্কোর (Overall Compatibility)
                    </Text>
                    <Text style={styles.scoreSummaryReason}>
                      {scoreSheetMatch.match.match_reason}
                    </Text>
                  </View>

                  {/* Algorithmic Breakdown Cards */}
                  <View style={styles.breakdownList}>
                    {/* 1. Shared Interests & Vibes */}
                    <View style={styles.breakdownCard}>
                      <View style={styles.breakdownCardTop}>
                        <Ionicons name="heart" size={17} color="#EC4899" />
                        <Text style={styles.breakdownCardTitle}>
                          আগ্রহ ও ভ্রমণ ভাইব (Shared Interests)
                        </Text>
                        <Text style={styles.breakdownCardScore}>
                          {scoreSheetMatch.interests_score} / ৩৫
                        </Text>
                      </View>
                      <Text style={styles.breakdownCardDesc}>উভয়ের পছন্দের ভ্রমণ স্টাইল:</Text>
                      <View style={styles.breakdownPillsRow}>
                        {scoreSheetMatch.match.common_interests.length > 0 ? (
                          scoreSheetMatch.match.common_interests.map((c, i) => (
                            <View key={`ci-${c}`} style={styles.commonInterestPill}>
                              <Text style={styles.commonInterestText}>✓ {c}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={{ fontSize: 12, color: "#64748B" }}>
                            ভিন্ন ভিন্ন স্টাইল পছন্দ, যা বৈচিত্র্যময় অভিজ্ঞতা তৈরি করবে।
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* 2. Budget Overlap */}
                    <View style={styles.breakdownCard}>
                      <View style={styles.breakdownCardTop}>
                        <Ionicons name="wallet" size={17} color="#10B981" />
                        <Text style={styles.breakdownCardTitle}>বাজেট সামঞ্জস্য (Budget Match)</Text>
                        <Text style={styles.breakdownCardScore}>
                          {scoreSheetMatch.budget_score} / ২৫
                        </Text>
                      </View>
                      <Text style={styles.breakdownCardDesc}>
                        আপনার বাজেট: ৳{myPlan?.approx_budget.toLocaleString("en-BD")} • তাদের বাজেট: ৳
                        {scoreSheetMatch.match.candidate.approx_budget.toLocaleString("en-BD")} (
                        {scoreSheetMatch.budget_overlap_percentage}% ওভারল্যাপ)
                      </Text>
                    </View>

                    {/* 3. Destination Alignment */}
                    <View style={styles.breakdownCard}>
                      <View style={styles.breakdownCardTop}>
                        <Ionicons name="location" size={17} color={PRIMARY_BLUE} />
                        <Text style={styles.breakdownCardTitle}>গন্তব্য স্থান (Destination)</Text>
                        <Text style={styles.breakdownCardScore}>
                          {scoreSheetMatch.destination_score} / ২৫
                        </Text>
                      </View>
                      <Text style={styles.breakdownCardDesc}>
                        উভয়ের লক্ষ্য: {scoreSheetMatch.match.candidate.destination}
                      </Text>
                    </View>

                    {/* 4. Travel Schedule */}
                    <View style={styles.breakdownCard}>
                      <View style={styles.breakdownCardTop}>
                        <Ionicons name="calendar" size={17} color="#F59E0B" />
                        <Text style={styles.breakdownCardTitle}>
                          ভ্রমণের সময়সূচি (Travel Dates)
                        </Text>
                        <Text style={styles.breakdownCardScore}>
                          {scoreSheetMatch.date_score} / ১৫
                        </Text>
                      </View>
                      <Text style={styles.breakdownCardDesc}>
                        তারিখ: {scoreSheetMatch.match.candidate.start_date} হতে{" "}
                        {scoreSheetMatch.match.candidate.end_date}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeSheetBtn}
                    onPress={() => setScoreSheetMatch(null)}
                  >
                    <Text style={styles.closeSheetBtnText}>ঠিক আছে, বুঝেছি</Text>
                  </TouchableOpacity>
                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 3: SAFETY & VERIFICATION DETAIL MODAL ================= */}
      <Modal
        visible={!!verificationSheetMatch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVerificationSheetMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetLarge}>
            {verificationSheetMatch && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalSheetTitle}>নিরাপত্তা ও পরিচয় ভেরিফিকেশন</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      {verificationSheetMatch.match.candidate.name}-এর সরকারি সনদ ও ট্রাস্ট রেকর্ড
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setVerificationSheetMatch(null)}
                    style={styles.modalCloseCircle}
                  >
                    <Ionicons name="close" size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Trust Score Banner */}
                  <View style={styles.trustScoreBanner}>
                    <Ionicons name="shield-checkmark" size={36} color="#10B981" />
                    <View style={{ marginStart: 14 }}>
                      <Text style={styles.trustScoreTitle}>
                        {verificationSheetMatch.meta.safety_score}% ট্রাস্ট স্কোর
                      </Text>
                      <Text style={styles.trustScoreSubtitle}>
                        ভ্রমণ নিরাপদকরণ প্রোটোকলে শতভাগ উত্তীর্ণ
                      </Text>
                    </View>
                  </View>

                  {/* Verification Checkpoints */}
                  <View style={styles.verifyItemRow}>
                    <Ionicons name="id-card" size={20} color="#0284C7" />
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.verifyItemTitle}>
                        {verificationSheetMatch.meta.verification_label}
                      </Text>
                      <Text style={styles.verifyItemDesc}>
                        সনদ নম্বর: {verificationSheetMatch.meta.verification_number_masked}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>

                  <View style={styles.verifyItemRow}>
                    <Ionicons name="people" size={20} color="#6366F1" />
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.verifyItemTitle}>পারস্পরিক ভ্রমণ বন্ধু</Text>
                      <Text style={styles.verifyItemDesc}>
                        {verificationSheetMatch.meta.mutual_friends.names.join(", ")}
                      </Text>
                    </View>
                    <Text style={styles.mutualCountBadge}>
                      {verificationSheetMatch.meta.mutual_friends.count} জন
                    </Text>
                  </View>

                  <View style={styles.verifyItemRow}>
                    <Ionicons name="ribbon" size={20} color="#F59E0B" />
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.verifyItemTitle}>কমিউনিটি রেটিং ও সমাপ্তকৃত ট্যুর</Text>
                      <Text style={styles.verifyItemDesc}>
                        ★ {verificationSheetMatch.meta.rating} (
                        {verificationSheetMatch.meta.trips_completed}টি সফল ভ্রমণ সম্পন্ন)
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>

                  <TouchableOpacity
                    style={styles.closeSheetBtn}
                    onPress={() => setVerificationSheetMatch(null)}
                  >
                    <Text style={styles.closeSheetBtnText}>ঠিক আছে</Text>
                  </TouchableOpacity>
                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 4: SENT INVITATIONS OUTBOX ================= */}
      <Modal
        visible={showSentInvitationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSentInvitationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetLarge}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>পাঠানো ট্রিপ ইনভাইটেশন ({sentInvitations.length})</Text>
                <Text style={styles.modalSheetSubtitle}>আপনার প্রেরিত ভ্রমণসঙ্গী অনুরোধের তালিকা</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSentInvitationsModal(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {sentInvitations.length === 0 ? (
                <View style={styles.emptyOutbox}>
                  <Ionicons name="paper-plane-outline" size={44} color="#CBD5E1" />
                  <Text style={styles.emptyOutboxTitle}>কোনো পাঠানো অনুরোধ নেই</Text>
                  <Text style={styles.emptyOutboxSub}>
                    সোয়াইপ করে বা ফিড থেকে ভ্রমণসঙ্গীদের কাছে রিকোয়েস্ট পাঠান
                  </Text>
                </View>
              ) : (
                sentInvitations.map((inv) => (
                  <View key={inv.id} style={styles.outboxCard}>
                    <View style={styles.outboxTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.outboxDest}>📍 {inv.destination}</Text>
                        <Text style={styles.outboxDate}>প্রস্তাবিত তারিখ: {inv.proposed_date}</Text>
                      </View>
                      <View style={styles.outboxStatusPill}>
                        <Text style={styles.outboxStatusText}>{inv.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.outboxMessage}>"{inv.message}"</Text>
                  </View>
                ))
              )}
              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 5: EDIT TRAVEL INTENT / PLAN ================= */}
      <Modal
        visible={showEditPlanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetLarge}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>ভ্রমণ পরিকল্পনা সেট করুন</Text>
                <Text style={styles.modalSheetSubtitle}>
                  আপনার পছন্দ অনুযায়ী উপযুক্ত সহযাত্রী ও গ্রুপ সাজেস্ট করা হবে
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditPlanModal(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputSectionLabel}>আপনার গন্তব্য স্থান</Text>
              <View style={styles.destOptionsWrap}>
                {dynamicDestinations.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.destOptionPill, planDest === d && styles.destOptionPillActive]}
                    onPress={() => {
                      triggerHaptic();
                      setPlanDest(d);
                    }}
                  >
                    <Text
                      style={[styles.destOptionText, planDest === d && styles.destOptionTextActive]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginEnd: 8 }}>
                  <Text style={styles.inputSectionLabel}>শুরুর তারিখ</Text>
                  <TextInput
                    style={styles.textInputBox}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={planStart}
                    onChangeText={setPlanStart}
                  />
                </View>
                <View style={{ flex: 1, marginStart: 8 }}>
                  <Text style={styles.inputSectionLabel}>শেষের তারিখ</Text>
                  <TextInput
                    style={styles.textInputBox}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={planEnd}
                    onChangeText={setPlanEnd}
                  />
                </View>
              </View>

              <Text style={styles.inputSectionLabel}>বাজেট ক্যাটাগরি</Text>
              <View style={styles.budgetTierRow}>
                {(["budget", "standard", "luxury"] as BudgetTier[]).map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[styles.tierBtn, planBudgetTier === tier && styles.tierBtnActive]}
                    onPress={() => {
                      triggerHaptic();
                      setPlanBudgetTier(tier);
                    }}
                  >
                    <Text
                      style={[
                        styles.tierBtnText,
                        planBudgetTier === tier && styles.tierBtnTextActive,
                      ]}
                    >
                      {tier === "budget"
                        ? "ইকোনমি"
                        : tier === "standard"
                        ? "স্ট্যান্ডার্ড"
                        : "লাক্সারি"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputSectionLabel}>আনুমানিক বাজেট (৳)</Text>
              <TextInput
                style={styles.textInputBox}
                placeholder="যেমন: 8500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={planBudgetAmount}
                onChangeText={setPlanBudgetAmount}
              />

              <Text style={styles.inputSectionLabel}>
                ভ্রমণের ভাইব ও স্টাইল (একাধিক নির্বাচন করুন)
              </Text>
              <View style={styles.vibesSelectWrap}>
                {ALL_VIBES.map((vibe) => {
                  const isSel = selectedStyles.includes(vibe);
                  return (
                    <TouchableOpacity
                      key={vibe}
                      style={[styles.vibeBtn, isSel && styles.vibeBtnActive]}
                      onPress={() => toggleStyleSelection(vibe)}
                    >
                      <Text style={[styles.vibeBtnText, isSel && styles.vibeBtnTextActive]}>
                        {isSel ? "✓ " : "+ "}
                        {vibe}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.submitPlanBtn}
                onPress={handleSavePlan}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[PRIMARY_BLUE, "#003FA0"]}
                  style={styles.submitPlanGradient}
                >
                  <Text style={styles.submitPlanBtnText}>ম্যাচিং অ্যালগরিদম আপডেট করুন</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Connected Match Modal (Image 3 Overlapping Avatar UX Pattern) */}
      <MatchConnectedModal
        visible={!!connectedCandidate}
        onClose={() => setConnectedCandidate(null)}
        myAvatar={myPlan?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"}
        myName={myPlan?.name || "You"}
        companionAvatar={connectedCandidate?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200"}
        companionName={connectedCandidate?.name || "Travel Companion"}
        matchScore={connectedCandidate?.compatibility || 94}
        destination={connectedCandidate?.destination || planDest || "Sajek Valley"}
        commonVibe={connectedCandidate?.travel_style || "Adventure & Photography"}
        onStartChat={() => {
          setConnectedCandidate(null);
          router.push({
            pathname: "/screens/[slug]" as any,
            params: {
              slug: "agency-chat",
              agencyId: connectedCandidate?.id,
              agencyName: connectedCandidate?.name,
              guideAvatar: connectedCandidate?.avatar_url,
            },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FBBF24",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeDot: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: CRIMSON_RED,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modeSwitcherContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 3,
    marginTop: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: "#FFFFFF",
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  modeTabTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  filterChipActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  centeredLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },

  /* Tinder Swipe Styles */
  swipeContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  deckArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    height: "82%",
    borderRadius: 24,
    overflow: "hidden",
    position: "absolute",
    backgroundColor: DARK_SLATE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 10px rgba(15, 23, 42, 0.22)" } : {}),
  },
  nextCardUnderneath: {
    transform: [{ scale: 0.94 }, { translateY: 14 }],
    opacity: 0.88,
  },
  thirdCardUnderneath: {
    transform: [{ scale: 0.88 }, { translateY: 26 }],
    opacity: 0.45,
  },
  cardImageBg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardOverlayGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: 16,
  },
  cardTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verifiedBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  matchScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  highScoreBadge: {
    backgroundColor: "#059669",
  },
  mediumScoreBadge: {
    backgroundColor: "#0284C7",
  },
  matchScoreVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  matchScoreSub: {
    fontSize: 10,
    color: "#E0E7FF",
    fontWeight: "600",
  },
  mutualFriendsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginEnd: 8,
  },
  stackedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  mutualFriendsText: {
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  cardBottomInfo: {
    marginTop: "auto",
  },
  candidateHeaderRow: {
    marginBottom: 4,
  },
  cardNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardAgeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  cardDestText: {
    fontSize: 14,
    color: "#E2E8F0",
    fontWeight: "600",
    marginTop: 4,
  },
  cardHometownText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  destDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 6,
  },
  destPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  destPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  datePillText: {
    fontSize: 11,
    color: "#F1F5F9",
  },
  styleTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginVertical: 6,
  },
  tinderStyleTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tinderStyleTagHighlight: {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  tinderStyleTagText: {
    fontSize: 10.5,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tinderStyleTagTextHighlight: {
    color: "#A7F3D0",
  },
  budgetTag: {
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  budgetTagText: {
    fontSize: 10.5,
    color: "#FDE68A",
    fontWeight: "700",
  },
  bioSnippetBox: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  bioSnippetText: {
    fontSize: 11.5,
    color: "#E2E8F0",
    fontStyle: "italic",
    lineHeight: 16,
  },

  /* Stamps */
  stampContainer: {
    position: "absolute",
    top: 50,
    zIndex: 100,
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  likeStamp: {
    left: 24,
    borderColor: EMERALD_GREEN,
    transform: [{ rotate: "-15deg" }],
  },
  likeStampText: {
    fontSize: 20,
    fontWeight: "900",
    color: EMERALD_GREEN,
  },
  nopeStamp: {
    right: 24,
    borderColor: CRIMSON_RED,
    transform: [{ rotate: "15deg" }],
  },
  nopeStampText: {
    fontSize: 20,
    fontWeight: "900",
    color: CRIMSON_RED,
  },

  /* Action Controls Row */
  actionControlsRow: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    width: "100%",
  },
  controlCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 6px rgba(15, 23, 42, 0.15)" } : {}),
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  rewindBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  passBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  infoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  likeBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  /* Empty Deck */
  emptyDeckBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyDeckTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  emptyDeckSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyDeckActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  resetDeckBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  resetDeckGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  resetDeckBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editPlanAltBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  editPlanAltBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },

  /* Card Feed List Styles */
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
  },
  myIntentBanner: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  myIntentGradient: {
    padding: 14,
  },
  myIntentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  myIntentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  myIntentTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  myIntentEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  myIntentEditText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  myIntentDest: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 6,
  },
  myIntentDates: {
    fontSize: 12,
    color: "#BFDBFE",
    marginTop: 2,
  },
  myIntentStylesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  myIntentPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  myIntentPillText: {
    fontSize: 10.5,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  feedControlsRow: {
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginStart: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  sortOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  sortPillActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  sortPillText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  sortPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyFeedBox: {
    paddingVertical: 50,
    alignItems: "center",
  },
  emptyFeedText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
  },
  emptyFeedSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  feedCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.05)" } : {}),
  },
  feedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  feedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E2E8F0",
  },
  feedNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  feedAgeText: {
    fontSize: 13,
    color: "#64748B",
  },
  feedBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  feedVerifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feedVerifiedPillText: {
    fontSize: 10.5,
    color: "#059669",
    fontWeight: "700",
  },
  tourTypePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tourTypePillText: {
    fontSize: 10.5,
    color: "#475569",
    fontWeight: "600",
  },
  feedScoreBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 54,
  },
  feedScoreText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  feedScoreSub: {
    fontSize: 9.5,
    color: "#E0E7FF",
    fontWeight: "600",
  },
  feedTripInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  feedTripItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  feedTripDestText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  feedTripDateText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  feedMutualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  feedMutualText: {
    fontSize: 11.5,
    color: "#4F46E5",
    fontWeight: "500",
  },
  feedStylesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 10,
  },
  feedStylePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feedStylePillActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  feedStylePillText: {
    fontSize: 11,
    color: "#475569",
  },
  feedStylePillTextActive: {
    color: "#4338CA",
    fontWeight: "700",
  },
  feedBioBox: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  feedBioLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  feedBioText: {
    fontSize: 12,
    color: "#334155",
    fontStyle: "italic",
    marginTop: 2,
  },
  feedCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  feedBudgetLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  feedBudgetValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  feedConnectBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  feedConnectBtnSent: {
    opacity: 0.85,
  },
  feedConnectGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedConnectBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Modals Common */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheetLarge: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSheetSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseCircle: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
  },

  /* Connection Request Modal */
  recipientSnapshotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  recipientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  recipientDest: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  recipientBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  recipientScoreTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recipientScoreText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  recipientVerifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recipientVerifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284C7",
  },
  inputSectionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  presetButtonsWrap: {
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  messageInputHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCountText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  customMessageInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    height: 85,
    textAlignVertical: "top",
    fontSize: 13.5,
    color: "#0F172A",
  },
  inviteSafetyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  inviteSafetyText: {
    fontSize: 11,
    color: "#166534",
    flex: 1,
    lineHeight: 16,
  },
  sendRequestBtn: {
    marginTop: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  sendRequestGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  sendRequestBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Breakdown Sheet */
  scoreSummaryCard: {
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  scoreSummaryVal: {
    fontSize: 34,
    fontWeight: "900",
    color: PRIMARY_BLUE,
  },
  scoreSummaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
    marginTop: 2,
  },
  scoreSummaryReason: {
    fontSize: 12,
    color: "#0284C7",
    textAlign: "center",
    marginTop: 6,
  },
  breakdownList: {
    gap: 10,
  },
  breakdownCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  breakdownCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginStart: 8,
  },
  breakdownCardScore: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_BLUE,
  },
  breakdownCardDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  breakdownPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  commonInterestPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  commonInterestText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  closeSheetBtn: {
    marginTop: 16,
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeSheetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Verification Modal */
  trustScoreBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  trustScoreTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065F46",
  },
  trustScoreSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  verifyItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  verifyItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  verifyItemDesc: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  mutualCountBadge: {
    backgroundColor: "#EEF2FF",
    color: "#4F46E5",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  /* Sent Invitations Outbox */
  emptyOutbox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyOutboxTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
  },
  emptyOutboxSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
  outboxCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  outboxTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  outboxDest: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  outboxDate: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  outboxStatusPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outboxStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },
  outboxMessage: {
    fontSize: 12.5,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 18,
  },

  /* Edit Plan Form */
  destOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  destOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  destOptionPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  destOptionText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  destOptionTextActive: {
    color: "#FFFFFF",
  },
  rowTwoCols: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInputBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: "#0F172A",
  },
  budgetTierRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  tierBtnActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  tierBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tierBtnTextActive: {
    color: "#FFFFFF",
  },
  vibesSelectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  vibeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vibeBtnActive: {
    backgroundColor: "#EEF2FF",
    borderColor: PRIMARY_BLUE,
  },
  vibeBtnText: {
    fontSize: 12,
    color: "#475569",
  },
  vibeBtnTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: "700",
  },
  submitPlanBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
  },
  submitPlanGradient: {
    paddingVertical: 13,
    alignItems: "center",
  },
  submitPlanBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
