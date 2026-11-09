import React, { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../utils/supabase";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#E5A93C"; // Luxury Gold Design Token
const TRIP_DARK_BLUE = "#121622"; // Obsidian Dark Design Token

interface HotelRoom {
  id: string;
  hotel_id?: string;
  room_type: string;
  description?: string;
  max_occupancy: number;
  base_price: number | string;
  bed_type?: string;
  square_meters?: number;
  amenities?: string[] | string;
  image_urls?: string[] | string;
}

interface HotelItem {
  id: string;
  name: string;
  city: string;
  country?: string;
  address?: string;
  star_rating?: number | string;
  average_rating?: number | string;
  total_reviews?: number;
  base_price: number | string;
  image_url?: string;
  images?: string[];
  amenities?: string[];
  hotel_rooms?: HotelRoom[];
}


const VIBE_CATEGORIES = ["All Stays", "Beachfront", "Eco Retreat", "Luxury Spa", "Heritage", "City Oasis"];

export function SearchStaysScreen() {
  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("All Stays");
  const [claimedVoucher, setClaimedVoucher] = useState(false);

  // 1. Dates & Nights Configuration
  const [checkInDate, setCheckInDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d;
  });
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Nights calculation
  const nightsCount = useMemo(() => {
    const diff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  // 2. Guests & Rooms Configuration
  const [guestsConfig, setGuestsConfig] = useState({
    rooms: 1,
    adults: 2,
    children: 0,
  });
  const [showGuestsModal, setShowGuestsModal] = useState(false);

  // 3. Room Selection Drawer State
  const [selectedHotel, setSelectedHotel] = useState<HotelItem | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);

  // Load Hotels from Supabase with Realtime synchronization
  useEffect(() => {
    let isMounted = true;

    async function fetchHotels() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("hotels")
          .select("*, hotel_rooms(*)")
          .order("average_rating", { ascending: false });

        if (!error && isMounted) {
          setHotels(data || []);
        }
      } catch (e) {
        console.warn("Hotel inventory fetch error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHotels();

    const channelId = `stays-live-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels" }, () => {
        fetchHotels();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_rooms" }, () => {
        fetchHotels();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClaimVoucher = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimedVoucher(true);
    Alert.alert("🎉 Voucher Claimed", "Your $15 New User discount is applied at checkout!");
  };

  const setNightsQuick = (nights: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextCheckOut = new Date(checkInDate);
    nextCheckOut.setDate(nextCheckOut.getDate() + nights);
    setCheckOutDate(nextCheckOut);
  };

  // Open Room Selection Modal for a Hotel
  const handleOpenHotelRooms = (hotel: HotelItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHotel(hotel);
    setSelectedRoomIndex(0);
  };

  // Filtered Hotels
  const filteredHotels = useMemo(() => {
    let list = [...hotels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.country?.toLowerCase().includes(q)
      );
    }

    if (selectedVibe !== "All Stays") {
      const q = selectedVibe.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.amenities?.some((a) => a.toLowerCase().includes(q))
      );
    }

    return list;
  }, [hotels, searchQuery, selectedVibe]);

  // Selected Room in Bottom Sheet
  const activeRooms = useMemo(() => {
    if (!selectedHotel) return [];
    if (selectedHotel.hotel_rooms && selectedHotel.hotel_rooms.length > 0) {
      return selectedHotel.hotel_rooms;
    }
    return [];
  }, [selectedHotel]);

  const activeSelectedRoom = activeRooms[selectedRoomIndex] || activeRooms[0];

  // Price Calculation Breakdown
  const roomRate = activeSelectedRoom ? parseFloat(String(activeSelectedRoom.base_price)) : (parseFloat(String(selectedHotel?.base_price)) || 80);
  const subtotal = roomRate * nightsCount * guestsConfig.rooms;
  const taxes = Math.round(subtotal * 0.1); // 10% VAT / Service charge
  const voucherDiscount = claimedVoucher ? 15 : 0;
  const finalTotal = Math.max(0, subtotal + taxes - voucherDiscount);

  // Reserve & Navigate to Checkout
  const handleReserveRoom = () => {
    if (!selectedHotel || !activeSelectedRoom) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const hotel = selectedHotel;
    const room = activeSelectedRoom;
    setSelectedHotel(null);

    router.push({
      pathname: "/screens/payments" as any,
      params: {
        hotelId: hotel.id,
        hotelName: hotel.name,
        roomType: room.room_type,
        roomId: room.id,
        checkIn: checkInDate.toISOString().split("T")[0],
        checkOut: checkOutDate.toISOString().split("T")[0],
        nights: String(nightsCount),
        guests: `${guestsConfig.adults} Adults, ${guestsConfig.children} Children`,
        rooms: String(guestsConfig.rooms),
        amount: String(finalTotal),
        reference: `Booking: ${hotel.name} (${room.room_type})`,
      },
    });
  };

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Search Stays</Text>
        <Pressable style={styles.moreBtn} onPress={() => router.push("/screens/settings" as any)}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#0F172A" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Links Navigation */}
        <View style={styles.quickLinksRow}>
          {[
            { label: "Saved", icon: "heart-outline" as const, route: "/screens/saved" },
            { label: "My Trips", icon: "calendar-outline" as const, route: "/(tabs)/trips" },
            { label: "Community", icon: "people-outline" as const, route: "/(tabs)/community" },
            { label: "Offers", icon: "pricetag-outline" as const, route: "/screens/rewards" },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={styles.quickLinkItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.quickLinkCircle}>
                <Ionicons name={item.icon} size={20} color={TRIP_BLUE} />
              </View>
              <Text style={styles.quickLinkLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* =================================================================== */}
        {/* HERO SEARCH & BOOKING BAR */}
        {/* =================================================================== */}
        <View style={styles.bookingHeroCard}>
          {/* Destination Search Input */}
          <View style={styles.destinationRow}>
            <Ionicons name="search" size={20} color={TRIP_BLUE} />
            <TextInput
              style={styles.destinationInput}
              placeholder="Where to? (e.g. Cox's Bazar, Bogra, Kyoto...)"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>

          {/* Interactive Date Range & Night Badge Selector */}
          <Pressable
            style={styles.dateSelectorBox}
            onPress={() => setShowDatePickerModal(true)}
          >
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>CHECK-IN</Text>
              <Text style={styles.dateValue}>
                {checkInDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>

            <View style={styles.nightsBadge}>
              <Ionicons name="moon" size={12} color="#0055F2" />
              <Text style={styles.nightsBadgeText}>
                {nightsCount} {nightsCount === 1 ? "Night" : "Nights"}
              </Text>
            </View>

            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>CHECK-OUT</Text>
              <Text style={styles.dateValue}>
                {checkOutDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          </Pressable>

          {/* Interactive Guests & Rooms Selector */}
          <Pressable
            style={styles.guestsSelectorBox}
            onPress={() => setShowGuestsModal(true)}
          >
            <View style={styles.guestsInfoLeft}>
              <Ionicons name="people-outline" size={18} color="#64748B" />
              <Text style={styles.guestsValue}>
                {guestsConfig.rooms} {guestsConfig.rooms === 1 ? "Room" : "Rooms"} •{" "}
                {guestsConfig.adults} Adults
                {guestsConfig.children > 0 ? `, ${guestsConfig.children} Children` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* New User Benefits Banner with Instant Claim */}
        <View style={styles.benefitsBanner}>
          <View style={styles.benefitsHeader}>
            <View>
              <Text style={styles.benefitsTitle}>New User Special</Text>
              <Text style={styles.benefitsSub}>Exclusive booking vouchers</Text>
            </View>
            <Pressable
              style={[styles.claimAllBtn, claimedVoucher && styles.claimAllBtnActive]}
              onPress={handleClaimVoucher}
            >
              <Text style={[styles.claimAllBtnText, claimedVoucher && { color: "#FFFFFF" }]}>
                {claimedVoucher ? "Claimed ✓ (-$15)" : "Claim $15 Off"}
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vouchersScroll}>
            <View style={[styles.voucherCard, claimedVoucher && styles.voucherCardActive]}>
              <Text style={styles.voucherDiscount}>$15 OFF</Text>
              <Text style={styles.voucherDesc}>First stay discount</Text>
            </View>
            <View style={styles.voucherCard}>
              <Text style={styles.voucherDiscount}>Free Breakfast</Text>
              <Text style={styles.voucherDesc}>At 5-star properties</Text>
            </View>
            <View style={styles.voucherCard}>
              <Text style={styles.voucherDiscount}>Free Cancel</Text>
              <Text style={styles.voucherDesc}>Up to 24h before check-in</Text>
            </View>
          </ScrollView>
        </View>

        {/* Vibe Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vibePillsRow}
        >
          {VIBE_CATEGORIES.map((vibe) => (
            <Pressable
              key={vibe}
              style={[styles.vibePill, selectedVibe === vibe && styles.vibePillActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedVibe(vibe);
              }}
            >
              <Text
                style={[
                  styles.vibePillText,
                  selectedVibe === vibe && styles.vibePillTextActive,
                ]}
              >
                {vibe}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Stays Cards Grid / List */}
        <View style={styles.staysSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              {searchQuery ? `Stays in "${searchQuery}"` : "Featured Stays & Resorts"}
            </Text>
            <Text style={styles.sectionCountText}>({filteredHotels.length} available)</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={TRIP_BLUE} style={{ marginVertical: 32 }} />
          ) : filteredHotels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bed-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No stays match your criteria</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for "Cox's Bazar", "Dhaka", or "Bogra"
              </Text>
            </View>
          ) : (
            filteredHotels.map((hotel) => {
              const roomsCount = hotel.hotel_rooms?.length || 3;
              const rating = hotel.average_rating || hotel.star_rating || "4.8";
              const reviews = hotel.total_reviews || 320;
              const startingPrice = hotel.base_price || 85;

              return (
                <Pressable
                  key={hotel.id}
                  style={styles.hotelCard}
                  onPress={() => handleOpenHotelRooms(hotel)}
                >
                  <View style={styles.hotelImageWrapper}>
                    <Image
                      source={{
                        uri:
                          hotel.image_url ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
                      }}
                      style={styles.hotelImage}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.6)"]}
                      style={styles.hotelImageGradient}
                    />

                    {claimedVoucher && (
                      <View style={styles.specialDealBadge}>
                        <Ionicons name="pricetag" size={11} color="#FFFFFF" />
                        <Text style={styles.specialDealText}>$15 OFF APPLIED</Text>
                      </View>
                    )}

                    <View style={styles.ratingBadgePill}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingBadgeText}>{rating}</Text>
                      <Text style={styles.reviewsCountText}>({reviews})</Text>
                    </View>
                  </View>

                  <View style={styles.hotelCardBody}>
                    <View style={styles.hotelTitleRow}>
                      <Text style={styles.hotelName} numberOfLines={1}>
                        {hotel.name}
                      </Text>
                    </View>

                    <View style={styles.hotelLocationRow}>
                      <Ionicons name="location-sharp" size={14} color="#0055F2" />
                      <Text style={styles.hotelLocationText}>
                        {hotel.city}, {hotel.country || "Bangladesh"}
                      </Text>
                    </View>

                    {/* Amenities Tags */}
                    <View style={styles.amenitiesTagsRow}>
                      {(hotel.amenities || ["Free WiFi", "Breakfast Included", "Pool"]).slice(0, 3).map((a) => (
                        <View key={a} style={styles.amenityTag}>
                          <Text style={styles.amenityTagText}>{a}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Bottom Pricing & Reserve Trigger */}
                    <View style={styles.hotelFooterRow}>
                      <View>
                        <Text style={styles.startingFromLabel}>From</Text>
                        <Text style={styles.hotelPriceText}>
                          ${startingPrice}
                          <Text style={styles.hotelPriceUnit}>/night</Text>
                        </Text>
                      </View>

                      <Pressable
                        style={styles.viewRoomsBtn}
                        onPress={() => handleOpenHotelRooms(hotel)}
                      >
                        <Text style={styles.viewRoomsBtnText}>
                          Select Room ({roomsCount})
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* =================================================================== */}
      {/* MODAL 1: INTERACTIVE DATE PICKER SHEET */}
      {/* =================================================================== */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Trip Dates</Text>
                <Text style={styles.modalSubTitle}>
                  {nightsCount} {nightsCount === 1 ? "Night" : "Nights"} stay
                </Text>
              </View>
              <Pressable onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Quick Night Chips */}
            <Text style={styles.modalSectionLabel}>Quick Duration:</Text>
            <View style={styles.quickNightsRow}>
              {[1, 2, 3, 5, 7, 14].map((n) => (
                <Pressable
                  key={`nights-${n}`}
                  style={[
                    styles.quickNightChip,
                    nightsCount === n && styles.quickNightChipActive,
                  ]}
                  onPress={() => setNightsQuick(n)}
                >
                  <Text
                    style={[
                      styles.quickNightChipText,
                      nightsCount === n && styles.quickNightChipTextActive,
                    ]}
                  >
                    {n} {n === 1 ? "Night" : "Nights"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Date Display Card */}
            <View style={styles.datesSummaryBox}>
              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading}>Check-in</Text>
                <Text style={styles.dateSummaryDate}>
                  {checkInDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#0055F2" />
              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading}>Check-out</Text>
                <Text style={styles.dateSummaryDate}>
                  {checkOutDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.modalApplyBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={styles.modalApplyBtnText}>Apply Dates</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 2: GUESTS & ROOMS CONFIGURATION MODAL */}
      {/* =================================================================== */}
      <Modal
        visible={showGuestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGuestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Guests & Rooms</Text>
                <Text style={styles.modalSubTitle}>Configure travel party</Text>
              </View>
              <Pressable onPress={() => setShowGuestsModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Stepper Rows */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>Rooms</Text>
                <Text style={styles.stepperSub}>Number of hotel rooms</Text>
              </View>
              <View style={styles.stepperControl}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      rooms: Math.max(1, c.rooms - 1),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </Pressable>
                <Text style={styles.stepValue}>{guestsConfig.rooms}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      rooms: Math.min(5, c.rooms + 1),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>Adults</Text>
                <Text style={styles.stepperSub}>Age 13+</Text>
              </View>
              <View style={styles.stepperControl}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      adults: Math.max(1, c.adults - 1),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </Pressable>
                <Text style={styles.stepValue}>{guestsConfig.adults}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      adults: Math.min(10, c.adults + 1),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>Children</Text>
                <Text style={styles.stepperSub}>Age 0-12</Text>
              </View>
              <View style={styles.stepperControl}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      children: Math.max(0, c.children - 1),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </Pressable>
                <Text style={styles.stepValue}>{guestsConfig.children}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      children: Math.min(6, c.children + 1),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.modalApplyBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGuestsModal(false);
              }}
            >
              <Text style={styles.modalApplyBtnText}>Apply Guests</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 3: ROOM SELECTION BOTTOM SHEET & RESERVATION */}
      {/* =================================================================== */}
      <Modal
        visible={!!selectedHotel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedHotel(null)}
      >
        {selectedHotel && (
          <View style={styles.bottomSheetOverlay}>
            <View style={styles.bottomSheetCard}>
              {/* Hotel Header Info */}
              <View style={styles.bottomSheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bottomSheetHotelName} numberOfLines={1}>
                    {selectedHotel.name}
                  </Text>
                  <Text style={styles.bottomSheetLocation}>
                    {selectedHotel.city}, {selectedHotel.country || "Bangladesh"}
                  </Text>
                </View>
                <Pressable
                  style={styles.sheetCloseBtn}
                  onPress={() => setSelectedHotel(null)}
                >
                  <Ionicons name="close" size={22} color="#0F172A" />
                </Pressable>
              </View>

              {/* Selected Dates Banner */}
              <View style={styles.sheetDatesBanner}>
                <Ionicons name="calendar" size={14} color="#0055F2" />
                <Text style={styles.sheetDatesText}>
                  {checkInDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  -{" "}
                  {checkOutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  ({nightsCount} {nightsCount === 1 ? "Night" : "Nights"}) • {guestsConfig.adults} Adults
                </Text>
              </View>

              <ScrollView style={styles.roomsListScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.selectRoomHeading}>Select Room Type:</Text>

                {activeRooms.length > 0 ? (
                  activeRooms.map((room, idx) => {
                    const isSelected = selectedRoomIndex === idx;
                    const price = parseFloat(String(room.base_price)) || 80;
                    const roomImage = Array.isArray(room.image_urls) && room.image_urls.length > 0
                      ? room.image_urls[0]
                      : selectedHotel.image_url;

                    return (
                      <Pressable
                        key={room.id || idx}
                        style={[styles.roomCard, isSelected && styles.roomCardActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedRoomIndex(idx);
                        }}
                      >
                        <View style={styles.roomImageContainer}>
                          <Image source={{ uri: roomImage }} style={styles.roomThumbnail} />
                          <View style={styles.radioCircle}>
                            {isSelected && <View style={styles.radioInnerDot} />}
                          </View>
                        </View>

                        <View style={styles.roomDetailsCol}>
                          <Text style={styles.roomTitle}>{room.room_type}</Text>
                          <Text style={styles.roomSpecs}>
                            {room.bed_type || "King Bed"} • {room.square_meters || 38} m² • Up to {room.max_occupancy} guests
                          </Text>
                          <Text style={styles.roomDesc} numberOfLines={2}>
                            {room.description || "Luxurious room with premium bedding and morning views."}
                          </Text>

                          {/* Room Amenities */}
                          <View style={styles.roomAmenitiesRow}>
                            {(Array.isArray(room.amenities)
                              ? room.amenities
                              : ["Free WiFi", "Balcony", "AC"]
                            ).slice(0, 3).map((am) => (
                              <View key={am} style={styles.roomAmenityPill}>
                                <Text style={styles.roomAmenityText}>{am}</Text>
                              </View>
                            ))}
                          </View>

                          <Text style={styles.roomPriceText}>
                            ${price}
                            <Text style={styles.roomPriceSub}> / night</Text>
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={{ padding: 20, alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, marginBottom: 16 }}>
                    <Ionicons name="bed-outline" size={32} color="#64748B" />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 6 }}>
                      Standard Room Stay
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 2 }}>
                      Direct property reservation at standard base rate (${roomRate}/night).
                    </Text>
                  </View>
                )}

                {/* Price Breakdown Card */}
                <View style={styles.priceBreakdownCard}>
                  <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {(activeSelectedRoom?.room_type || "Standard Room")} ({nightsCount} nights x ${roomRate})
                    </Text>
                    <Text style={styles.breakdownVal}>${subtotal}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Taxes & fees (10%)</Text>
                    <Text style={styles.breakdownVal}>${taxes}</Text>
                  </View>
                  {claimedVoucher && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: "#10B981" }]}>
                        New user discount (-$15)
                      </Text>
                      <Text style={[styles.breakdownVal, { color: "#10B981" }]}>
                        -$15.00
                      </Text>
                    </View>
                  )}
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownRow}>
                    <Text style={styles.totalLabel}>Total Price</Text>
                    <Text style={styles.totalVal}>${finalTotal}</Text>
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Bottom Action Button: Reserve Room */}
              <View style={styles.sheetFooter}>
                <View>
                  <Text style={styles.sheetFooterTotal}>${finalTotal}</Text>
                  <Text style={styles.sheetFooterSub}>
                    {nightsCount} nights • All taxes included
                  </Text>
                </View>

                <Pressable style={styles.reserveBtn} onPress={handleReserveRoom}>
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                  <Text style={styles.reserveBtnText}>Reserve Room</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Floating AI Assistant */}
      <AiPill color={TRIP_BLUE} />
      {/* Bottom Nav */}
      <BottomNav active="Explore" color={TRIP_BLUE} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  quickLinksRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  quickLinkItem: {
    alignItems: "center",
    gap: 6,
  },
  quickLinkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 85, 242, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickLinkLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  bookingHeroCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  destinationInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  dateSelectorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  nightsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 85, 242, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  nightsBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0055F2",
  },
  guestsSelectorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  guestsInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guestsValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  benefitsBanner: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  benefitsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  benefitsSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  claimAllBtn: {
    backgroundColor: "rgba(0, 85, 242, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  claimAllBtnActive: {
    backgroundColor: "#10B981",
  },
  claimAllBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0055F2",
  },
  vouchersScroll: {
    flexDirection: "row",
  },
  voucherCard: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 3,
    borderLeftColor: "#0055F2",
  },
  voucherCardActive: {
    borderLeftColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  voucherDiscount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  voucherDesc: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  vibePillsRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  vibePill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vibePillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  vibePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  vibePillTextActive: {
    color: "#FFFFFF",
  },
  staysSection: {
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  hotelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  hotelImageWrapper: {
    height: 180,
    position: "relative",
  },
  hotelImage: {
    width: "100%",
    height: "100%",
  },
  hotelImageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  specialDealBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialDealText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  ratingBadgePill: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewsCountText: {
    color: "#CBD5E1",
    fontSize: 10,
  },
  hotelCardBody: {
    padding: 14,
  },
  hotelTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hotelName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  hotelLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  hotelLocationText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  amenitiesTagsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  amenityTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  amenityTagText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  hotelFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  startingFromLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  hotelPriceText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0055F2",
  },
  hotelPriceUnit: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  viewRoomsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0055F2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewRoomsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8,
  },
  quickNightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  quickNightChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickNightChipActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  quickNightChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  quickNightChipTextActive: {
    color: "#FFFFFF",
  },
  datesSummaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  dateSummaryCol: {
    alignItems: "center",
  },
  dateSummaryHeading: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },
  dateSummaryDate: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  modalApplyBtn: {
    backgroundColor: "#0055F2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepperSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  stepperControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  stepValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    width: 20,
    textAlign: "center",
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "88%",
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  bottomSheetHotelName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  bottomSheetLocation: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetDatesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sheetDatesText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  roomsListScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  selectRoomHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  roomCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    gap: 12,
  },
  roomCardActive: {
    borderColor: "#0055F2",
    backgroundColor: "rgba(0, 85, 242, 0.03)",
  },
  roomImageContainer: {
    width: 90,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  roomThumbnail: {
    width: "100%",
    height: "100%",
  },
  radioCircle: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#38BDF8",
  },
  roomDetailsCol: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  roomSpecs: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  roomDesc: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
    lineHeight: 15,
  },
  roomAmenitiesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  roomAmenityPill: {
    backgroundColor: "rgba(0, 85, 242, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roomAmenityText: {
    fontSize: 9,
    color: "#0055F2",
    fontWeight: "700",
  },
  roomPriceText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0055F2",
    marginTop: 6,
  },
  roomPriceSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  priceBreakdownCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  breakdownVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  totalVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0055F2",
  },
  sheetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  sheetFooterTotal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  sheetFooterSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0055F2",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  reserveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
