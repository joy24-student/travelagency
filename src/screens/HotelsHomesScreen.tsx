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
import { DEMO_USER_ID, FriendProfile } from "../services/repositories/friends";
import { messengerRepository, ConversationItem } from "../services/repositories/messenger";
import { DirectChatModal } from "../components/DirectChatModal";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#E5A93C"; // Luxury Gold Design Token
const TRIP_DARK_BLUE = "#121622"; // Obsidian Dark Design Token

export interface HostInfo {
  id: string;
  name: string;
  avatar: string;
  badge: string;
  rating: number;
  responseTime: string;
  responseRate: string;
  bio: string;
  reviewsCount: number;
}

export interface VacationRental {
  id: string;
  name: string;
  propertyType: string;
  location: string;
  city: string;
  country: string;
  rating: number;
  reviewsCount: number;
  isSuperhost: boolean;
  pricePerNight: number;
  cleaningFee: number;
  serviceFeePercent: number;
  deposit: number;
  image: string;
  galleryImages: string[];
  amenities: string[];
  specs: {
    guests: number;
    bedrooms: number;
    beds: number;
    baths: number;
    sqft: number;
  };
  host: HostInfo;
  description: string;
}

const AMENITY_FILTERS = [
  { label: "All Villas", key: "all", icon: "home-outline" as const },
  { label: "Private Pool", key: "Private Pool", icon: "water-outline" as const },
  { label: "Beachfront", key: "Beachfront", icon: "sunny-outline" as const },
  { label: "Full Kitchen", key: "Full Kitchen", icon: "restaurant-outline" as const },
  { label: "Fast Wi-Fi", key: "Fast Wi-Fi", icon: "wifi-outline" as const },
  { label: "Free Parking", key: "Free Parking", icon: "car-outline" as const },
];

