import React, { useState, useEffect, useRef, useCallback } from "react";
import { Platform,
  ActivityIndicator,
  FlatList,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatPrice } from "../../src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../../src/hooks/useAuth";
import { AddWidgetModal } from "../../src/components/AddWidgetModal";
import { supabase } from "../../src/utils/supabase";
import { TripPlannerScreen } from "../../src/screens/TripPlannerScreen";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { ticketService, ETicket } from "../../src/services/payment/ticketService";
import { ROUTES } from "../../src/constants/routes";
import { BookingManageModal, BookingManageData } from "../../src/components/booking/BookingManageModal";
import { calendarService } from "../../src/services/calendarService";
import { BoardingPassModal, BoardingPassData, LiveTripCompanion } from "../../src/components/trips";
import { useScreenCollaboration } from "../../src/hooks/useScreenCollaboration";
import { APP_EVENTS } from "../../src/services/events/appEventBus";
import { useTranslation } from "react-i18next";
import { toast } from "../../src/components/ui/Toast";
import { useBookingRealtimeSync } from "../../src/services/bookingRealtimeService";

const TRIP_BLUE = "#E5A93C";
const TRIP_PINK = "#FFF0F3";
const ACCENT_YELLOW = "#FACC15";

export default function TripsTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const params = useLocalSearchParams();
  const [activeSegment, setActiveSegment] = useState<"bookings" | "tickets" | "planner">(
    params?.tab === "planner" ? "planner" : (params?.filter === "tickets" || params?.tab === "tickets") ? "tickets" : "bookings"
  );
  const [offlineTickets, setOfflineTickets] = useState<ETicket[]>([]);
  const [exportingTicketId, setExportingTicketId] = useState<string | null>(null);
  const [selectedPass, setSelectedPass] = useState<BoardingPassData | null>(null);
  const [showPassModal, setShowPassModal] = useState<boolean>(false);

  const openTicketAsBoardingPass = (ticket: ETicket) => {
    const isFlight = ticket.type === "flight";
    const isTrain = ticket.type === "train";

    const passData: BoardingPassData = {
      id: ticket.id,
      bookingReference: ticket.bookingReference,
      passengerName: ticket.passengerName || user?.email?.split("@")[0] || "Valued Traveler",
      transportType: ticket.type as any,
      operatorOrAirline: ticket.title || (isFlight ? "বিমান বাংলাদেশ এয়ারলাইন্স" : isTrain ? "বাংলাদেশ রেলওয়ে" : "গ্রীন লাইন পরিবহন"),
      serviceNumber: ticket.title.match(/[A-Z0-9]+-\d+/)?.[0] || (isFlight ? "BG-433" : isTrain ? "701" : "GL-102"),
      origin: ticket.origin || "ঢাকা (DAC)",
      originCode: ticket.origin?.slice(0, 3).toUpperCase() || "DAC",
      originTerminal: isFlight ? "Terminal 1" : "কমলাপুর রেল স্টেশন",
      destination: ticket.destination || "কক্সবাজার",
      destinationCode: ticket.destination?.slice(0, 3).toUpperCase() || "CXB",
      departureDate: ticket.travelDate || new Date().toISOString().split("T")[0],
      departureTime: ticket.departureTime || "11:45 AM",
      arrivalTime: "12:50 PM",
      boardingTime: "11:00 AM",
      gate: isFlight ? "Gate 04" : undefined,
      terminal: isFlight ? "T1" : undefined,
      platform: isTrain ? "প্ল্যাটফর্ম ৩" : undefined,
      seatNumbers: ticket.seatOrRoom || "12A, 12B",
      cabinClass: isFlight ? "ইকোনমি ক্লাস" : isTrain ? "শোভন চেয়ার" : "এসি বিজনেস",
      boardingGroup: "গ্রুপ ২ (Zone 2)",
      status: "boarding",
      qrPayload: ticket.qrData,
      fareAmount: ticket.amount,
      currency: ticket.currency || "BDT",
    };

    setSelectedPass(passData);
    setShowPassModal(true);
  };

  useEffect(() => {
    if (params?.filter === "tickets" || params?.tab === "tickets") {
      setActiveSegment("tickets");
    }
  }, [params?.filter, params?.tab]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  // Pull-to-refresh state

  // Live Supabase Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [manageBooking, setManageBooking] = useState<BookingManageData | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [favoritePosts, setFavoritePosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTripsData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch user bookings (or public demo bookings)
      let bookingQuery = supabase
        .from("bookings")
        .select("*, hotel:hotels(*), flight:flights(*)")
        .order("created_at", { ascending: false });

      if (user?.id) {
        bookingQuery = bookingQuery.eq("user_id", user.id);
      } else {
        bookingQuery = bookingQuery.limit(5);
      }

      const { data: bookingData } = await bookingQuery;
      if (bookingData) {
        setBookings(bookingData);
      }

      // Load cached offline tickets
      try {
        const cached = await ticketService.getCachedTickets(user?.id || "guest");
        // Convert any confirmed bookings that are missing in cache
        const confirmedBookingsAsTickets: ETicket[] = (bookingData || [])
          .filter((b: any) => b.status === "confirmed" || b.status === "completed")
          .map((b: any) => {
            const bRef = b.booking_reference || `SJ-${b.id?.slice(0, 8).toUpperCase()}`;
            return {
              id: b.id,
              bookingReference: bRef,
              passengerName: user?.email?.split("@")[0] || "Traveler",
              title: b.hotel?.name || (b.flight ? `Flight ${b.flight.flight_number}` : b.title || "Travel Voucher"),
              type: b.hotel ? "hotel" : (b.flight ? "flight" : "package"),
              destination: b.hotel?.city || b.destination || "Bangladesh",
              origin: b.flight?.origin_city || "Dhaka",
              travelDate: b.check_in_date || b.travel_date || new Date().toISOString().split("T")[0],
              amount: b.total_price || b.amount || 0,
              currency: "BDT",
              status: "confirmed" as const,
              qrData: `SHOPNO-TICKET|PNR:${bRef}|ID:${b.id}|STATUS:CONFIRMED`,
              cachedAt: new Date().toISOString(),
            };
          });

        const combinedMap = new Map<string, ETicket>();
        [...cached, ...confirmedBookingsAsTickets].forEach((t) => {
          combinedMap.set(t.bookingReference, t);
        });
        setOfflineTickets(Array.from(combinedMap.values()));
      } catch (cacheErr) {
        console.warn("Tickets cache load warning:", cacheErr);
      }

      // 2. Fetch top community travelers' favorites from Supabase
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, author:community_profiles!posts_user_id_fkey(*), media:post_media(*)")
        .eq("status", "published")
        .order("likes_count", { ascending: false })
        .limit(6);

      if (postsData) {
        setFavoritePosts(postsData);
      }
    } catch (err) {
      console.warn("Trips fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTripsData();
    setRefreshing(false);
  }, [fetchTripsData]);

  useEffect(() => {
    fetchTripsData();
  }, [fetchTripsData]);

  // Supabase Realtime Synchronization: Sync booking status across all apps
  useBookingRealtimeSync({
    userId: user?.id,
    onStatusChange: (payload) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== payload.bookingId) return b;
          const { status: _ignored, ...restBooking } = (payload.booking || {}) as any;
          return { ...b, ...restBooking, status: payload.newStatus };
        })
      );
      if (payload.newStatus === "confirmed" || payload.newStatus === "cancelled") {
        fetchTripsData();
      }
    },
    onBookingCreated: () => {
      fetchTripsData();
    },
    onBookingUpdated: (updated) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
      );
    },
  });

  // Cross-Screen Collaboration: Update bookings in place and notify user
  useScreenCollaboration(
    APP_EVENTS.BOOKING_STATUS_CHANGED,
    useCallback(
      (payload) => {
        if (!payload?.bookingId) return;
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payload.bookingId
              ? { ...b, status: payload.currentStatus }
              : b
          )
        );
        const statusLabel = t(payload.currentStatus, {
          defaultValue: payload.currentStatus,
        });
        toast.info(t("bookingStatusUpdated", { status: statusLabel }));
      },
      [t]
    ),
    { replayLast: true, screenId: "TripsTab_Bookings" }
  );

  useScreenCollaboration(
    APP_EVENTS.PAYMENT_COMPLETED,
    useCallback(
      (payload) => {
        if (!payload?.bookingId) return;
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payload.bookingId
              ? { ...b, status: "confirmed", is_paid: true }
              : b
          )
        );
        toast.success(
          t("paymentReceivedToast", {
            reference:
              payload.bookingReference || payload.bookingId.slice(0, 8),
          })
        );
      },
      [t]
    ),
    { replayLast: true, screenId: "TripsTab_Payments" }
  );

  // Monitor scroll position to trigger morphing Back-to-Top button
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      if (value > 120) {
        if (!isScrolled) setIsScrolled(true);
      } else {
        if (isScrolled) setIsScrolled(false);
      }
    });
    return () => scrollY.removeListener(listenerId);
  }, [isScrolled, scrollY]);

  if (activeSegment === "planner") {
    return (
      <SafeAreaView style={styles.shell} edges={["top"]}>
        <View style={styles.headerBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              style={styles.backToBookingsPill}
              onPress={() => setActiveSegment("bookings")}
            >
              <Ionicons name="arrow-back" size={16} color={TRIP_BLUE} />
              <Text style={styles.backToBookingsText}>Bookings</Text>
            </Pressable>
            <Text style={styles.headerTitle}>AI Trip Planner</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <TripPlannerScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Trips</Text>

        <Pressable
          style={styles.widgetBtn}
          onPress={() => setShowWidgetModal(true)}
        >
          <Ionicons name="grid-outline" size={18} color="#111827" />
          <Text style={styles.widgetBtnText}>Widget</Text>
        </Pressable>
      </View>

      {/* Segmented Switcher for Trips, My Tickets & AI Planner */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[
            styles.segmentButton,
            activeSegment === "bookings" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveSegment("bookings")}
        >
          <Ionicons
            name="briefcase-outline"
            size={15}
            color={activeSegment === "bookings" ? TRIP_BLUE : "#64748B"}
          />
          <Text
            style={[
              styles.segmentText,
              activeSegment === "bookings" && styles.segmentTextActive,
            ]}
          >
            বুকিং
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentButton,
            activeSegment === "tickets" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveSegment("tickets")}
        >
          <Ionicons
            name="ticket-outline"
            size={15}
            color={activeSegment === "tickets" ? TRIP_BLUE : "#64748B"}
          />
          <Text
            style={[
              styles.segmentText,
              activeSegment === "tickets" && styles.segmentTextActive,
            ]}
          >
            আমার টিকিট
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentButton,
            (activeSegment as string) === "planner" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveSegment("planner")}
        >
          <Ionicons
            name="sparkles"
            size={15}
            color={(activeSegment as string) === "planner" ? TRIP_BLUE : "#64748B"}
          />
          <Text
            style={[
              styles.segmentText,
              (activeSegment as string) === "planner" && styles.segmentTextActive,
            ]}
          >
            AI প্ল্যানার
          </Text>
        </Pressable>

        <Pressable
          style={styles.segmentButton}
          onPress={() => router.push("/screens/group-trip" as any)}
        >
          <Ionicons
            name="people"
            size={15}
            color="#0055F2"
          />
          <Text
            style={[
              styles.segmentText,
              { color: "#0055F2", fontWeight: "700" }
            ]}
          >
            গ্রুপ ট্রিপ
          </Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[TRIP_BLUE]}
            tintColor={TRIP_BLUE}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {activeSegment === "tickets" ? (
          <View style={{ flex: 1, paddingBottom: 40 }}>
            {/* Live Journey Assistant Card */}
            <LiveTripCompanion
              tripData={
                offlineTickets.length > 0
                  ? {
                      id: offlineTickets[0].id,
                      bookingReference: offlineTickets[0].bookingReference,
                      passengerName: offlineTickets[0].passengerName,
                      transportType: offlineTickets[0].type as any,
                      operatorOrAirline: offlineTickets[0].title,
                      serviceNumber: offlineTickets[0].title.match(/[A-Z0-9]+-\d+/)?.[0] || "BG-433",
                      origin: offlineTickets[0].origin || "ঢাকা (DAC)",
                      originCode: offlineTickets[0].origin?.slice(0, 3).toUpperCase() || "DAC",
                      destination: offlineTickets[0].destination,
                      destinationCode: offlineTickets[0].destination?.slice(0, 3).toUpperCase() || "CXB",
                      departureDate: offlineTickets[0].travelDate,
                      departureTime: offlineTickets[0].departureTime || "11:45 AM",
                      seatNumbers: offlineTickets[0].seatOrRoom || "12A, 12B",
                      gate: "Gate 04",
                      terminal: "T1",
                      boardingTime: "11:00 AM",
                    }
                  : null
              }
              onOpenSupport={() => router.push("/screens/customer-support" as any)}
            />

            {/* Offline Saved Tickets List */}
            <View style={styles.ticketSectionHeader}>
              <View>
                <Text style={styles.ticketSectionTitle}>সংরক্ষিত টিকিট ও বোর্ডিং পাস</Text>
                <Text style={styles.ticketSectionSub}>
                  ইন্টারনেট সংযোগ ছাড়াও যেকোনো সময় টিকিট প্রদর্শনের সুবিধা
                </Text>
              </View>
              <View style={styles.ticketCountBadge}>
                <Text style={styles.ticketCountBadgeText}>{offlineTickets.length}টি টিকিট</Text>
              </View>
            </View>

            {offlineTickets.length > 0 ? (
              <View style={styles.ticketsListWrapper}>
                {offlineTickets.map((tkt) => {
                  const isFlight = tkt.type === "flight";
                  const isTrain = tkt.type === "train";
                  const isBus = tkt.type === "bus";
                  const isLaunch = tkt.type === "launch";

                  const tIcon = isFlight
                    ? "airplane"
                    : isTrain
                    ? "train"
                    : isLaunch
                    ? "boat"
                    : isBus
                    ? "bus"
                    : "ticket";

                  return (
                    <View key={tkt.id} style={styles.ticketCardItem}>
                      <View style={styles.ticketCardHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={styles.ticketTypeCircle}>
                            <Ionicons name={tIcon as any} size={16} color="#FFFFFF" />
                          </View>
                          <View>
                            <Text style={styles.ticketCardTitle} numberOfLines={1}>
                              {tkt.title}
                            </Text>
                            <Text style={styles.ticketCardPnr}>
                              PNR: {tkt.bookingReference}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.ticketSeatBadge}>
                          <Text style={styles.ticketSeatBadgeLabel}>আসন নং</Text>
                          <Text style={styles.ticketSeatBadgeVal}>
                            {tkt.seatOrRoom || "নির্ধারিত"}
                          </Text>
                        </View>
                      </View>

                      {/* Route Row */}
                      <View style={styles.ticketCardRouteRow}>
                        <View>
                          <Text style={styles.ticketCityName}>{tkt.origin || "ঢাকা"}</Text>
                          <Text style={styles.ticketDepartureTime}>
                            {tkt.departureTime || "সময়মতো"}
                          </Text>
                        </View>
                        <View style={styles.ticketRouteArrow}>
                          <Ionicons name="arrow-forward" size={16} color={TRIP_BLUE} />
                          <Text style={styles.ticketDateSmall}>{tkt.travelDate}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.ticketCityName}>{tkt.destination}</Text>
                          <Text style={styles.ticketStatusTag}>কনফার্মড</Text>
                        </View>
                      </View>

                      {/* Card Actions */}
                      <View style={styles.ticketCardActionRow}>
                        <TouchableOpacity
                          style={styles.viewBoardingPassBtn}
                          onPress={() => openTicketAsBoardingPass(tkt)}
                        >
                          <Ionicons name="qr-code" size={16} color="#FFFFFF" />
                          <Text style={styles.viewBoardingPassBtnText}>
                            বোর্ডিং পাস দেখুন
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.pdfDownloadBtn}
                          disabled={exportingTicketId === tkt.id}
                          onPress={async () => {
                            setExportingTicketId(tkt.id);
                            await ticketService.generateAndShareTicketPdf(tkt);
                            setExportingTicketId(null);
                          }}
                        >
                          <Ionicons name="download-outline" size={16} color={TRIP_BLUE} />
                          <Text style={styles.pdfDownloadBtnText}>
                            {exportingTicketId === tkt.id ? "ডাউনলোড..." : "PDF"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyTicketsBox}>
                <Ionicons name="ticket-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>কোনো সক্রিয় টিকিট পাওয়া যায়নি</Text>
                <Text style={styles.emptySubtitle}>
                  ফ্লাইট, ট্রেন বা বাসের টিকিট বুকিং নিশ্চিত হলে এখানে অফলাইন ডিজিটাল বোর্ডিং পাস দেখা যাবে।
                </Text>
                <View style={styles.emptyButtonsRow}>
                  <Pressable
                    style={styles.emptyStaysBtn}
                    onPress={() => router.push("/screens/flights" as any)}
                  >
                    <Text style={styles.emptyStaysBtnText}>ফ্লাইট খুঁজুন</Text>
                  </Pressable>
                  <Pressable
                    style={styles.emptyFlightsBtn}
                    onPress={() => router.push("/screens/trains" as any)}
                  >
                    <Text style={styles.emptyFlightsBtnText}>ট্রেন বুকিং</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          <>
        {/* AI Travel Disruption Surveillance Banner */}
        <TouchableOpacity
          style={styles.travelIntelligenceBanner}
          activeOpacity={0.88}
          onPress={() => router.push(ROUTES.SCREENS.TRAVEL_INTELLIGENCE)}
        >
          <View style={styles.intelBannerLeft}>
            <View style={styles.intelIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color="#287DFA" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.intelBannerTitle}>Travel Intelligence Active</Text>
                <View style={styles.livePulseDot} />
              </View>
              <Text style={styles.intelBannerSub}>
                24/7 AI delay monitoring & automatic alternative recommendations
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#287DFA" />
        </TouchableOpacity>

        {/* Horizontal Navigation Pills (Screenshot 2) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          <Pressable
            style={[
              styles.filterPill,
              activeFilter === "all" && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter("all")}
          >
            <Ionicons name="calendar-outline" size={14} color="#111827" />
            <Text style={styles.filterPillText}>All Bookings</Text>
          </Pressable>

          <Pressable
            style={styles.filterPill}
            onPress={() => router.push(ROUTES.SCREENS.EXPLORE_TRIPS)}
          >
            <Ionicons name="compass-outline" size={14} color="#287DFA" />
            <Text style={[styles.filterPillText, { color: "#287DFA", fontWeight: "700" }]}>
              Explore Marketplace
            </Text>
          </Pressable>

          <Pressable
            style={styles.filterPill}
            onPress={() => router.push(ROUTES.SCREENS.TRAVEL_INTELLIGENCE)}
          >
            <Ionicons name="shield-outline" size={14} color="#059669" />
            <Text style={[styles.filterPillText, { color: "#059669", fontWeight: "700" }]}>
              Disruption Guardian
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterPill,
              activeFilter === "itineraries" && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter("itineraries")}
          >
            <Ionicons name="swap-horizontal-outline" size={14} color="#111827" />
            <Text style={styles.filterPillText}>My itineraries</Text>
          </Pressable>

          <Pressable
            style={styles.filterPill}
            onPress={() => router.push("/screens/search" as any)}
          >
            <Ionicons name="options-outline" size={14} color="#111827" />
            <Ionicons name="chevron-down" size={14} color="#111827" />
          </Pressable>
        </ScrollView>

        {/* Live Bookings from Supabase */}
        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color={TRIP_BLUE} />
          </View>
        ) : bookings.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hotelCardsRow}
            data={bookings}
            keyExtractor={(b) => b.id || `booking-${Math.random()}`}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={3}
            renderItem={({ item: booking }) => {
              const hotel = booking.hotel;
              const flight = booking.flight;
              const title = hotel?.name || flight?.flight_number ? `Flight ${flight.flight_number}` : booking.title || "Travel Reservation";
              const image = hotel?.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";
              const status = booking.status || "Confirmed";
              const price = booking.total_price || booking.amount || hotel?.base_price || 120;

              return (
                <Pressable
                  key={booking.id}
                  style={styles.hotelCard}
                  onPress={() => {
                    setManageBooking(booking);
                    setShowManageModal(true);
                  }}
                >
                  <Image source={{ uri: image }} style={styles.hotelImage} />

                  <View style={styles.hotelCardContent}>
                    <View style={styles.statusBadgeRow}>
                      <View style={[styles.statusIndicator, { backgroundColor: status === "cancelled" ? "#EF4444" : "#10B981" }]} />
                      <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
                      <Pressable
                        style={styles.topManageBtn}
                        onPress={() => {
                          setManageBooking(booking);
                          setShowManageModal(true);
                        }}
                      >
                        <Ionicons name="swap-horizontal" size={11} color="#DC2626" />
                        <Text style={styles.topManageBtnText}>পরিবর্তন / বাতিল</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.hotelName} numberOfLines={2}>
                      {title}
                    </Text>

                    <Text style={styles.bookingDatesText}>
                      {booking.check_in_date ? `Check-in: ${booking.check_in_date}` : (booking.travel_date ? `Date: ${booking.travel_date}` : `Ref: ${booking.id?.slice(0, 8)}`)}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>{formatPrice(price)}</Text>
                      <View style={styles.pinkDiscountBadge}>
                        <Text style={styles.pinkDiscountText} onPress={() => {
                          calendarService.addToCalendar({
                            title: `ভ্রমণ: ${title}`,
                            description: `বুকিং #${booking.booking_reference || booking.id?.slice(0, 8)}`,
                            startDate: new Date(booking.travel_date || booking.check_in_date || Date.now() + 86400000),
                          });
                        }}>+ ক্যালেন্ডার</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        ) : (
          <View style={styles.emptyBookingsCard}>
            <Ionicons name="calendar-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Trips Yet</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any active bookings. Explore verified hotels, flights, and trains to begin your journey.
            </Text>
            <View style={styles.emptyButtonsRow}>
              <Pressable
                style={styles.emptyStaysBtn}
                onPress={() => router.push("/screens/search-stays" as any)}
              >
                <Text style={styles.emptyStaysBtnText}>Browse Hotels</Text>
              </Pressable>
              <Pressable
                style={styles.emptyFlightsBtn}
                onPress={() => router.push("/screens/flights" as any)}
              >
                <Text style={styles.emptyFlightsBtnText}>Find Flights</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick AI Tool Action Pills (Screenshot 2) */}
        <View style={styles.quickAiActionRow}>
          <Pressable
            style={styles.aiActionPill}
            onPress={() => setActiveSegment("planner")}
          >
            <Text style={styles.aiSparkleIcon}>✨</Text>
            <Text style={styles.aiActionLabel}>Plan a trip with AI</Text>
          </Pressable>

          <Pressable
            style={styles.aiActionPill}
            onPress={() => router.push("/screens/explore" as any)}
          >
            <Ionicons name="map-outline" size={15} color="#111827" />
            <Text style={styles.aiActionLabel}>Explore on map</Text>
          </Pressable>
        </View>

        {/* "Travelers' favorites" Section from Live Supabase Posts */}
        <View style={styles.favoritesSectionHeader}>
          <Text style={styles.favoritesTitle}>Travelers' favorites</Text>
          <Pressable
            style={styles.momentsLinkRow}
            onPress={() => router.push("/screens/community" as any)}
          >
            <Text style={styles.momentsLinkText}>Moments</Text>
            <Ionicons name="chevron-forward" size={14} color={TRIP_BLUE} />
          </Pressable>
        </View>

        {/* Vertical Feed Cards Grid */}
        <View style={styles.favoritesGrid}>
          {favoritePosts.map((post) => {
            const author = post.author?.display_name || post.author?.username || "Traveler";
            const avatar = post.author?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
            const image = post.media?.[0]?.media_url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600";
            const location = post.location || "Featured Spot";
            const title = post.title || post.content?.slice(0, 45) || "Travel Memory";

            return (
              <Pressable
                key={post.id}
                style={styles.favoriteCard}
                onPress={() => router.push("/screens/community" as any)}
              >
                <Image source={{ uri: image }} style={styles.favoriteCardImage} />

                <View style={styles.favoriteCardOverlay}>
                  <Text style={styles.yellowBannerText}>{location.toUpperCase()}</Text>

                  <View style={styles.favoriteBottomDetails}>
                    <Text style={styles.favoriteCityTitle} numberOfLines={1}>{location}</Text>
                    <Text style={styles.favoriteSubTitle} numberOfLines={2}>
                      {title}
                    </Text>

                    <View style={styles.authorBadgeRow}>
                      <Image source={{ uri: avatar }} style={styles.authorAvatarImg} />
                      <Text style={styles.authorNameText}>{author}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
          </>
        )}

        {/* Bottom Scroll Padding */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Widget Overlay Modal */}
      <AddWidgetModal
        visible={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
      />

      {/* Booking Change & Cancel Modal with Instant Refund Preview */}
      <BookingManageModal
        visible={showManageModal}
        booking={manageBooking}
        onClose={() => setShowManageModal(false)}
        onBookingCancelled={(cancelledId) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === cancelledId ? { ...b, status: "cancelled" } : b))
          );
        }}
        onDateChanged={(bookingId, newDate) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === bookingId ? { ...b, travel_date: newDate, check_in_date: newDate } : b))
          );
        }}
      />

      {/* Interactive Digital Boarding Pass Modal */}
      <BoardingPassModal
        visible={showPassModal}
        passData={selectedPass}
        onClose={() => setShowPassModal(false)}
      />
      {isScrolled && (
        <Pressable
          style={styles.backToTopFab}
          onPress={() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.1)" } : {}),
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentTextActive: {
    color: TRIP_BLUE,
    fontWeight: "700",
  },
  backToBookingsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  backToBookingsText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  widgetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  widgetBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  scrollContent: {
    paddingTop: 12,
  },
  pillsRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  filterPillActive: {
    borderColor: TRIP_BLUE,
    backgroundColor: "#EFF6FF",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  loadingWrapper: {
    paddingVertical: 40,
    alignItems: "center",
  },
  hotelCardsRow: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  hotelCard: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hotelImage: {
    width: "100%",
    height: 120,
  },
  hotelCardContent: {
    padding: 12,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  hotelName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  bookingDatesText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  pinkDiscountBadge: {
    backgroundColor: TRIP_PINK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinkDiscountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E11D48",
  },
  topManageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  topManageBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  addCalBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  addCalBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0055F2",
  },
  emptyBookingsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  emptyStaysBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStaysBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyFlightsBtn: {
    backgroundColor: "#EFF6FF",
    borderColor: TRIP_BLUE,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyFlightsBtnText: {
    color: TRIP_BLUE,
    fontSize: 13,
    fontWeight: "700",
  },
  quickAiActionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  aiActionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  aiSparkleIcon: {
    fontSize: 15,
  },
  aiActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  favoritesSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  momentsLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  momentsLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: TRIP_BLUE,
  },
  favoritesGrid: {
    paddingHorizontal: 16,
    gap: 14,
  },
  favoriteCard: {
    minHeight: 180,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  favoriteCardImage: {
    width: "100%",
    height: "100%",
  },
  favoriteCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 14,
    justifyContent: "space-between",
  },
  yellowBannerText: {
    alignSelf: "flex-start",
    backgroundColor: ACCENT_YELLOW,
    color: "#000000",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  favoriteBottomDetails: {},
  favoriteCityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  favoriteSubTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 4,
  },
  authorBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorAvatarImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  authorNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  backToTopFab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TRIP_BLUE,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // E-Ticket Tab Styles
  ticketsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  offlineHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  offlineHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  ticketVoucherCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: TRIP_BLUE,
    padding: 16,
    marginBottom: 16,
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  voucherTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  voucherDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  voucherPnrBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
  },
  voucherPnrLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1E40AF",
  },
  voucherPnrVal: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
    fontFamily: "monospace",
  },
  voucherDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 14,
  },
  voucherQrRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  voucherQrBox: {
    padding: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
  },
  voucherDetailsCol: {
    flex: 1,
    gap: 8,
  },
  voucherMetaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  voucherMetaLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  voucherMetaVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
  voucherStatusConfirmed: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "800",
  },
  voucherShareBtn: {
    backgroundColor: TRIP_BLUE,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  voucherShareBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyTicketsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 20,
  },
  emptyTicketsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyTicketsSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  browseServicesBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  browseServicesBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  boardingPassPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  boardingPassPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  ticketSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  ticketSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketSectionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  ticketCountBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketCountBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  ticketsListWrapper: {
    paddingHorizontal: 16,
    marginTop: 6,
    gap: 12,
  },
  ticketCardItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  ticketCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  ticketTypeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TRIP_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    maxWidth: 180,
  },
  ticketCardPnr: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
  },
  ticketSeatBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  ticketSeatBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  ticketSeatBadgeVal: {
    fontSize: 13,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  ticketCardRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  ticketCityName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketDepartureTime: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  ticketRouteArrow: {
    alignItems: "center",
  },
  ticketDateSmall: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 2,
  },
  ticketStatusTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  ticketCardActionRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  viewBoardingPassBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewBoardingPassBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pdfDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pdfDownloadBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  emptyTicketsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 16,
  },
  travelIntelligenceBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  intelBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  intelIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  intelBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  intelBannerSub: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
  },
});
