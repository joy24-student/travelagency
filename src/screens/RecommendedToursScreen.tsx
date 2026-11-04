import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { supabase } from "../utils/supabase";
import { searchRepository } from "../services/repositories/search";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#287dfa";

// Verified community guides with valid IDs from community_profiles table
const GUIDES_CATALOG = [
  {
    id: "0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9", // Rahat Galiv
    name: "Rahat Galiv",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
    role: "Local Nature & Heritage Expert",
    badge: "Verified Local Guide",
    rating: 4.98,
    toursCount: 142,
    languages: "English, Bengali, Hindi",
  },
  {
    id: "5e491c34-50b4-4d2a-8cac-d09fddd7745c", // Elvis Mittra
    name: "Elvis Mittra",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
    role: "Senior Expeditions & Culture Lead",
    badge: "Top Rated Expert",
    rating: 4.96,
    toursCount: 198,
    languages: "English, Mandarin, Cantonese",
  },
  {
    id: "fe097f5f-44ea-4e66-a738-1208b6991d74", // Tania Travels
    name: "Tania Travels",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    role: "Island & Coastal Trek Specialist",
    badge: "Certified Adventurer",
    rating: 4.94,
    toursCount: 115,
    languages: "English, Bengali, French",
  },
  {
    id: "4ba914d5-181f-44e8-a47c-8b1e57045791", // Siam Wanderer
    name: "Siam Wanderer",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
    role: "Urban Architecture & History Guide",
    badge: "Heritage Scout",
    rating: 4.92,
    toursCount: 88,
    languages: "English, Thai, Bengali",
  },
];

export interface TourGuide {
  id: string;
  name: string;
  avatar: string;
  role: string;
  badge: string;
  rating: number;
  toursCount: number;
  languages?: string;
}

export interface TourItem {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  destination_city: string;
  destination_country: string;
  duration_text: string;
  duration_days: number;
  category: string;
  price: number;
  original_price: number;
  rating: number;
  reviews_count: number;
  image: string;
  highlights: string[];
  included_services: string[];
  guide: TourGuide;
}

export interface DigitalPass {
  passId: string;
  tourId: string;
  tourTitle: string;
  destination: string;
  date: string;
  timeSlotId: "morning" | "afternoon";
  timeSlotLabel: string;
  timeSlotHours: string;
  groupSize: number;
  basePrice: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  pricePerPerson: number;
  guide: TourGuide;
  inclusions: string[];
  qrPayload: string;
  issuedAt: string;
}

function parseArrayField(val: any, fallback: string[]): string[] {
  if (Array.isArray(val) && val.length > 0) {
    return val.map((s) => String(s).trim());
  }
  if (typeof val === "string" && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => String(s).trim());
      }
    } catch {
      // not JSON
    }
    if (val.includes("·")) {
      return val.split("·").map((s) => s.trim()).filter(Boolean);
    }
    if (val.includes(",")) {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [val.trim()];
  }
  return fallback;
}