export function HotelsHomesScreen() {
  const [rentals, setRentals] = useState<VacationRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAmenity, setSelectedAmenity] = useState<string>("all");
  const [claimedVoucher, setClaimedVoucher] = useState(false);

  // Selected Villa for Booking Bottom Sheet
  const [selectedVilla, setSelectedVilla] = useState<VacationRental | null>(null);

  // Direct Messenger Chat State
  const [activeChatConvo, setActiveChatConvo] = useState<ConversationItem | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Dates and Nights Configuration
  const [checkInDate, setCheckInDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  });
  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d;
  });
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Nights calculation
  const nightsCount = useMemo(() => {
    const diff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  // Guests Configuration
  const [guestsConfig, setGuestsConfig] = useState({
    adults: 2,
    children: 0,
  });
  const [showGuestsModal, setShowGuestsModal] = useState(false);

  // Load Inventory from Supabase 'hotels' Table
  useEffect(() => {
    let isMounted = true;

    async function fetchInventory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("hotels")
          .select("*, hotel_rooms(*)")
          .order("average_rating", { ascending: false });

        if (!error && data && data.length > 0 && isMounted) {
          // Merge Supabase hotels with Vacation Rental enhancements
          const dbMapped: VacationRental[] = data.map((h: any, idx: number) => {
            const fallbackHost: HostInfo = {
              id: h.id,
              name: `${h.name} Hospitality Team`,
              avatar: h.image_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
              badge: "Premier Host",
              rating: parseFloat(String(h.average_rating || 4.9)),
              responseTime: "Responds within an hour",
              responseRate: "99%",
              bio: h.description || "Dedicated premier hospitality hosts offering authentic local stays.",
              reviewsCount: h.total_reviews || 120,
            };
            const parsedAmenities: string[] = Array.isArray(h.amenities)
              ? h.amenities
              : ["Private Pool", "Beachfront", "Full Kitchen", "Fast Wi-Fi", "Free Parking"];

            // Ensure our key amenities are populated
            const fullAmenities = Array.from(
              new Set([
                ...parsedAmenities,
                idx % 2 === 0 ? "Private Pool" : "Full Kitchen",
                "Fast Wi-Fi",
                "Free Parking",
              ])
            );

            return {
              id: h.id,
              name: h.name,
              propertyType:
                h.name.toLowerCase().includes("resort") || h.name.toLowerCase().includes("pearl")
                  ? "Exclusive Resort Villa"
                  : "Luxury Vacation Estate",
              location: `${h.city}, ${h.country || "Bangladesh"}`,
              city: h.city || "Cox's Bazar",
              country: h.country || "Bangladesh",
              rating: parseFloat(String(h.average_rating || 4.9)),
              reviewsCount: h.total_reviews || 380,
              isSuperhost: true,
              pricePerNight: Math.round(parseFloat(String(h.base_price || 150))),
              cleaningFee: 35,
              serviceFeePercent: 0.10,
              deposit: 100,
              image:
                h.image_url ||
                (h.images && h.images[0]) ||
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
              galleryImages:
                h.images && h.images.length > 0
                  ? h.images
                  : [h.image_url || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"],
              amenities: fullAmenities,
              specs: {
                guests: 6,
                bedrooms: 3,
                beds: 4,
                baths: 3,
                sqft: 260,
              },
              host: fallbackHost,
              description:
                h.description ||
                "Full private villa retreat equipped with modern amenities, luxury bedding, high-speed connectivity, and scenic surroundings.",
            };
          });

          setRentals(dbMapped);
        } else if (isMounted) {
          setRentals([]);
        }
      } catch (err) {
        console.log("Error querying hotels from Supabase:", err);
        if (isMounted) setRentals([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInventory();

    const channel = supabase
      .channel(`homes-live-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels" }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter rentals by search query & selected amenity
  const filteredRentals = useMemo(() => {
    let list = [...rentals];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.propertyType.toLowerCase().includes(q)
      );
    }

    if (selectedAmenity !== "all") {
      const q = selectedAmenity.toLowerCase();
      list = list.filter((r) =>
        r.amenities.some((a) => a.toLowerCase().includes(q))
      );
    }

    return list;
  }, [rentals, searchQuery, selectedAmenity]);

  // Handle Claim Voucher
  const handleClaimVoucher = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimedVoucher(true);
    Alert.alert(
      "🎉 New User Discount Claimed",
      "$15 has been credited to your account and will be deducted at villa reservation checkout!"
    );
  };

  // Quick Night Setters
  const setNightsQuick = (nights: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextCheckOut = new Date(checkInDate);
    nextCheckOut.setDate(nextCheckOut.getDate() + nights);
    setCheckOutDate(nextCheckOut);
  };

  // Open Message Host Conversation
  const handleMessageHost = async (host: HostInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChatLoading(true);
    try {
      const convo = await messengerRepository.getOrCreateDirectConversation(
        DEMO_USER_ID,
        host.id
      );
      setActiveChatConvo(convo);
    } catch (err) {
      console.warn("Could not initiate conversation:", err);
      // Fallback navigation to messages tab
      router.push("/(tabs)/messages" as any);
    } finally {
      setChatLoading(false);
    }
  };

  // Calculate Price Breakdown for Selected Villa
  const priceBreakdown = useMemo(() => {
    if (!selectedVilla) {
      return {
        nightlyTotal: 0,
        cleaningFee: 0,
        serviceFee: 0,
        deposit: 0,
        voucherDiscount: 0,
        totalPayable: 0,
      };
    }

    const nightlyTotal = selectedVilla.pricePerNight * nightsCount;
    const cleaningFee = selectedVilla.cleaningFee;
    const serviceFee = Math.round(nightlyTotal * selectedVilla.serviceFeePercent);
    const deposit = selectedVilla.deposit;
    const voucherDiscount = claimedVoucher ? 15 : 0;
    const totalPayable = Math.max(
      0,
      nightlyTotal + cleaningFee + serviceFee + deposit - voucherDiscount
    );

    return {
      nightlyTotal,
      cleaningFee,
      serviceFee,
      deposit,
      voucherDiscount,
      totalPayable,
    };
  }, [selectedVilla, nightsCount, claimedVoucher]);

  // Handle Reserve / Book Villa
  const handleBookVilla = () => {
    if (!selectedVilla) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const v = selectedVilla;
    setSelectedVilla(null);

    router.push({
      pathname: "/screens/payments" as any,
      params: {
        hotelId: v.id,
        hotelName: v.name,
        roomType: v.propertyType,
        amount: String(priceBreakdown.totalPayable),
        reference: `Vacation Rental: ${v.name}`,
        checkIn: checkInDate.toISOString().split("T")[0],
        checkOut: checkOutDate.toISOString().split("T")[0],
        nights: String(nightsCount),
        guests: `${guestsConfig.adults} Adults, ${guestsConfig.children} Children`,
        cleaningFee: String(v.cleaningFee),
        deposit: String(v.deposit),
      },
    });
  };

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================================= */}
        {/* 1. HERO SECTION WITH VILLA OVERLAY */}
        {/* ================================================================= */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200",
            }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.75)"]}
            style={styles.heroOverlay}
          >
            {/* Top Navigation */}
            <View style={styles.headerRow}>
              <Pressable
                style={styles.backCircleBtn}
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={styles.headerRight}>
                <Pressable
                  style={styles.headerIconBtn}
                  onPress={() => router.push("/(tabs)/messages" as any)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={styles.headerIconBtn}
                  onPress={() => router.push("/screens/rewards" as any)}
                >
                  <Ionicons name="gift-outline" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Title & Badge */}
            <View style={styles.titleWrapper}>
              <View style={styles.heroPillBadge}>
                <Ionicons name="home" size={13} color="#FFFFFF" />
                <Text style={styles.heroPillText}>VACATION HOMES & VILLAS</Text>
              </View>
              <Text style={styles.heroTitle}>Luxury Private Stays</Text>
              <Text style={styles.heroSubtitle}>
                Villas, beachfront chalets & private homes with superhosts
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ================================================================= */}
        {/* 2. OVERLAPPING SEARCH & CONFIGURATION CARD */}
        {/* ================================================================= */}
        <View style={styles.searchCardContainer}>
          {/* Destination / Keyword Input */}
          <View style={styles.inputRow}>
            <Ionicons name="search" size={20} color={TRIP_BLUE} />
            <TextInput
              style={styles.textInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by villa name, city or location"
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          <View style={styles.hDivider} />

          {/* Dates & Nights Selector */}
          <Pressable
            style={styles.inputRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDatePickerModal(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={TRIP_BLUE} />
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>CHECK-IN & CHECK-OUT</Text>
              <Text style={styles.pickerText}>
                {checkInDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                {checkOutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                · <Text style={{ color: TRIP_BLUE, fontWeight: "700" }}>{nightsCount} {nightsCount === 1 ? "night" : "nights"}</Text>
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>

          <View style={styles.hDivider} />

          {/* Guests Selector */}
          <Pressable
            style={styles.inputRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowGuestsModal(true);
            }}
          >
            <Ionicons name="people-outline" size={20} color={TRIP_BLUE} />
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>GUESTS & PARTY</Text>
              <Text style={styles.pickerText}>
                {guestsConfig.adults} Adults
                {guestsConfig.children > 0 ? `, ${guestsConfig.children} Children` : " · Entire Home"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* ================================================================= */}
        {/* 3. INTERACTIVE AMENITY FILTER PILLS */}
        {/* ================================================================= */}
        <View style={styles.amenitySection}>
          <View style={styles.amenityHeaderRow}>
            <Text style={styles.amenityHeaderTitle}>Filter by Amenity</Text>
            <Text style={styles.amenityCountText}>
              {filteredRentals.length} {filteredRentals.length === 1 ? "villa" : "villas"} found
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.amenityPillsRow}
          >
            {AMENITY_FILTERS.map((f) => {
              const active = selectedAmenity === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[styles.amenityPill, active && styles.amenityPillActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAmenity(f.key);
                  }}
                >
                  <Ionicons
                    name={f.icon}
                    size={15}
                    color={active ? "#FFFFFF" : "#475569"}
                  />
                  <Text
                    style={[
                      styles.amenityPillText,
                      active && styles.amenityPillTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ================================================================= */}
        {/* 4. NEW USER DISCOUNT & VOUCHERS BANNER */}
        {/* ================================================================= */}
        <View style={styles.benefitsBanner}>
          <View style={styles.benefitsHeader}>
            <View style={styles.benefitsTitleCol}>
              <View style={styles.voucherTag}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.voucherTagText}>EXCLUSIVE OFFER</Text>
              </View>
              <Text style={styles.benefitsTitle}>New Host & Guest Discount</Text>
            </View>
            <Pressable
              style={[styles.claimBtn, claimedVoucher && styles.claimBtnActive]}
              onPress={handleClaimVoucher}
            >
              <Text style={styles.claimBtnText}>
                {claimedVoucher ? "Claimed ✓" : "Claim $15 Off"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.benefitsDesc}>
            Instant $15 coupon automatically applied at checkout for any private villa or vacation home reservation.
          </Text>
        </View>

        {/* ================================================================= */}
        {/* 5. VACATION HOMES & VILLAS LIST */}
        {/* ================================================================= */}
        <View style={styles.villasSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              {selectedAmenity === "all"
                ? "Handpicked Luxury Villas"
                : `${selectedAmenity} Stays`}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={TRIP_BLUE}
              style={{ marginVertical: 36 }}
            />
          ) : filteredRentals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="home-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No vacation rentals found</Text>
              <Text style={styles.emptySubtitle}>
                Try clearing your search or switching amenity filters
              </Text>
              <Pressable
                style={styles.resetFilterBtn}
                onPress={() => {
                  setSelectedAmenity("all");
                  setSearchQuery("");
                }}
              >
                <Text style={styles.resetFilterBtnText}>Show All Villas</Text>
              </Pressable>
            </View>
          ) : (
            filteredRentals.map((villa) => {
              return (
                <View key={villa.id} style={styles.villaCard}>
                  {/* Hero Image & Badges */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedVilla(villa);
                    }}
                  >
                    <View style={styles.villaImageContainer}>
                      <Image source={{ uri: villa.image }} style={styles.villaImage} />
                      <LinearGradient
                        colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.7)"]}
                        style={styles.imageOverlay}
                      />

                      {/* Top Badges */}
                      <View style={styles.topBadgesRow}>
                        {villa.isSuperhost && (
                          <View style={styles.superhostBadge}>
                            <Ionicons name="medal" size={12} color="#FFFFFF" />
                            <Text style={styles.superhostBadgeText}>SUPERHOST</Text>
                          </View>
                        )}
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.ratingText}>{villa.rating.toFixed(2)}</Text>
                          <Text style={styles.ratingReviews}>({villa.reviewsCount})</Text>
                        </View>
                      </View>

                      {/* Bottom Image Specs */}
                      <View style={styles.bottomImageDetails}>
                        <Text style={styles.imagePropertyType}>{villa.propertyType}</Text>
                        <Text style={styles.imageSpecsText}>
                          {villa.specs.guests} guests · {villa.specs.bedrooms} bedrooms · {villa.specs.baths} baths
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* Body Content */}
                  <View style={styles.villaCardBody}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedVilla(villa);
                      }}
                    >
                      <Text style={styles.villaName}>{villa.name}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={14} color={TRIP_BLUE} />
                        <Text style={styles.locationText}>{villa.location}</Text>
                      </View>
                    </Pressable>

                    {/* Amenity Badges */}
                    <View style={styles.cardAmenitiesRow}>
                      {villa.amenities.slice(0, 4).map((a) => (
                        <View key={a} style={styles.cardAmenityPill}>
                          <Text style={styles.cardAmenityText}>{a}</Text>
                        </View>
                      ))}
                      {villa.amenities.length > 4 && (
                        <View style={styles.cardAmenityPillMore}>
                          <Text style={styles.cardAmenityTextMore}>
                            +{villa.amenities.length - 4} more
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.divider} />

                    {/* =================================================== */}
                    {/* HOST INFORMATION BLOCK WITH DIRECT MESSAGING */}
                    {/* =================================================== */}
                    <View style={styles.hostBlock}>
                      <View style={styles.hostInfoLeft}>
                        <View style={styles.hostAvatarWrapper}>
                          <Image
                            source={{ uri: villa.host.avatar }}
                            style={styles.hostAvatar}
                          />
                          <View style={styles.hostBadgeDot}>
                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                          </View>
                        </View>
                        <View style={styles.hostTextCol}>
                          <Text style={styles.hostName}>
                            Hosted by {villa.host.name}
                          </Text>
                          <Text style={styles.hostMetaText}>
                            ⚡ {villa.host.responseTime} · {villa.host.responseRate}
                          </Text>
                        </View>
                      </View>

                      {/* Direct Message Host Shortcut */}
                      <Pressable
                        style={styles.messageHostBtn}
                        onPress={() => handleMessageHost(villa.host)}
                      >
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={14}
                          color={TRIP_BLUE}
                        />
                        <Text style={styles.messageHostBtnText}>Message Host</Text>
                      </Pressable>
                    </View>

                    <View style={styles.divider} />

                    {/* Price & Action Row */}
                    <View style={styles.priceActionRow}>
                      <View>
                        <View style={styles.priceContainer}>
                          <Text style={styles.priceNumber}>
                            ${villa.pricePerNight}
                          </Text>
                          <Text style={styles.priceUnit}> / night</Text>
                        </View>
                        <Text style={styles.priceTotalEstimate}>
                          ${villa.pricePerNight * nightsCount} for {nightsCount} nights
                        </Text>
                      </View>

                      <Pressable
                        style={styles.reserveBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedVilla(villa);
                        }}
                      >
                        <Text style={styles.reserveBtnText}>View & Reserve</Text>
                        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating AI Pill & Bottom Navigation */}
      <AiPill color={TRIP_BLUE} />
      <BottomNav active="Home" color={TRIP_BLUE} />

      {/* =================================================================== */}
      {/* MODAL 1: INTERACTIVE VILLA RESERVATION & PRICE BREAKDOWN BOTTOM SHEET */}
      {/* =================================================================== */}
      <Modal
        visible={selectedVilla !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVilla(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContainer}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            {selectedVilla && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
                {/* Header with Close */}
                <View style={styles.sheetHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetPropertyType}>
                      {selectedVilla.propertyType}
                    </Text>
                    <Text style={styles.sheetTitle} numberOfLines={2}>
                      {selectedVilla.name}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedVilla(null)}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </Pressable>
                </View>

                {/* Hero Villa Image */}
                <Image
                  source={{ uri: selectedVilla.image }}
                  style={styles.sheetHeroImage}
                />

                {/* Specs Pill Summary */}
                <View style={styles.sheetSpecsBar}>
                  <View style={styles.specItem}>
                    <Ionicons name="people-outline" size={18} color={TRIP_BLUE} />
                    <Text style={styles.specText}>
                      {selectedVilla.specs.guests} Guests
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Ionicons name="bed-outline" size={18} color={TRIP_BLUE} />
                    <Text style={styles.specText}>
                      {selectedVilla.specs.bedrooms} Bedrooms
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Ionicons name="water-outline" size={18} color={TRIP_BLUE} />
                    <Text style={styles.specText}>
                      {selectedVilla.specs.baths} Baths
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Ionicons name="cube-outline" size={18} color={TRIP_BLUE} />
                    <Text style={styles.specText}>
                      {selectedVilla.specs.sqft} m²
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.sheetDescription}>
                  {selectedVilla.description}
                </Text>

                {/* Host Detailed Card with Direct Messaging Shortcut */}
                <View style={styles.sheetHostCard}>
                  <View style={styles.sheetHostTop}>
                    <Image
                      source={{ uri: selectedVilla.host.avatar }}
                      style={styles.sheetHostAvatar}
                    />
                    <View style={styles.sheetHostDetails}>
                      <View style={styles.sheetHostNameRow}>
                        <Text style={styles.sheetHostName}>
                          Hosted by {selectedVilla.host.name}
                        </Text>
                        {selectedVilla.isSuperhost && (
                          <View style={styles.superhostMiniPill}>
                            <Text style={styles.superhostMiniText}>Superhost</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.sheetHostStats}>
                        ★ {selectedVilla.host.rating} ({selectedVilla.host.reviewsCount} reviews) · {selectedVilla.host.responseTime}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sheetHostBio}>{selectedVilla.host.bio}</Text>

                  <View style={styles.sheetHostActions}>
                    <Pressable
                      style={styles.sheetMessageHostBtn}
                      onPress={() => {
                        const h = selectedVilla.host;
                        setSelectedVilla(null);
                        handleMessageHost(h);
                      }}
                    >
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.sheetMessageHostBtnText}>
                        Message Host Directly
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.sheetOpenMessengerBtn}
                      onPress={() => {
                        setSelectedVilla(null);
                        router.push("/(tabs)/messages" as any);
                      }}
                    >
                      <Ionicons name="paper-plane-outline" size={16} color={TRIP_BLUE} />
                      <Text style={styles.sheetOpenMessengerBtnText}>
                        Open Messenger
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Dates Configuration Box */}
                <View style={styles.datesConfigBox}>
                  <View style={styles.datesConfigHeader}>
                    <Text style={styles.datesConfigTitle}>Select Stay Dates</Text>
                    <Text style={styles.datesNightsBadge}>
                      {nightsCount} {nightsCount === 1 ? "Night" : "Nights"} Selected
                    </Text>
                  </View>

                  {/* Quick Nights Chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickNightsRow}
                  >
                    {[1, 2, 3, 5, 7, 14].map((n) => (
                      <Pressable
                        key={n}
                        style={[
                          styles.nightChip,
                          nightsCount === n && styles.nightChipActive,
                        ]}
                        onPress={() => setNightsQuick(n)}
                      >
                        <Text
                          style={[
                            styles.nightChipText,
                            nightsCount === n && styles.nightChipTextActive,
                          ]}
                        >
                          {n} {n === 1 ? "night" : "nights"}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={styles.datePickerRow}>
                    <View style={styles.dateCol}>
                      <Text style={styles.dateColLabel}>CHECK-IN</Text>
                      <Text style={styles.dateColValue}>
                        {checkInDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
                    <View style={styles.dateCol}>
                      <Text style={styles.dateColLabel}>CHECK-OUT</Text>
                      <Text style={styles.dateColValue}>
                        {checkOutDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* =================================================== */}
                {/* 4. INTERACTIVE PRICE BREAKDOWN CARD */}
                {/* =================================================== */}
                <View style={styles.priceBreakdownCard}>
                  <View style={styles.priceBreakdownHeader}>
                    <Ionicons name="receipt-outline" size={18} color={TRIP_BLUE} />
                    <Text style={styles.priceBreakdownTitle}>Price Breakdown</Text>
                  </View>

                  {/* Line Item: Nightly Rate */}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      ${selectedVilla.pricePerNight} × {nightsCount} nights
                    </Text>
                    <Text style={styles.breakdownValue}>
                      ${priceBreakdown.nightlyTotal}
                    </Text>
                  </View>

                  {/* Line Item: Cleaning Fee */}
                  <View style={styles.breakdownRow}>
                    <View style={styles.labelWithTooltip}>
                      <Text style={styles.breakdownLabel}>Cleaning fee</Text>
                      <Ionicons
                        name="sparkles-outline"
                        size={12}
                        color="#64748B"
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      ${priceBreakdown.cleaningFee}
                    </Text>
                  </View>

                  {/* Line Item: Service Fee */}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform service fee (10%)</Text>
                    <Text style={styles.breakdownValue}>
                      ${priceBreakdown.serviceFee}
                    </Text>
                  </View>

                  {/* Line Item: Refundable Security Deposit */}
                  <View style={styles.breakdownRow}>
                    <View style={styles.labelWithTooltip}>
                      <Text style={styles.breakdownLabel}>
                        Refundable security deposit
                      </Text>
                    </View>
                    <Text style={styles.breakdownValue}>
                      ${priceBreakdown.deposit}
                    </Text>
                  </View>

                  {/* Line Item: Promo Voucher Discount */}
                  {claimedVoucher && (
                    <View style={styles.breakdownRow}>
                      <View style={styles.labelWithTooltip}>
                        <Ionicons name="gift" size={13} color="#10B981" />
                        <Text
                          style={[
                            styles.breakdownLabel,
                            { color: "#10B981", fontWeight: "700", marginLeft: 4 },
                          ]}
                        >
                          New Member Voucher Discount
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.breakdownValue,
                          { color: "#10B981", fontWeight: "700" },
                        ]}
                      >
                        -${priceBreakdown.voucherDiscount}
                      </Text>
                    </View>
                  )}

                  <View style={styles.breakdownDivider} />

                  {/* Total Payable Today */}
                  <View style={styles.breakdownTotalRow}>
                    <View>
                      <Text style={styles.breakdownTotalLabel}>Total Payable</Text>
                      <Text style={styles.breakdownTotalSub}>Includes all fees & taxes</Text>
                    </View>
                    <Text style={styles.breakdownTotalAmount}>
                      ${priceBreakdown.totalPayable}
                    </Text>
                  </View>

                  {/* Security Deposit Protection Guarantee */}
                  <View style={styles.depositShieldBanner}>
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <Text style={styles.depositShieldText}>
                      Security deposit is 100% refundable and returned automatically 48h after checkout inspection.
                    </Text>
                  </View>
                </View>

                {/* Reserve / Book Villa CTA Button */}
                <Pressable
                  style={styles.bookVillaBtn}
                  onPress={handleBookVilla}
                >
                  <Text style={styles.bookVillaBtnText}>
                    Book Villa · ${priceBreakdown.totalPayable}
                  </Text>
                  <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                </Pressable>

                <Text style={styles.guaranteeNote}>
                  Instant confirmation · Free cancellation up to 48 hours before check-in
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 2: INTERACTIVE DATES PICKER MODAL */}
      {/* =================================================================== */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Select Travel Dates</Text>
                <Text style={styles.modalSubTitle}>Choose check-in and check-out</Text>
              </View>
              <Pressable onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Quick Nights Chips */}
            <View style={{ marginVertical: 14 }}>
              <Text style={styles.quickNightsHeader}>Quick Select Duration:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickNightsRow}
              >
                {[1, 2, 3, 5, 7, 14].map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.nightChip,
                      nightsCount === n && styles.nightChipActive,
                    ]}
                    onPress={() => setNightsQuick(n)}
                  >
                    <Text
                      style={[
                        styles.nightChipText,
                        nightsCount === n && styles.nightChipTextActive,
                      ]}
                    >
                      {n} {n === 1 ? "night" : "nights"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Stepper Controls */}
            <View style={styles.dateStepperBox}>
              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading}>Check-in Date</Text>
                <Text style={styles.dateSummaryDate}>
                  {checkInDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <View style={styles.stepperSmallRow}>
                  <Pressable
                    style={styles.stepBtnSmall}
                    onPress={() => {
                      const next = new Date(checkInDate);
                      next.setDate(next.getDate() - 1);
                      if (next >= new Date()) setCheckInDate(next);
                    }}
                  >
                    <Ionicons name="remove" size={14} color="#0F172A" />
                  </Pressable>
                  <Text style={styles.stepBtnSmallLabel}>Shift Day</Text>
                  <Pressable
                    style={styles.stepBtnSmall}
                    onPress={() => {
                      const next = new Date(checkInDate);
                      next.setDate(next.getDate() + 1);
                      if (next < checkOutDate) setCheckInDate(next);
                    }}
                  >
                    <Ionicons name="add" size={14} color="#0F172A" />
                  </Pressable>
                </View>
              </View>

              <Ionicons name="arrow-forward" size={20} color={TRIP_BLUE} />

              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading}>Check-out Date</Text>
                <Text style={styles.dateSummaryDate}>
                  {checkOutDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <View style={styles.stepperSmallRow}>
                  <Pressable
                    style={styles.stepBtnSmall}
                    onPress={() => {
                      const next = new Date(checkOutDate);
                      next.setDate(next.getDate() - 1);
                      if (next > checkInDate) setCheckOutDate(next);
                    }}
                  >
                    <Ionicons name="remove" size={14} color="#0F172A" />
                  </Pressable>
                  <Text style={styles.stepBtnSmallLabel}>Shift Day</Text>
                  <Pressable
                    style={styles.stepBtnSmall}
                    onPress={() => {
                      const next = new Date(checkOutDate);
                      next.setDate(next.getDate() + 1);
                      setCheckOutDate(next);
                    }}
                  >
                    <Ionicons name="add" size={14} color="#0F172A" />
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.modalApplyBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={styles.modalApplyBtnText}>Apply {nightsCount} Nights</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 3: GUESTS CONFIGURATION MODAL */}
      {/* =================================================================== */}
      <Modal
        visible={showGuestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGuestsModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Guests & Travel Party</Text>
                <Text style={styles.modalSubTitle}>Configure villa occupants</Text>
              </View>
              <Pressable onPress={() => setShowGuestsModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Adults Stepper */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>Adults</Text>
                <Text style={styles.stepperSub}>Age 13 and above</Text>
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
                      adults: Math.min(12, c.adults + 1),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

            {/* Children Stepper */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>Children</Text>
                <Text style={styles.stepperSub}>Ages 0 to 12</Text>
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
                      children: Math.min(8, c.children + 1),
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
      {/* MODAL 4: DIRECT CHAT WITH HOST MODAL */}
      {/* =================================================================== */}
      {activeChatConvo && (
        <DirectChatModal
          conversation={activeChatConvo}
          currentUserId={DEMO_USER_ID}
          onClose={() => setActiveChatConvo(null)}
          onOpenProfile={(profile: FriendProfile) => {
            setActiveChatConvo(null);
            router.push({
              pathname: "/screens/user-profile" as any,
              params: { userId: profile.id },
            });
          }}
          onStartCall={(profile: FriendProfile, callType: "audio" | "video") => {
            setActiveChatConvo(null);
            router.push({
              pathname: "/screens/call" as any,
              params: {
                callType,
                targetUserId: profile.id,
                targetName: profile.display_name,
                targetAvatar: profile.avatar_url,
                callerId: DEMO_USER_ID,
              },
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 30,
  },

  /* Hero Section */
  heroContainer: {
    height: 270,
    width: "100%",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: {
    marginBottom: 44,
  },
  heroPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: TRIP_BLUE,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },

  /* Search Card */
  searchCardContainer: {
    marginHorizontal: 16,
    marginTop: -32,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  hDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  /* Amenity Filters */
  amenitySection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  amenityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  amenityHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  amenityCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  amenityPillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  amenityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  amenityPillActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  amenityPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  amenityPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* Benefits Banner */
  benefitsBanner: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  benefitsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  benefitsTitleCol: {
    flex: 1,
  },
  voucherTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  voucherTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TRIP_DARK_BLUE,
  },
  benefitsDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 6,
    lineHeight: 17,
  },
  claimBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  claimBtnActive: {
    backgroundColor: "#10B981",
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Villas Section */
  villasSection: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  sectionHeaderRow: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  resetFilterBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  resetFilterBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Villa Card */
  villaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  villaImageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  villaImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 12,
  },
  topBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  superhostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  superhostBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingReviews: {
    fontSize: 11,
    color: "#64748B",
  },
  bottomImageDetails: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  imagePropertyType: {
    color: "#F1F5F9",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  imageSpecsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },

  /* Villa Card Body */
  villaCardBody: {
    padding: 16,
  },
  villaName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  cardAmenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  cardAmenityPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardAmenityText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  cardAmenityPillMore: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardAmenityTextMore: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },

  /* Host Block inside Card */
  hostBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  hostAvatarWrapper: {
    position: "relative",
  },
  hostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  hostBadgeDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    backgroundColor: TRIP_BLUE,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  hostTextCol: {
    flex: 1,
  },
  hostName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  hostMetaText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  messageHostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  messageHostBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: TRIP_BLUE,
  },

  /* Price & Action Row */
  priceActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: TRIP_BLUE,
  },
  priceUnit: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  priceTotalEstimate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 2,
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  reserveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Bottom Sheet Modal */
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingBottom: 24,
  },
  sheetHandleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sheetPropertyType: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeroImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    resizeMode: "cover",
  },
  sheetSpecsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  specItem: {
    alignItems: "center",
    gap: 3,
  },
  specText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  specDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#CBD5E1",
  },
  sheetDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginTop: 14,
  },

  /* Sheet Host Card */
  sheetHostCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetHostTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetHostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: TRIP_BLUE,
  },
  sheetHostDetails: {
    flex: 1,
  },
  sheetHostNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sheetHostName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  superhostMiniPill: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  superhostMiniText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  sheetHostStats: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  sheetHostBio: {
    fontSize: 12,
    color: "#475569",
    marginTop: 10,
    lineHeight: 17,
  },
  sheetHostActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  sheetMessageHostBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sheetMessageHostBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  sheetOpenMessengerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  sheetOpenMessengerBtnText: {
    color: TRIP_BLUE,
    fontSize: 12,
    fontWeight: "800",
  },

  /* Dates Config Box inside sheet */
  datesConfigBox: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  datesConfigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  datesConfigTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  datesNightsBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  quickNightsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  nightChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  nightChipActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  nightChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  nightChipTextActive: {
    color: "#FFFFFF",
  },
  datePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  dateCol: {
    alignItems: "center",
  },
  dateColLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  dateColValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  /* Price Breakdown Card */
  priceBreakdownCard: {
    marginTop: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceBreakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  priceBreakdownTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  labelWithTooltip: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  breakdownTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  breakdownTotalSub: {
    fontSize: 11,
    color: "#64748B",
  },
  breakdownTotalAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: TRIP_BLUE,
  },
  depositShieldBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  depositShieldText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
    lineHeight: 15,
  },

  /* Reserve Button CTA */
  bookVillaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookVillaBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  guaranteeNote: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },

  /* Generic Modal Card */
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
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
  quickNightsHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
  },
  dateStepperBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 10,
  },
  dateSummaryCol: {
    alignItems: "center",
  },
  dateSummaryHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  dateSummaryDate: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
    marginBottom: 8,
  },
  stepperSmallRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtnSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnSmallLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  modalApplyBtn: {
    backgroundColor: TRIP_BLUE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Stepper Row in Guests Modal */
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
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  stepperControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 20,
    textAlign: "center",
  },
});