export function RecommendedToursScreen() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [tours, setTours] = useState<TourItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-tour booking selections
  const [selectedSlots, setSelectedSlots] = useState<Record<string, "morning" | "afternoon">>({});
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>({});

  // Digital Tour Pass Modal State
  const [digitalPass, setDigitalPass] = useState<DigitalPass | null>(null);
  const [passModalVisible, setPassModalVisible] = useState(false);

  useEffect(() => {
    async function loadTours() {
      setLoading(true);
      try {
        // 1. Fetch from Supabase tours table
        const { data, error } = await supabase
          .from("tours")
          .select("*")
          .order("rating", { ascending: false });

        if (error) {
          console.log("Supabase tours fetch error:", error.message);
        }

        if (data && data.length > 0) {
          const mappedTours: TourItem[] = data.map((item: any, idx: number) => {
            const guideCatalogItem = GUIDES_CATALOG[idx % GUIDES_CATALOG.length];

            const assignedGuide: TourGuide = {
              id: guideCatalogItem.id,
              name: item.guide_name || guideCatalogItem.name,
              avatar: item.guide_image_url || guideCatalogItem.avatar,
              role: item.guide_bio || guideCatalogItem.role,
              badge: guideCatalogItem.badge,
              rating: guideCatalogItem.rating,
              toursCount: guideCatalogItem.toursCount,
              languages: guideCatalogItem.languages,
            };

            const parsedHighlights = parseArrayField(
              item.highlights,
              ["Scenic Viewpoint", "Historic Center", "Guided Walk"]
            );

            const parsedInclusions = parseArrayField(
              item.included_services,
              ["Expert Guide", "Entry Tickets", "Transportation"]
            );

            const durationText =
              item.duration_text ||
              (item.duration_days
                ? `${item.duration_days} Day${item.duration_days > 1 ? "s" : ""}`
                : "Full Day");

            const priceNum = Number(item.price) || 99;
            const originalPriceNum =
              Number(item.original_price) || Math.round(priceNum * 1.15);

            let mainImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800";
            if (Array.isArray(item.image_urls) && item.image_urls[0]) {
              mainImage = item.image_urls[0];
            } else if (typeof item.image_url === "string" && item.image_url) {
              mainImage = item.image_url;
            }

            return {
              id: item.id || `tour-${idx}`,
              title: item.title || "Adventure Tour",
              slug: item.slug || `tour-${idx}`,
              description: item.description || "Exciting guided tour with unforgettable experiences.",
              destination_city: item.destination_city || "Dhaka",
              destination_country: item.destination_country || "Bangladesh",
              duration_text: durationText,
              duration_days: item.duration_days || 1,
              category: item.category || "Adventure",
              price: priceNum,
              original_price: originalPriceNum,
              rating: Number(item.rating) || 4.8,
              reviews_count: Number(item.reviews_count) || 25,
              image: mainImage,
              highlights: parsedHighlights,
              included_services: parsedInclusions,
              guide: assignedGuide,
            };
          });

          setTours(mappedTours);
        } else {
          setTours([]);
        }
      } catch (err) {
        console.warn("Error loading tour inventory:", err);
        setTours([]);
      } finally {
        setLoading(false);
      }
    }

    loadTours();

    const channel = supabase
      .channel(`tours-live-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
        loadTours();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter pills
  const filterCategories = ["All", "Private Tours", "Cultural Tour", "Eco Adventure", "Family Special"];

  const filteredTours = useMemo(() => {
    if (activeFilter === "All") return tours;
    return tours.filter((t) => t.category === activeFilter);
  }, [tours, activeFilter]);

  // Slot handlers
  const getSelectedSlot = (tourId: string): "morning" | "afternoon" => {
    return selectedSlots[tourId] || "morning";
  };

  const handleSelectSlot = (tourId: string, slot: "morning" | "afternoon") => {
    Haptics.selectionAsync();
    setSelectedSlots((prev) => ({ ...prev, [tourId]: slot }));
  };

  // Group size handlers & discount calculations
  const getGroupSize = (tourId: string): number => {
    return groupSizes[tourId] || 1;
  };

  const handleGroupSizeChange = (tourId: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGroupSizes((prev) => {
      const current = prev[tourId] || 1;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [tourId]: next };
    });
  };

  const calculatePricing = (basePrice: number, size: number) => {
    const subtotal = basePrice * size;
    // Group discount rules:
    // 1 person: 0%
    // 2 persons: 5%
    // 3-4 persons: 10%
    // 5+ persons: 15%
    let discountPercent = 0;
    if (size >= 5) {
      discountPercent = 15;
    } else if (size >= 3) {
      discountPercent = 10;
    } else if (size === 2) {
      discountPercent = 5;
    }

    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const totalAmount = subtotal - discountAmount;
    const pricePerPerson = Math.round(totalAmount / size);

    return {
      subtotal,
      discountPercent,
      discountAmount,
      totalAmount,
      pricePerPerson,
    };
  };

  // Guide links: Profile, Audio call, Video call
  const handleOpenGuideProfile = (guideId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/screens/user-profile" as any,
      params: { userId: guideId },
    });
  };

  const handleLaunchCall = (callType: "audio" | "video", guide: TourGuide) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: "/screens/call" as any,
      params: {
        callType,
        targetUserId: guide.id,
        targetName: guide.name,
        targetAvatar: guide.avatar,
      },
    });
  };

  // Book tour & generate digital tour pass
  const handleBookTour = (tour: TourItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const slot = getSelectedSlot(tour.id);
    const size = getGroupSize(tour.id);
    const pricing = calculatePricing(tour.price, size);

    const slotLabel = slot === "morning" ? "Morning Tour 09:00 AM" : "Afternoon Tour 02:00 PM";
    const slotHours = slot === "morning" ? "09:00 AM - 01:00 PM" : "02:00 PM - 06:00 PM";

    const randomPassCode = Math.floor(100000 + Math.random() * 900000);
    const passId = `TP-2026-${randomPassCode}`;

    const newPass: DigitalPass = {
      passId,
      tourId: tour.id,
      tourTitle: tour.title,
      destination: `${tour.destination_city}, ${tour.destination_country}`,
      date: "Tomorrow, Oct 12, 2026",
      timeSlotId: slot,
      timeSlotLabel: slotLabel,
      timeSlotHours: slotHours,
      groupSize: size,
      basePrice: tour.price,
      subtotal: pricing.subtotal,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      pricePerPerson: pricing.pricePerPerson,
      guide: tour.guide,
      inclusions: tour.included_services,
      qrPayload: JSON.stringify({
        passId,
        tour: tour.title,
        slot: slotLabel,
        guests: size,
        total: pricing.totalAmount,
        guide: tour.guide.name,
      }),
      issuedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    setDigitalPass(newPass);
    setPassModalVisible(true);
  };

  // Direct navigation from pass to payments
  const handleProceedToPayment = (pass: DigitalPass) => {
    setPassModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/screens/payments" as any,
      params: {
        amount: pass.totalAmount.toString(),
        reference: `Tour Pass #${pass.passId}: ${pass.tourTitle}`,
        tourTitle: pass.tourTitle,
        passId: pass.passId,
        timeSlot: pass.timeSlotLabel,
        groupSize: pass.groupSize.toString(),
        guideName: pass.guide.name,
      },
    });
  };

  const handleSharePass = async (pass: DigitalPass) => {
    try {
      await Share.share({
        message: `🎫 Official Trip.com Tour Pass #${pass.passId}\nTour: ${pass.tourTitle}\nSchedule: ${pass.timeSlotLabel} (${pass.timeSlotHours})\nGuests: ${pass.groupSize} Travelers\nAssigned Guide: ${pass.guide.name}\nTotal: $${pass.totalAmount}`,
      });
    } catch {
      Alert.alert("Tour Pass Ready", `Pass ID #${pass.passId} has been confirmed.`);
    }
  };

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Sticky Navigation Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Recommended Tours</Text>
            <Text style={styles.headerSubtitle}>Curated VIP private itineraries & expert guides</Text>
          </View>
        </View>

        <Pressable
          style={styles.moreBtn}
          onPress={() => router.push("/screens/settings" as any)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {filterCategories.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter(cat);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tours Listing */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.listingHeaderRow}>
          <View>
            <Text style={styles.listingHeading}>Featured Private Itineraries</Text>
            <Text style={styles.listingSubheading}>
              Live availability with custom time slots & group discounts
            </Text>
          </View>
          <View style={styles.inventoryCountBadge}>
            <Text style={styles.inventoryCountText}>{filteredTours.length} Available</Text>
          </View>
        </View>

        <View style={styles.toursStack}>
          {filteredTours.map((tour) => {
            const slot = getSelectedSlot(tour.id);
            const size = getGroupSize(tour.id);
            const pricing = calculatePricing(tour.price, size);

            return (
              <View key={tour.id} style={styles.tourCard}>
                {/* 1. Cover Image & Badges */}
                <View style={styles.imageHeroWrapper}>
                  <Image source={{ uri: tour.image }} style={styles.imageHero} />
                  <View style={styles.imageHeroOverlay} />

                  <View style={styles.categoryBadgeTop}>
                    <Text style={styles.categoryBadgeText}>{tour.category}</Text>
                  </View>

                  <View style={styles.destinationBadge}>
                    <Ionicons name="location" size={13} color="#FFFFFF" />
                    <Text style={styles.destinationBadgeText}>
                      {tour.destination_city}, {tour.destination_country}
                    </Text>
                  </View>

                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.ratingBadgeVal}>{tour.rating.toFixed(1)}</Text>
                    <Text style={styles.ratingBadgeCount}>({tour.reviews_count})</Text>
                  </View>
                </View>

                {/* Card Main Body */}
                <View style={styles.cardBody}>
                  {/* Title & Duration */}
                  <View style={styles.titleMetaSection}>
                    <Text style={styles.tourTitle}>{tour.title}</Text>
                    <View style={styles.durationRow}>
                      <View style={styles.durationPill}>
                        <Ionicons name="time-outline" size={13} color={TRIP_BLUE} />
                        <Text style={styles.durationText}>{tour.duration_text}</Text>
                      </View>
                      <View style={styles.badgeInstantPill}>
                        <Ionicons name="flash" size={12} color="#10B981" />
                        <Text style={styles.badgeInstantText}>Instant Pass</Text>
                      </View>
                    </View>
                  </View>

                  {/* Highlights Bullet List */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionBlockHeader}>
                      <Ionicons name="sparkles" size={14} color="#F59E0B" />
                      <Text style={styles.sectionBlockTitle}>Tour Highlights</Text>
                    </View>
                    <View style={styles.highlightsGrid}>
                      {tour.highlights.slice(0, 4).map((hl, hlIdx) => (
                        <View key={hlIdx} style={styles.highlightChip}>
                          <Ionicons name="checkmark" size={12} color="#2563EB" />
                          <Text style={styles.highlightText} numberOfLines={1}>
                            {hl}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Inclusions Checklist */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionBlockHeader}>
                      <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                      <Text style={styles.sectionBlockTitle}>Included In Your Pass</Text>
                    </View>
                    <View style={styles.inclusionsRow}>
                      {tour.included_services.slice(0, 4).map((inc, incIdx) => (
                        <View key={incIdx} style={styles.inclusionBadge}>
                          <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                          <Text style={styles.inclusionText}>{inc}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* 2. Tour Guide Card with Links & Direct Calls */}
                  <View style={styles.guideCard}>
                    <Pressable
                      style={styles.guideLeftInfo}
                      onPress={() => handleOpenGuideProfile(tour.guide.id)}
                    >
                      <View style={styles.guideAvatarWrapper}>
                        <Image
                          source={{ uri: tour.guide.avatar }}
                          style={styles.guideAvatar}
                        />
                        <View style={styles.onlineDot} />
                      </View>

                      <View style={styles.guideMeta}>
                        <View style={styles.guideNameRow}>
                          <Text style={styles.guideName}>{tour.guide.name}</Text>
                          <Ionicons name="checkmark-circle" size={15} color="#2563EB" />
                        </View>
                        <Text style={styles.guideRole} numberOfLines={1}>
                          {tour.guide.role}
                        </Text>
                        <View style={styles.guideStatsRow}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.guideRatingText}>
                            {tour.guide.rating} · {tour.guide.toursCount}+ Tours
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    {/* Guide Actions */}
                    <View style={styles.guideActionsStack}>
                      <Pressable
                        style={styles.guideProfileBtn}
                        onPress={() => handleOpenGuideProfile(tour.guide.id)}
                      >
                        <Ionicons name="person-outline" size={13} color="#2563EB" />
                        <Text style={styles.guideProfileBtnText}>Profile</Text>
                      </Pressable>

                      <View style={styles.guideCallGroup}>
                        <Pressable
                          style={styles.callIconBtn}
                          onPress={() => handleLaunchCall("audio", tour.guide)}
                        >
                          <Ionicons name="call" size={14} color="#10B981" />
                        </Pressable>

                        <Pressable
                          style={[styles.callIconBtn, styles.videoCallBtn]}
                          onPress={() => handleLaunchCall("video", tour.guide)}
                        >
                          <Ionicons name="videocam" size={15} color="#2563EB" />
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* 3. Time Slot Selection */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionBlockTitle}>Select Tour Time Slot</Text>
                    <View style={styles.timeSlotRow}>
                      <Pressable
                        style={[
                          styles.timeSlotPill,
                          slot === "morning" && styles.timeSlotPillActive,
                        ]}
                        onPress={() => handleSelectSlot(tour.id, "morning")}
                      >
                        <View style={styles.timeSlotIconWrap}>
                          <Ionicons
                            name="sunny"
                            size={18}
                            color={slot === "morning" ? "#2563EB" : "#F59E0B"}
                          />
                        </View>
                        <View style={styles.timeSlotTextWrap}>
                          <Text
                            style={[
                              styles.timeSlotTitle,
                              slot === "morning" && styles.timeSlotTitleActive,
                            ]}
                          >
                            Morning Tour
                          </Text>
                          <Text style={styles.timeSlotTime}>09:00 AM - 01:00 PM</Text>
                        </View>
                        {slot === "morning" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#2563EB"
                            style={styles.timeSlotCheck}
                          />
                        )}
                      </Pressable>

                      <Pressable
                        style={[
                          styles.timeSlotPill,
                          slot === "afternoon" && styles.timeSlotPillActive,
                        ]}
                        onPress={() => handleSelectSlot(tour.id, "afternoon")}
                      >
                        <View style={styles.timeSlotIconWrap}>
                          <Ionicons
                            name="partly-sunny"
                            size={18}
                            color={slot === "afternoon" ? "#2563EB" : "#EA580C"}
                          />
                        </View>
                        <View style={styles.timeSlotTextWrap}>
                          <Text
                            style={[
                              styles.timeSlotTitle,
                              slot === "afternoon" && styles.timeSlotTitleActive,
                            ]}
                          >
                            Afternoon Tour
                          </Text>
                          <Text style={styles.timeSlotTime}>02:00 PM - 06:00 PM</Text>
                        </View>
                        {slot === "afternoon" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#2563EB"
                            style={styles.timeSlotCheck}
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {/* 4. Group Size Selector with Group Discount Calculations */}
                  <View style={styles.groupSizeContainer}>
                    <View style={styles.groupSizeTopRow}>
                      <View>
                        <Text style={styles.groupSizeLabel}>Traveler Group Size</Text>
                        <Text style={styles.groupSizeHint}>
                          {size === 1
                            ? "Add 1 more guest to get 5% Group Discount!"
                            : `${pricing.discountPercent}% Group Saver discount unlocked`}
                        </Text>
                      </View>

                      {/* Stepper */}
                      <View style={styles.stepperWrap}>
                        <Pressable
                          style={[
                            styles.stepperBtn,
                            size <= 1 && styles.stepperBtnDisabled,
                          ]}
                          onPress={() => handleGroupSizeChange(tour.id, -1)}
                          disabled={size <= 1}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={size <= 1 ? "#9CA3AF" : "#111827"}
                          />
                        </Pressable>

                        <View style={styles.stepperValueBox}>
                          <Text style={styles.stepperValueText}>{size}</Text>
                          <Text style={styles.stepperSubText}>
                            {size === 1 ? "Guest" : "Guests"}
                          </Text>
                        </View>

                        <Pressable
                          style={[
                            styles.stepperBtn,
                            size >= 20 && styles.stepperBtnDisabled,
                          ]}
                          onPress={() => handleGroupSizeChange(tour.id, 1)}
                          disabled={size >= 20}
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={size >= 20 ? "#9CA3AF" : "#111827"}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {/* Group Discount Calculation Banner */}
                    {pricing.discountPercent > 0 ? (
                      <View style={styles.discountPromoBadge}>
                        <Ionicons name="gift-outline" size={15} color="#059669" />
                        <Text style={styles.discountPromoText}>
                          {pricing.discountPercent}% Group Saver Applied: Save $
                          {pricing.discountAmount} on this booking!
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.tierInfoRow}>
                        <Text style={styles.tierInfoText}>
                          Tier discounts: 2 guests (5% off) · 3-4 (10% off) · 5+ (15% off)
                        </Text>
                      </View>
                    )}

                    {/* Price Breakdown */}
                    <View style={styles.priceCalculationRow}>
                      <View>
                        <View style={styles.originalSubtotalRow}>
                          <Text style={styles.priceBaseNote}>
                            ${tour.price} × {size} {size === 1 ? "guest" : "guests"}
                          </Text>
                          {pricing.discountAmount > 0 && (
                            <Text style={styles.oldSubtotalText}>${pricing.subtotal}</Text>
                          )}
                        </View>
                        <View style={styles.finalPriceRow}>
                          <Text style={styles.totalPriceNumber}>
                            ${pricing.totalAmount}
                          </Text>
                          <Text style={styles.perPersonBreakdown}>
                            (${pricing.pricePerPerson}/guest)
                          </Text>
                        </View>
                      </View>

                      {/* 5. Book Tour Action Button */}
                      <Pressable
                        style={styles.bookTourBtn}
                        onPress={() => handleBookTour(tour)}
                      >
                        <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.bookTourBtnText}>Book Tour</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 5. Digital Tour Pass Modal */}
      {digitalPass && (
        <Modal
          visible={passModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPassModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.passCardModal}>
              {/* Modal Header */}
              <View style={styles.passModalTopBar}>
                <View style={styles.passVerifiedChip}>
                  <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
                  <Text style={styles.passVerifiedText}>OFFICIAL TOUR PASS</Text>
                </View>
                <Pressable
                  style={styles.closeModalBtn}
                  onPress={() => setPassModalVisible(false)}
                >
                  <Ionicons name="close" size={22} color="#4B5563" />
                </Pressable>
              </View>

              {/* Pass Ticket Body */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.passScrollArea}
              >
                <View style={styles.passTicketShell}>
                  {/* Ticket Header */}
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketLogoRow}>
                      <Ionicons name="airplane" size={18} color="#FFFFFF" />
                      <Text style={styles.ticketBrand}>TRIP.COM PASS</Text>
                    </View>
                    <Text style={styles.ticketIdBadge}>#{digitalPass.passId}</Text>
                  </View>

                  {/* Main Ticket Info */}
                  <View style={styles.ticketBody}>
                    <Text style={styles.ticketTourTitle}>{digitalPass.tourTitle}</Text>
                    <View style={styles.ticketDestRow}>
                      <Ionicons name="location-sharp" size={14} color="#6B7280" />
                      <Text style={styles.ticketDestText}>{digitalPass.destination}</Text>
                    </View>

                    {/* Schedule & Travelers Grid */}
                    <View style={styles.ticketGrid}>
                      <View style={styles.ticketGridCol}>
                        <Text style={styles.ticketLabel}>SCHEDULE</Text>
                        <Text style={styles.ticketValPrimary}>
                          {digitalPass.timeSlotLabel}
                        </Text>
                        <Text style={styles.ticketValSub}>
                          {digitalPass.timeSlotHours}
                        </Text>
                      </View>

                      <View style={styles.ticketGridCol}>
                        <Text style={styles.ticketLabel}>TRAVELERS</Text>
                        <Text style={styles.ticketValPrimary}>
                          {digitalPass.groupSize}{" "}
                          {digitalPass.groupSize === 1 ? "Traveler" : "Travelers"}
                        </Text>
                        {digitalPass.discountPercent > 0 && (
                          <Text style={styles.ticketDiscountTag}>
                            {digitalPass.discountPercent}% Group Saver
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Assigned Guide Snippet */}
                    <View style={styles.ticketGuideCard}>
                      <Image
                        source={{ uri: digitalPass.guide.avatar }}
                        style={styles.ticketGuideAvatar}
                      />
                      <View style={styles.ticketGuideInfo}>
                        <Text style={styles.ticketGuideHeaderLabel}>
                          ASSIGNED TOUR GUIDE
                        </Text>
                        <Text style={styles.ticketGuideName}>
                          {digitalPass.guide.name}
                        </Text>
                        <Text style={styles.ticketGuideRole}>
                          {digitalPass.guide.badge}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.ticketGuideCallBtn}
                        onPress={() => {
                          setPassModalVisible(false);
                          handleLaunchCall("audio", digitalPass.guide);
                        }}
                      >
                        <Ionicons name="call" size={15} color="#2563EB" />
                      </Pressable>
                    </View>

                    {/* Inclusions summary in Pass */}
                    <View style={styles.passInclusionsSection}>
                      <Text style={styles.ticketLabel}>KEY INCLUSIONS</Text>
                      <View style={styles.passInclusionsChipsWrap}>
                        {digitalPass.inclusions.slice(0, 3).map((item, i) => (
                          <View key={i} style={styles.passInclusionChip}>
                            <Ionicons name="checkmark" size={11} color="#10B981" />
                            <Text style={styles.passInclusionChipText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Scannable QR Code */}
                    <View style={styles.qrCodeSection}>
                      <View style={styles.qrWrapper}>
                        <QRCode
                          value={digitalPass.qrPayload}
                          size={110}
                          color="#0F172A"
                          backgroundColor="#FFFFFF"
                        />
                      </View>
                      <Text style={styles.qrInstruction}>
                        Scan at meeting point for instant pass check-in
                      </Text>
                    </View>

                    {/* Amount Due Bar */}
                    <View style={styles.ticketAmountRow}>
                      <View>
                        <Text style={styles.ticketLabel}>TOTAL PAYABLE</Text>
                        <Text style={styles.ticketAmountValue}>
                          ${digitalPass.totalAmount}
                        </Text>
                      </View>
                      <View style={styles.passIssuedDateBox}>
                        <Text style={styles.passIssuedLabel}>DATE ISSUED</Text>
                        <Text style={styles.passIssuedDate}>{digitalPass.issuedAt}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Modal Action Buttons */}
                <View style={styles.modalActionsStack}>
                  <Pressable
                    style={styles.proceedPaymentBtn}
                    onPress={() => handleProceedToPayment(digitalPass)}
                  >
                    <Ionicons name="card" size={20} color="#FFFFFF" />
                    <Text style={styles.proceedPaymentBtnText}>
                      Proceed to Payment (${digitalPass.totalAmount})
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>

                  <Pressable
                    style={styles.sharePassBtn}
                    onPress={() => handleSharePass(digitalPass)}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#2563EB" />
                    <Text style={styles.sharePassBtnText}>Share / Save Tour Pass</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Floating AI Pill & Bottom Navigation */}
      <AiPill color={TRIP_BLUE} />
      <BottomNav active="Home" color={TRIP_BLUE} />
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
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  moreBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  filtersSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  listingHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  listingSubheading: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  inventoryCountBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  inventoryCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  toursStack: {
    gap: 20,
  },
  tourCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  imageHeroWrapper: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  imageHero: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
  categoryBadgeTop: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  destinationBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  destinationBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  ratingBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ratingBadgeVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingBadgeCount: {
    fontSize: 10,
    color: "#64748B",
  },
  cardBody: {
    padding: 16,
    gap: 16,
  },
  titleMetaSection: {
    gap: 6,
  },
  tourTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  badgeInstantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeInstantText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  sectionBlock: {
    gap: 8,
  },
  sectionBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionBlockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  highlightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  highlightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  highlightText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  inclusionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  inclusionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  inclusionText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  guideLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  guideAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: "relative",
  },
  guideAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  guideMeta: {
    flex: 1,
  },
  guideNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  guideName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  guideRole: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  guideStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  guideRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  guideActionsStack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  guideProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  guideProfileBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  guideCallGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  videoCallBtn: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  timeSlotRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeSlotPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  timeSlotPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  timeSlotIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  timeSlotTextWrap: {
    flex: 1,
  },
  timeSlotTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  timeSlotTitleActive: {
    color: "#1E40AF",
  },
  timeSlotTime: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  timeSlotCheck: {
    marginLeft: "auto",
  },
  groupSizeContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  groupSizeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupSizeLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  groupSizeHint: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValueBox: {
    minWidth: 44,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  stepperValueText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepperSubText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
  },
  discountPromoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  discountPromoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  tierInfoRow: {
    paddingVertical: 2,
  },
  tierInfoText: {
    fontSize: 10,
    color: "#64748B",
  },
  priceCalculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  originalSubtotalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceBaseNote: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  oldSubtotalText: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  finalPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  totalPriceNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2563EB",
  },
  perPersonBreakdown: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  bookTourBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookTourBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  passCardModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  passModalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  passVerifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passVerifiedText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  closeModalBtn: {
    padding: 6,
  },
  passScrollArea: {
    padding: 20,
    gap: 20,
  },
  passTicketShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#DBEAFE",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  ticketHeader: {
    backgroundColor: "#1E3A8A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ticketBrand: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  ticketIdBadge: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },
  ticketBody: {
    padding: 16,
    gap: 14,
  },
  ticketTourTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
  },
  ticketDestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ticketDestText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  ticketGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ticketGridCol: {
    flex: 1,
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ticketValPrimary: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketValSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  ticketDiscountTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
    marginTop: 2,
  },
  ticketGuideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 10,
  },
  ticketGuideAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  ticketGuideInfo: {
    flex: 1,
  },
  ticketGuideHeaderLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.5,
  },
  ticketGuideName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketGuideRole: {
    fontSize: 11,
    color: "#475569",
  },
  ticketGuideCallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  passInclusionsSection: {
    gap: 6,
  },
  passInclusionsChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  passInclusionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passInclusionChipText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  qrCodeSection: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  qrInstruction: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  ticketAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  ticketAmountValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2563EB",
  },
  passIssuedDateBox: {
    alignItems: "flex-end",
  },
  passIssuedLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  passIssuedDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalActionsStack: {
    gap: 10,
  },
  proceedPaymentBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedPaymentBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  sharePassBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  sharePassBtnText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
});
