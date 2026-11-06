import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../utils/supabase";
import { travelRepository } from "../repositories";
import { useBookingStore } from "../store/bookingStore";
import { EmptyStateView, ErrorStateCard, ListSkeleton } from "../components/common";
import { WeatherWidget } from "../components/weather/WeatherWidget";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#287dfa";
const TRIP_PURPLE = "#7C3AED";
const TRIP_EMERALD = "#059669";
const TRIP_ROSE = "#DC2626";

// ============================================================================
// Types & Interfaces
// ============================================================================

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

export interface TourItineraryDay {
  dayNumber: number;
  title: string;
  summary: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  mealsIncluded: string;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
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
  currency: string;
  rating: number;
  reviews_count: number;
  image: string;
  galleryImages: string[];
  highlights: string[];
  included_services: string[];
  not_included: string[];
  itinerary: TourItineraryDay[];
  guide: TourGuide;
}

export interface GroupTierPricingResult {
  groupSize: number;
  tierIndex: number;
  tierLabel: string;
  tierBadge: string;
  discountPercent: number;
  baseRatePerPerson: number;
  discountedRatePerPerson: number;
  subtotalBeforeDiscount: number;
  totalAmount: number;
  totalSavings: number;
  nextTierHint: string;
}

export interface DigitalPass {
  passId: string;
  tourId: string;
  tourTitle: string;
  destination: string;
  date: string;
  timeSlotId: "morning" | "afternoon" | "sunset";
  timeSlotLabel: string;
  timeSlotHours: string;
  groupSize: number;
  basePrice: number;
  currency: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  pricePerPerson: number;
  guide: TourGuide;
  inclusions: string[];
  exclusions: string[];
  qrPayload: string;
  issuedAt: string;
}

// Ensure travelRepository.getTourPackages() is cleanly available on travelRepository
interface ITravelRepositoryWithPackages {
  getTourPackages: (options?: { limit?: number; bypassCache?: boolean }) => Promise<any[]>;
}

if (typeof (travelRepository as any).getTourPackages !== "function") {
  (travelRepository as any).getTourPackages = async (options?: { limit?: number; bypassCache?: boolean }) => {
    try {
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .order("rating", { ascending: false })
        .limit(options?.limit || 50);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn("travelRepository.getTourPackages Supabase notice:", e);
    }

    try {
      const featured = await travelRepository.getFeaturedTours(options?.limit || 20, options);
      return featured || [];
    } catch (e) {
      return [];
    }
  };
}

export function formatCurrency(amount: number, currency = "USD"): string {
  const code = (currency || "USD").toUpperCase();
  const sym =
    code === "BDT" ? "৳" :
    code === "EUR" ? "€" :
    code === "GBP" ? "£" :
    code === "JPY" ? "¥" :
    code === "INR" ? "₹" : "$";
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

// ============================================================================
// Group Tier Pricing Calculator
// Requirements:
// 1-2 persons: standard/duo rate (1: base, 2: 5% duo saver)
// 3-5 persons: small group discount (10% off per person)
// 6+ persons: group discount (20% off per person)
// ============================================================================

export function calculateGroupTierPricing(baseRatePerPerson: number, groupSize: number): GroupTierPricingResult {
  const safeSize = Math.max(1, Math.round(groupSize));
  let discountPercent = 0;
  let tierIndex = 1;
  let tierLabel = "Standard Rate (1 Traveler)";
  let tierBadge = "Standard Tier";
  let nextTierHint = "Add 1 more guest to unlock 5% Duo discount!";

  if (safeSize >= 6) {
    discountPercent = 20;
    tierIndex = 3;
    tierLabel = "6+ Group Super Saver (20% OFF)";
    tierBadge = "Tier 3: 20% Group Discount";
    nextTierHint = "Maximum 20% group discount applied!";
  } else if (safeSize >= 3) {
    discountPercent = 10;
    tierIndex = 2;
    tierLabel = "3-5 Group Discount (10% OFF)";
    tierBadge = "Tier 2: 10% Group Saver";
    const needed = 6 - safeSize;
    nextTierHint = `Add ${needed} more guest${needed > 1 ? "s" : ""} to unlock 20% Group Discount!`;
  } else if (safeSize === 2) {
    discountPercent = 5;
    tierIndex = 1;
    tierLabel = "Duo Traveler Special (5% OFF)";
    tierBadge = "Tier 1: Duo Saver";
    nextTierHint = "Add 1 more guest to unlock 10% Group Discount!";
  } else {
    discountPercent = 0;
    tierIndex = 1;
    tierLabel = "Solo Explorer (1 Traveler)";
    tierBadge = "Standard Rate";
    nextTierHint = "Add 1 guest for 5% Duo discount or 2 guests for 10% off!";
  }

  const discountedRatePerPerson = Math.round(baseRatePerPerson * (1 - discountPercent / 100));
  const subtotalBeforeDiscount = baseRatePerPerson * safeSize;
  const totalAmount = discountedRatePerPerson * safeSize;
  const totalSavings = subtotalBeforeDiscount - totalAmount;

  return {
    groupSize: safeSize,
    tierIndex,
    tierLabel,
    tierBadge,
    discountPercent,
    baseRatePerPerson,
    discountedRatePerPerson,
    subtotalBeforeDiscount,
    totalAmount,
    totalSavings,
    nextTierHint,
  };
}

function parseArrayField(val: any, fallback: string[]): string[] {
  if (Array.isArray(val) && val.length > 0) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof val === "string" && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {}
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

function parseItineraryField(rawItinerary: any, city: string, durationDays: number): TourItineraryDay[] | null {
  if (Array.isArray(rawItinerary) && rawItinerary.length > 0) {
    return rawItinerary.map((d: any, idx: number) => {
      const dayNum = Number(d.dayNumber || d.day || idx + 1);
      const mealsStr = d.mealsIncluded || d.meals || "Breakfast";
      const mealsObj =
        typeof d.meals === "object" && d.meals !== null
          ? d.meals
          : {
              breakfast: String(mealsStr).toLowerCase().includes("breakfast"),
              lunch: String(mealsStr).toLowerCase().includes("lunch"),
              dinner: String(mealsStr).toLowerCase().includes("dinner"),
            };
      return {
        dayNumber: dayNum,
        title: d.title || `Day ${dayNum}: ${city} Exploration`,
        summary: d.summary || d.description || `Guided excursion in ${city}.`,
        morning: d.morning || d.morningActivity,
        afternoon: d.afternoon || d.afternoonActivity,
        evening: d.evening || d.eveningActivity,
        mealsIncluded: typeof mealsStr === "string" ? mealsStr : "Breakfast",
        meals: {
          breakfast: Boolean(mealsObj.breakfast),
          lunch: Boolean(mealsObj.lunch),
          dinner: Boolean(mealsObj.dinner),
        },
      };
    });
  }
  if (typeof rawItinerary === "string" && rawItinerary.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawItinerary);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parseItineraryField(parsed, city, durationDays);
      }
    } catch {}
  }
  return null;
}

function generateDynamicTourItinerary(
  rawItem: any,
  city: string,
  durationDays: number,
  highlights: string[]
): TourItineraryDay[] {
  if (rawItem.itinerary) {
    const parsed = parseItineraryField(rawItem.itinerary, city, durationDays);
    if (parsed && parsed.length > 0) return parsed;
  }

  const days: TourItineraryDay[] = [];
  const totalDays = Math.max(1, durationDays);

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    if (dayNum === 1) {
      days.push({
        dayNumber: 1,
        title: `Day 1: Arrival & ${city} Heritage Sightseeing`,
        summary: `VIP morning meeting point greeting, historic heritage landmarks tour, and sunset dinner.`,
        morning: `Central rendezvous point greeting with private air-conditioned coach transfer.`,
        afternoon: `Guided walking expedition through historic quarters & authentic culinary tasting.`,
        evening: `Scenic panoramic sunset lookout viewpoint visit followed by welcome dining.`,
        mealsIncluded: "Lunch, Dinner",
        meals: { breakfast: false, lunch: true, dinner: true },
      });
    } else if (dayNum === totalDays && totalDays > 1) {
      days.push({
        dayNumber: totalDays,
        title: `Day ${totalDays}: Artisan Bazaars & Farewell Transfer`,
        summary: `Artisan workshop visits, authentic souvenir shopping, and departure chauffeur.`,
        morning: `Champagne breakfast followed by visits to traditional local craft workshops.`,
        afternoon: `Souvenir shopping in vibrant bazaars & farewell regional dessert tasting.`,
        evening: `Private scheduled chauffeur drop-off back at rendezvous hub or airport.`,
        mealsIncluded: "Breakfast",
        meals: { breakfast: true, lunch: false, dinner: false },
      });
    } else {
      const hl1 = highlights[(dayNum - 2) % Math.max(1, highlights.length)] || `${city} Scenic Excursion`;
      const hl2 = highlights[(dayNum - 1) % Math.max(1, highlights.length)] || `Living Coral Reef Exploration`;
      days.push({
        dayNumber: dayNum,
        title: `Day ${dayNum}: Guided Excursion — ${hl1}`,
        summary: `Full-day immersive adventure exploring ${hl1} and ${hl2}.`,
        morning: `Buffet breakfast followed by guided catamaran boat cruise to scenic outer islands.`,
        afternoon: `Snorkeling along crystal lagoons & gourmet beachside local seafood banquet.`,
        evening: `Sunset harbor cruise with skyline illuminations & live traditional music.`,
        mealsIncluded: "Breakfast, Lunch",
        meals: { breakfast: true, lunch: true, dinner: false },
      });
    }
  }

  return days;
}

function buildCuratedGallery(primaryImg: string, category: string, extraImages?: string[]): string[] {
  if (Array.isArray(extraImages) && extraImages.length > 1) {
    return extraImages;
  }
  const cat = (category || "").toLowerCase();
  if (cat.includes("beach") || cat.includes("island") || cat.includes("eco")) {
    return [
      primaryImg,
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800",
    ];
  }
  return [
    primaryImg,
    "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800",
    "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800",
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800",
  ];
}

// ============================================================================
// Full-Screen Pinch-to-Zoom Image Preview Modal Component
// ============================================================================

interface FullScreenImageModalProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

function FullScreenImageModal({ visible, images, initialIndex, title, onClose }: FullScreenImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomScale(1);
  }, [initialIndex, visible]);

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this tour photo from "${title}":\n${currentImage}`,
        url: currentImage,
      });
    } catch {}
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setZoomScale((prev) => (prev > 1.5 ? 1 : 2.5));
    }
    lastTapRef.current = now;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={zoomStyles.overlay}>
        <SafeAreaView edges={["top"]} style={zoomStyles.topBar}>
          <Pressable
            style={zoomStyles.iconBtn}
            onPress={() => {
              Haptics.selectionAsync();
              onClose();
            }}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          <View style={zoomStyles.headerCenter}>
            <Text style={zoomStyles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={zoomStyles.headerCounter}>
              {currentIndex + 1} of {images.length}
            </Text>
          </View>

          <Pressable style={zoomStyles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>

        {/* Pinch-to-Zoom Viewport */}
        <Pressable style={zoomStyles.imageContainer} onPress={handleDoubleTap}>
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            contentContainerStyle={zoomStyles.zoomScrollContent}
          >
            <Image
              source={{ uri: currentImage }}
              style={[
                zoomStyles.zoomImage,
                { transform: [{ scale: zoomScale }] },
              ]}
              resizeMode="contain"
            />
          </ScrollView>

          <View style={zoomStyles.pinchHintPill}>
            <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
            <Text style={zoomStyles.pinchHintText}>Pinch or double-tap to zoom (up to 4x)</Text>
          </View>
        </Pressable>

        {/* Quick Zoom Action Buttons */}
        <View style={zoomStyles.quickZoomRow}>
          <Pressable
            style={zoomStyles.zoomActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setZoomScale((z) => Math.max(1, z - 0.5));
            }}
          >
            <Ionicons name="remove-circle-outline" size={18} color="#FFFFFF" />
            <Text style={zoomStyles.zoomActionBtnText}>Zoom Out</Text>
          </Pressable>

          <Pressable
            style={zoomStyles.zoomActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setZoomScale(1);
            }}
          >
            <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />
            <Text style={zoomStyles.zoomActionBtnText}>Reset (1x)</Text>
          </Pressable>

          <Pressable
            style={zoomStyles.zoomActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setZoomScale((z) => Math.min(4, z + 0.5));
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={zoomStyles.zoomActionBtnText}>Zoom In</Text>
          </Pressable>
        </View>

        {/* Bottom Thumbnail Strip */}
        <SafeAreaView edges={["bottom"]} style={zoomStyles.thumbnailStripContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={zoomStyles.thumbnailScroll}>
            {images.map((imgUrl, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrentIndex(idx);
                  }}
                  style={[zoomStyles.thumbWrapper, isSelected && zoomStyles.thumbWrapperSelected]}
                >
                  <Image source={{ uri: imgUrl }} style={zoomStyles.thumbImage} />
                  {isSelected && <View style={zoomStyles.thumbSelectedIndicator} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const zoomStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 15, 0.97)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  headerCounter: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  imageContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomScrollContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: SCREEN_WIDTH,
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  pinchHintPill: {
    position: "absolute",
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pinchHintText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  quickZoomRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  zoomActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  zoomActionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  thumbnailStripContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 12,
  },
  thumbnailScroll: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  thumbWrapper: {
    width: 64,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.5,
  },
  thumbWrapperSelected: {
    borderColor: "#FACC15",
    opacity: 1,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbSelectedIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FACC15",
  },
});

// ============================================================================
// Tour Image Carousel Component
// ============================================================================

interface TourImageCarouselProps {
  images: string[];
  title: string;
  category: string;
  destination: string;
  rating: number;
  reviewsCount: number;
  onOpenZoom: (index: number) => void;
}

function TourImageCarousel({
  images,
  title,
  category,
  destination,
  rating,
  reviewsCount,
  onOpenZoom,
}: TourImageCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (SCREEN_WIDTH - 32));
    if (index !== activeIdx && index >= 0 && index < images.length) {
      setActiveIdx(index);
    }
  };

  return (
    <View style={tourCarouselStyles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={tourCarouselStyles.scrollView}
      >
        {images.map((img, i) => (
          <Pressable key={i} onPress={() => onOpenZoom(i)} style={tourCarouselStyles.slide}>
            <Image source={{ uri: img }} style={tourCarouselStyles.image} />
            <LinearGradient colors={["rgba(15, 23, 42, 0.45)", "transparent", "rgba(15, 23, 42, 0.75)"]} style={StyleSheet.absoluteFill} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Top Badges */}
      <View style={tourCarouselStyles.topRow}>
        <View style={tourCarouselStyles.categoryBadgeTop}>
          <Text style={tourCarouselStyles.categoryBadgeText}>{category}</Text>
        </View>

        <Pressable
          style={tourCarouselStyles.zoomBtn}
          onPress={() => {
            Haptics.selectionAsync();
            onOpenZoom(activeIdx);
          }}
        >
          <Ionicons name="expand" size={15} color="#FFFFFF" />
          <Text style={tourCarouselStyles.zoomBtnText}>Zoom</Text>
        </Pressable>
      </View>

      {/* Bottom Destination & Rating Badges */}
      <View style={tourCarouselStyles.bottomRow}>
        <View style={tourCarouselStyles.destinationBadge}>
          <Ionicons name="location" size={13} color="#FFFFFF" />
          <Text style={tourCarouselStyles.destinationBadgeText}>{destination}</Text>
        </View>

        <View style={tourCarouselStyles.ratingBadge}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={tourCarouselStyles.ratingBadgeVal}>{rating.toFixed(1)}</Text>
          <Text style={tourCarouselStyles.ratingBadgeCount}>({reviewsCount})</Text>
        </View>
      </View>

      {/* Indicator Dots */}
      <View style={tourCarouselStyles.dotsContainer}>
        {images.map((_, dotIdx) => (
          <View key={dotIdx} style={[tourCarouselStyles.dot, dotIdx === activeIdx && tourCarouselStyles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const tourCarouselStyles = StyleSheet.create({
  container: {
    width: "100%",
    height: 200,
    position: "relative",
    backgroundColor: "#1E293B",
  },
  scrollView: {
    width: "100%",
    height: "100%",
  },
  slide: {
    width: SCREEN_WIDTH - 32,
    height: 200,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadgeTop: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  zoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  zoomBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bottomRow: {
    position: "absolute",
    bottom: 22,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destinationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  destinationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
  dotsContainer: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  dotActive: {
    width: 16,
    backgroundColor: "#FACC15",
  },
});

// ============================================================================
// RecommendedToursScreen Main Component
// ============================================================================

export function RecommendedToursScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("All");
  const [tours, setTours] = useState<TourItem[]>([]);
  const [guides, setGuides] = useState<TourGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toursError, setToursError] = useState<string | null>(null);

  // Per-tour selections
  const [selectedSlots, setSelectedSlots] = useState<Record<string, "morning" | "afternoon" | "sunset">>({});
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>({});
  const [expandedItineraryDays, setExpandedItineraryDays] = useState<Record<string, Record<number, boolean>>>({});
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({});

  // Full-Screen Image Zoom Modal State
  const [fullScreenModal, setFullScreenModal] = useState<{
    visible: boolean;
    images: string[];
    index: number;
    title: string;
  }>({
    visible: false,
    images: [],
    index: 0,
    title: "",
  });

  // Digital Tour Pass Modal State
  const [digitalPass, setDigitalPass] = useState<DigitalPass | null>(null);
  const [passModalVisible, setPassModalVisible] = useState(false);

  // --------------------------------------------------------------------------
  // Data Fetching: Connect to travelRepository.getTourPackages() & Live Guides
  // --------------------------------------------------------------------------

  const loadGuidesAndTours = async () => {
    setLoading(true);
    setToursError(null);
    try {
      // 1. Fetch live guides dynamically from Supabase
      let liveGuides: TourGuide[] = [];
      try {
        const { data: guideData } = await supabase
          .from("community_profiles")
          .select("id, full_name, avatar_url, bio, rating, tours_count, languages")
          .limit(12);

        if (guideData && guideData.length > 0) {
          liveGuides = guideData.map((g: any, i: number) => ({
            id: g.id || `guide-${i}`,
            name: g.full_name || `Certified Expert ${i + 1}`,
            avatar: g.avatar_url || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300`,
            role: g.bio || "Certified Heritage & Adventure Guide",
            badge: "Verified Tour Leader",
            rating: Number(g.rating) || 4.96,
            toursCount: Number(g.tours_count) || 120 + i * 15,
            languages: g.languages || "English, Local Native",
          }));
          setGuides(liveGuides);
        }
      } catch (gErr) {
        console.warn("Notice: Live guides query info:", gErr);
      }

      // 2. Fetch tour packages via travelRepository
      const repo = travelRepository as typeof travelRepository & ITravelRepositoryWithPackages;
      const data = await repo.getTourPackages({ limit: 40 });

      if (data && data.length > 0) {
        const mappedTours: TourItem[] = data.map((item: any, idx: number) => {
          // Dynamic guide resolution: use item's own guide if specified, or matched from live guides
          const assignedGuide: TourGuide = {
            id: item.guide_id || (liveGuides[idx % Math.max(1, liveGuides.length)]?.id ?? `guide-${idx}`),
            name: item.guide_name || (liveGuides[idx % Math.max(1, liveGuides.length)]?.name ?? "Certified Tour Leader"),
            avatar:
              item.guide_image_url ||
              item.guide_avatar ||
              (liveGuides[idx % Math.max(1, liveGuides.length)]?.avatar ??
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"),
            role: item.guide_bio || item.guide_role || "Senior Nature & Culture Guide",
            badge: "Certified Local Expert",
            rating: Number(item.guide_rating) || 4.95,
            toursCount: Number(item.guide_tours_count) || 140,
            languages: item.guide_languages || "English, Local Dialect",
          };

          const city = item.destination_city || item.city || "Scenic City";
          const daysCount = Number(item.duration_days) || 1;

          const parsedHighlights = parseArrayField(item.highlights, [
            `${city} Historic Landmarks & Heritage Sites`,
            "Scenic Panoramic Coastal Lookouts",
            "Guided Cultural Walking Exploration",
            "Authentic Gastronomic Food Tasting",
          ]);

          const parsedInclusions = parseArrayField(item.included_services || item.inclusions, [
            "Hotel: 5-Star Luxury Accommodations",
            "Transport: Private Air-Conditioned Coach & Chauffeur",
            "Guide: Certified Professional English-Speaking Leader",
            "Tickets: All Monument, Reserve & National Park Passes",
            "Meals: Gourmet Lunch & Artisanal Tasting Platter",
          ]);

          const parsedExclusions = parseArrayField(item.not_included || item.exclusions, [
            "Visa: International Visa Processing Fees",
            "Expenses: Personal Souvenirs & Purchases",
            "Insurance: Comprehensive Medical & Delay Coverage",
            "Gratuities: Discretionary Guide & Driver Tips",
          ]);

          const durationText =
            item.duration_text ||
            (daysCount > 1 ? `${daysCount} Days / ${daysCount - 1} Nights` : "Full Day Excursion");

          const priceNum = Number(item.price || item.price_per_person || item.base_price) || 135;
          const originalPriceNum = Number(item.original_price) || Math.round(priceNum * 1.25);

          let mainImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800";
          if (Array.isArray(item.image_urls) && item.image_urls[0]) {
            mainImage = item.image_urls[0];
          } else if (typeof item.image_url === "string" && item.image_url) {
            mainImage = item.image_url;
          } else if (typeof item.featured_image === "string" && item.featured_image) {
            mainImage = item.featured_image;
          }

          const gallery = buildCuratedGallery(mainImage, item.category || "Adventure", item.image_urls);
          const itinerary = generateDynamicTourItinerary(item, city, daysCount, parsedHighlights);

          return {
            id: item.id || `tour-${idx}`,
            title: item.title || `${city} VIP Private Itinerary`,
            slug: item.slug || `tour-${idx}`,
            description: item.description || "Exciting guided tour with unforgettable experiences.",
            destination_city: city,
            destination_country: item.destination_country || item.country || "Global",
            duration_text: durationText,
            duration_days: daysCount,
            category: item.category || "Private Tours",
            price: priceNum,
            original_price: originalPriceNum,
            currency: item.currency || "USD",
            rating: Number(item.rating) || 4.9,
            reviews_count: Number(item.reviews_count) || 84,
            image: mainImage,
            galleryImages: gallery,
            highlights: parsedHighlights,
            included_services: parsedInclusions,
            not_included: parsedExclusions,
            itinerary,
            guide: assignedGuide,
          };
        });

        setTours(mappedTours);
      } else {
        setTours([]);
      }
    } catch (err: any) {
      console.warn("Error loading tour inventory:", err);
      setToursError(err?.message || "Failed to load curated tours. Please try again.");
      setTours([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGuidesAndTours();

    const channel = supabase
      .channel("tours-live-sync-rec")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
        loadGuidesAndTours();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadGuidesAndTours();
  };

  const filterCategories = useMemo(() => {
    const set = new Set<string>(["All"]);
    tours.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [tours]);

  const filteredTours = useMemo(() => {
    if (activeFilter === "All") return tours;
    return tours.filter((t) => t.category === activeFilter);
  }, [tours, activeFilter]);

  const getSelectedSlot = (tourId: string): "morning" | "afternoon" | "sunset" => {
    return selectedSlots[tourId] || "morning";
  };

  const handleSelectSlot = (tourId: string, slot: "morning" | "afternoon" | "sunset") => {
    Haptics.selectionAsync();
    setSelectedSlots((prev) => ({ ...prev, [tourId]: slot }));
  };

  const getGroupSize = (tourId: string): number => {
    return groupSizes[tourId] || 2;
  };

  const setExplicitGroupSize = (tourId: string, size: number) => {
    Haptics.selectionAsync();
    setGroupSizes((prev) => ({ ...prev, [tourId]: Math.max(1, Math.min(20, size)) }));
  };

  const handleGroupSizeChange = (tourId: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGroupSizes((prev) => {
      const current = prev[tourId] || 2;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [tourId]: next };
    });
  };

  const toggleTourDayAccordion = (tourId: string, dayNum: number) => {
    Haptics.selectionAsync();
    setExpandedItineraryDays((prev) => {
      const tourDays = prev[tourId] || { 1: true };
      return {
        ...prev,
        [tourId]: {
          ...tourDays,
          [dayNum]: !tourDays[dayNum],
        },
      };
    });
  };

  const getSelectedTourDate = (tourId: string): string => {
    if (selectedDates[tourId]) return selectedDates[tourId];
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const setSelectedTourDateOption = (tourId: string, daysOffset: number) => {
    Haptics.selectionAsync();
    const d = new Date(Date.now() + daysOffset * 86400000);
    const formatted = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setSelectedDates((prev) => ({ ...prev, [tourId]: formatted }));
  };

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

  const handleBookTour = (tour: TourItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const slot = getSelectedSlot(tour.id);
    const size = getGroupSize(tour.id);
    const pricing = calculateGroupTierPricing(tour.price, size);
    const scheduledDate = getSelectedTourDate(tour.id);

    useBookingStore.getState().initDraft({
      productType: "tour",
      productId: tour.id,
      destinationCity: tour.destination_city,
      destinationCountry: tour.destination_country,
      basePrice: pricing.totalAmount,
      currency: tour.currency,
      numberOfGuests: size,
    });

    useBookingStore.getState().setNotes(
      `Tour: ${tour.title} | Date: ${scheduledDate} | Slot: ${slot} | Tier: ${pricing.tierLabel} (${pricing.discountPercent}% off) | Guide: ${tour.guide.name} | Inclusions: ${tour.included_services.slice(0, 3).join(", ")} | Exclusions: ${tour.not_included.slice(0, 3).join(", ")}`
    );

    const slotLabel =
      slot === "morning"
        ? "Morning Tour 09:00 AM"
        : slot === "afternoon"
        ? "Afternoon Tour 02:00 PM"
        : "Sunset Tour 05:00 PM";

    const slotHours =
      slot === "morning"
        ? "09:00 AM - 01:00 PM"
        : slot === "afternoon"
        ? "02:00 PM - 06:00 PM"
        : "05:00 PM - 08:30 PM";

    const randomPassCode = Math.floor(100000 + Math.random() * 900000);
    const passId = `TP-${Date.now().toString(36).toUpperCase()}-${randomPassCode}`;

    const newPass: DigitalPass = {
      passId,
      tourId: tour.id,
      tourTitle: tour.title,
      destination: `${tour.destination_city}, ${tour.destination_country}`,
      date: scheduledDate,
      timeSlotId: slot,
      timeSlotLabel: slotLabel,
      timeSlotHours: slotHours,
      groupSize: size,
      basePrice: tour.price,
      currency: tour.currency,
      subtotal: pricing.subtotalBeforeDiscount,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.totalSavings,
      totalAmount: pricing.totalAmount,
      pricePerPerson: pricing.discountedRatePerPerson,
      guide: tour.guide,
      inclusions: tour.included_services,
      exclusions: tour.not_included,
      qrPayload: JSON.stringify({
        passId,
        tour: tour.title,
        date: scheduledDate,
        slot: slotLabel,
        guests: size,
        total: pricing.totalAmount,
        currency: tour.currency,
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
        timeSlot: `${pass.timeSlotLabel} (${pass.date})`,
        groupSize: pass.groupSize.toString(),
        guideName: pass.guide.name,
        tierDiscount: `${pass.discountPercent}% Group Saver`,
      },
    });
  };

  const handleSharePass = async (pass: DigitalPass) => {
    try {
      await Share.share({
        message: `🎫 Official Trip.com Tour Pass #${pass.passId}\nTour: ${pass.tourTitle}\nDate: ${pass.date}\nSchedule: ${pass.timeSlotLabel} (${pass.timeSlotHours})\nGuests: ${pass.groupSize} Travelers\nAssigned Guide: ${pass.guide.name}\nTotal: ${formatCurrency(pass.totalAmount, pass.currency)}`,
      });
    } catch {
      Alert.alert("Tour Pass Ready", `Pass ID #${pass.passId} has been confirmed.`);
    }
  };

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Recommended Tours</Text>
            <Text style={styles.headerSubtitle}>Curated VIP private itineraries & expert guides</Text>
          </View>
        </View>

        <Pressable style={styles.moreBtn} onPress={() => router.push("/screens/settings" as any)}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
        </Pressable>
      </View>

      {/* Dynamic Filter Tabs */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
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
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tours Listing */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TRIP_BLUE, TRIP_PURPLE]} />}
      >
        <View style={styles.listingHeaderRow}>
          <View>
            <Text style={styles.listingHeading}>Featured Private Itineraries</Text>
            <Text style={styles.listingSubheading}>Visual accordions, meal indicators & group tier pricing</Text>
          </View>
          <View style={styles.inventoryCountBadge}>
            <Text style={styles.inventoryCountText}>{filteredTours.length} Available</Text>
          </View>
        </View>

        <View style={styles.toursStack}>
          {loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ListSkeleton count={3} type="card" />
            </View>
          ) : toursError ? (
            <ErrorStateCard title="Unable to load tours" message={toursError} retryText="Retry Tours" onRetry={loadGuidesAndTours} />
          ) : filteredTours.length === 0 ? (
            <EmptyStateView
              title="No Tours Available"
              description="No private tours match this category right now. Try switching categories or refreshing."
              actionText="Show All Tours"
              onAction={() => setActiveFilter("All")}
              icon="compass-outline"
            />
          ) : (
            filteredTours.map((tour) => {
              const slot = getSelectedSlot(tour.id);
              const size = getGroupSize(tour.id);
              const pricing = calculateGroupTierPricing(tour.price, size);
              const tourDaysExpanded = expandedItineraryDays[tour.id] || { 1: true };
              const selectedDate = getSelectedTourDate(tour.id);

              return (
                <View key={tour.id} style={styles.tourCard}>
                  {/* 1. Multi-Image Gallery Carousel with Pinch-to-Zoom */}
                  <TourImageCarousel
                    images={tour.galleryImages}
                    title={tour.title}
                    category={tour.category}
                    destination={`${tour.destination_city}, ${tour.destination_country}`}
                    rating={tour.rating}
                    reviewsCount={tour.reviews_count}
                    onOpenZoom={(idx) => {
                      setFullScreenModal({
                        visible: true,
                        images: tour.galleryImages,
                        index: idx,
                        title: tour.title,
                      });
                    }}
                  />

                  {/* Card Body */}
                  <View style={styles.cardBody}>
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
                        <View style={styles.tierStatusBadge}>
                          <Ionicons name="sparkles" size={11} color="#7C3AED" />
                          <Text style={styles.tierStatusBadgeText}>{pricing.tierBadge}</Text>
                        </View>
                      </View>
                    </View>

                    {/* 2. Package Inclusions & Exclusions (High-Contrast Tags) */}
                    <View style={styles.inclusionsExclusionsContainer}>
                      <View style={styles.tagSection}>
                        <View style={styles.tagSectionHeader}>
                          <Ionicons name="checkmark-circle" size={14} color="#059669" />
                          <Text style={styles.inclusionsSectionTitle}>INCLUSIONS (What's Covered)</Text>
                        </View>
                        <View style={styles.inclusionsRow}>
                          {tour.included_services.map((inc, incIdx) => (
                            <View key={incIdx} style={styles.inclusionHighContrastTag}>
                              <Ionicons name="checkmark-circle" size={13} color="#059669" />
                              <Text style={styles.inclusionHighContrastText} numberOfLines={1}>
                                {inc}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.tagSection}>
                        <View style={styles.tagSectionHeader}>
                          <Ionicons name="close-circle" size={14} color="#DC2626" />
                          <Text style={styles.exclusionsSectionTitle}>EXCLUSIONS (Not Included)</Text>
                        </View>
                        <View style={styles.exclusionsRow}>
                          {tour.not_included.map((exc, excIdx) => (
                            <View key={excIdx} style={styles.exclusionHighContrastTag}>
                              <Ionicons name="close-circle" size={13} color="#DC2626" />
                              <Text style={styles.exclusionHighContrastText} numberOfLines={1}>
                                {exc}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Live Destination Meteorological Conditions & Climate Snapshot */}
                    <WeatherWidget
                      location={tour.destination_city}
                      variant="compact"
                      style={{ marginVertical: 8 }}
                    />

                    {/* 3. Day-by-Day Visual Itinerary with Interactive Accordion & Meal Indicators */}
                    <View style={styles.itinerarySection}>
                      <View style={styles.itinerarySectionHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="calendar-outline" size={15} color={TRIP_BLUE} />
                          <Text style={styles.itinerarySectionTitle}>Day-by-Day Visual Itinerary</Text>
                        </View>
                        <Text style={styles.itineraryCountBadge}>{tour.itinerary.length} Days Schedule</Text>
                      </View>

                      {tour.itinerary.map((day) => {
                        const isExpanded = tourDaysExpanded[day.dayNumber] ?? false;
                        return (
                          <View key={day.dayNumber} style={styles.itineraryAccordionCard}>
                            <Pressable
                              style={styles.itineraryAccordionHeader}
                              onPress={() => toggleTourDayAccordion(tour.id, day.dayNumber)}
                            >
                              <View style={styles.dayPill}>
                                <Text style={styles.dayPillText}>DAY {day.dayNumber}</Text>
                              </View>
                              <Text style={styles.dayTitle} numberOfLines={1}>
                                {day.title}
                              </Text>
                              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
                            </Pressable>

                            {isExpanded && (
                              <View style={styles.itineraryAccordionBody}>
                                <Text style={styles.daySummary}>{day.summary}</Text>

                                {day.morning && (
                                  <View style={styles.timelineItem}>
                                    <View style={styles.timelineMarker}>
                                      <Ionicons name="sunny" size={12} color="#F59E0B" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.timelineLabel}>Morning (09:00 AM)</Text>
                                      <Text style={styles.timelineDesc}>{day.morning}</Text>
                                    </View>
                                  </View>
                                )}

                                {day.afternoon && (
                                  <View style={styles.timelineItem}>
                                    <View style={styles.timelineMarker}>
                                      <Ionicons name="partly-sunny" size={12} color="#2563EB" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.timelineLabel}>Afternoon (01:30 PM)</Text>
                                      <Text style={styles.timelineDesc}>{day.afternoon}</Text>
                                    </View>
                                  </View>
                                )}

                                {day.evening && (
                                  <View style={styles.timelineItem}>
                                    <View style={styles.timelineMarker}>
                                      <Ionicons name="moon" size={12} color="#7C3AED" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.timelineLabel}>Evening (06:30 PM)</Text>
                                      <Text style={styles.timelineDesc}>{day.evening}</Text>
                                    </View>
                                  </View>
                                )}

                                <View style={styles.mealIndicatorsBar}>
                                  <Text style={styles.mealBarLabel}>MEALS INCLUDED:</Text>
                                  <View style={styles.mealChipsRow}>
                                    <View style={[styles.mealBadge, day.meals.breakfast ? styles.mealBadgeActive : styles.mealBadgeInactive]}>
                                      <Ionicons
                                        name={day.meals.breakfast ? "checkmark-circle" : "close-circle-outline"}
                                        size={12}
                                        color={day.meals.breakfast ? "#059669" : "#94A3B8"}
                                      />
                                      <Text style={[styles.mealBadgeText, day.meals.breakfast && styles.mealBadgeTextActive]}>
                                        Breakfast {day.meals.breakfast ? "Included" : "Excluded"}
                                      </Text>
                                    </View>

                                    <View style={[styles.mealBadge, day.meals.lunch ? styles.mealBadgeActive : styles.mealBadgeInactive]}>
                                      <Ionicons
                                        name={day.meals.lunch ? "checkmark-circle" : "close-circle-outline"}
                                        size={12}
                                        color={day.meals.lunch ? "#059669" : "#94A3B8"}
                                      />
                                      <Text style={[styles.mealBadgeText, day.meals.lunch && styles.mealBadgeTextActive]}>
                                        Lunch {day.meals.lunch ? "Included" : "Excluded"}
                                      </Text>
                                    </View>

                                    <View style={[styles.mealBadge, day.meals.dinner ? styles.mealBadgeActive : styles.mealBadgeInactive]}>
                                      <Ionicons
                                        name={day.meals.dinner ? "checkmark-circle" : "close-circle-outline"}
                                        size={12}
                                        color={day.meals.dinner ? "#059669" : "#94A3B8"}
                                      />
                                      <Text style={[styles.mealBadgeText, day.meals.dinner && styles.mealBadgeTextActive]}>
                                        Dinner {day.meals.dinner ? "Included" : "Excluded"}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Assigned Guide Card with Direct Audio/Video Calls */}
                    <View style={styles.guideCard}>
                      <Pressable style={styles.guideLeftInfo} onPress={() => handleOpenGuideProfile(tour.guide.id)}>
                        <View style={styles.guideAvatarWrapper}>
                          <Image source={{ uri: tour.guide.avatar }} style={styles.guideAvatar} />
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

                      <View style={styles.guideActionsStack}>
                        <Pressable style={styles.guideProfileBtn} onPress={() => handleOpenGuideProfile(tour.guide.id)}>
                          <Ionicons name="person-outline" size={13} color="#2563EB" />
                          <Text style={styles.guideProfileBtnText}>Profile</Text>
                        </Pressable>

                        <View style={styles.guideCallGroup}>
                          <Pressable style={styles.callIconBtn} onPress={() => handleLaunchCall("audio", tour.guide)}>
                            <Ionicons name="call" size={14} color="#10B981" />
                          </Pressable>

                          <Pressable style={[styles.callIconBtn, styles.videoCallBtn]} onPress={() => handleLaunchCall("video", tour.guide)}>
                            <Ionicons name="videocam" size={15} color="#2563EB" />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    {/* Dynamic Date Selection Row */}
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionTitleRow}>
                        <Ionicons name="calendar" size={14} color={TRIP_BLUE} />
                        <Text style={styles.sectionBlockTitle}>Select Tour Date: <Text style={{ color: "#2563EB" }}>{selectedDate}</Text></Text>
                      </View>
                      <View style={styles.dateSelectorRow}>
                        {[
                          { label: "Tomorrow", offset: 1 },
                          { label: "+2 Days", offset: 2 },
                          { label: "This Weekend", offset: 4 },
                          { label: "Next Week", offset: 7 },
                        ].map((d) => (
                          <Pressable
                            key={d.label}
                            style={[
                              styles.dateOptionPill,
                              selectedDate.includes(
                                new Date(Date.now() + d.offset * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              ) && styles.dateOptionPillActive,
                            ]}
                            onPress={() => setSelectedTourDateOption(tour.id, d.offset)}
                          >
                            <Text
                              style={[
                                styles.dateOptionText,
                                selectedDate.includes(
                                  new Date(Date.now() + d.offset * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                ) && styles.dateOptionTextActive,
                              ]}
                            >
                              {d.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Time Slot Selection */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionBlockTitle}>Select Tour Time Slot</Text>
                      <View style={styles.timeSlotRow}>
                        <Pressable
                          style={[styles.timeSlotPill, slot === "morning" && styles.timeSlotPillActive]}
                          onPress={() => handleSelectSlot(tour.id, "morning")}
                        >
                          <View style={styles.timeSlotIconWrap}>
                            <Ionicons name="sunny" size={16} color={slot === "morning" ? "#2563EB" : "#F59E0B"} />
                          </View>
                          <View style={styles.timeSlotTextWrap}>
                            <Text style={[styles.timeSlotTitle, slot === "morning" && styles.timeSlotTitleActive]}>Morning Tour</Text>
                            <Text style={styles.timeSlotTime}>09:00 AM - 01:00 PM</Text>
                          </View>
                          {slot === "morning" && <Ionicons name="checkmark-circle" size={16} color="#2563EB" style={styles.timeSlotCheck} />}
                        </Pressable>

                        <Pressable
                          style={[styles.timeSlotPill, slot === "afternoon" && styles.timeSlotPillActive]}
                          onPress={() => handleSelectSlot(tour.id, "afternoon")}
                        >
                          <View style={styles.timeSlotIconWrap}>
                            <Ionicons name="partly-sunny" size={16} color={slot === "afternoon" ? "#2563EB" : "#EA580C"} />
                          </View>
                          <View style={styles.timeSlotTextWrap}>
                            <Text style={[styles.timeSlotTitle, slot === "afternoon" && styles.timeSlotTitleActive]}>Afternoon Tour</Text>
                            <Text style={styles.timeSlotTime}>02:00 PM - 06:00 PM</Text>
                          </View>
                          {slot === "afternoon" && <Ionicons name="checkmark-circle" size={16} color="#2563EB" style={styles.timeSlotCheck} />}
                        </Pressable>
                      </View>
                    </View>

                    {/* 4. Group Tier Pricing Calculator Box */}
                    <View style={styles.groupTierContainer}>
                      <View style={styles.groupTierHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groupTierHeading}>Group Tier Pricing</Text>
                          <Text style={styles.groupTierSub}>{pricing.nextTierHint}</Text>
                        </View>
                        <View style={styles.groupTierActiveBadge}>
                          <Ionicons name="people" size={12} color="#059669" />
                          <Text style={styles.groupTierActiveBadgeText}>{pricing.tierBadge}</Text>
                        </View>
                      </View>

                      {/* Visual Tier Step Progression */}
                      <View style={styles.tierProgressionBar}>
                        <View style={[styles.tierStep, pricing.tierIndex >= 1 && styles.tierStepActive]}>
                          <View style={[styles.tierStepCircle, pricing.tierIndex >= 1 && styles.tierStepCircleActive]}>
                            <Text style={styles.tierStepNum}>1</Text>
                          </View>
                          <Text style={styles.tierStepLabel}>1-2 (Base/5%)</Text>
                        </View>
                        <View style={[styles.tierStepLine, pricing.tierIndex >= 2 && styles.tierStepLineActive]} />
                        <View style={[styles.tierStep, pricing.tierIndex >= 2 && styles.tierStepActive]}>
                          <View style={[styles.tierStepCircle, pricing.tierIndex >= 2 && styles.tierStepCircleActive]}>
                            <Text style={styles.tierStepNum}>2</Text>
                          </View>
                          <Text style={styles.tierStepLabel}>3-5 (10% OFF)</Text>
                        </View>
                        <View style={[styles.tierStepLine, pricing.tierIndex >= 3 && styles.tierStepLineActive]} />
                        <View style={[styles.tierStep, pricing.tierIndex >= 3 && styles.tierStepActive]}>
                          <View style={[styles.tierStepCircle, pricing.tierIndex >= 3 && styles.tierStepCircleActive]}>
                            <Text style={styles.tierStepNum}>3</Text>
                          </View>
                          <Text style={styles.tierStepLabel}>6+ (20% OFF)</Text>
                        </View>
                      </View>

                      {/* Quick Tier Selection Buttons */}
                      <View style={styles.quickTierPillsRow}>
                        <Pressable
                          style={[styles.quickTierBtn, size <= 2 && styles.quickTierBtnActive]}
                          onPress={() => setExplicitGroupSize(tour.id, 2)}
                        >
                          <Text style={[styles.quickTierBtnText, size <= 2 && styles.quickTierBtnTextActive]}>1-2 Guests</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.quickTierBtn, size >= 3 && size <= 5 && styles.quickTierBtnActive]}
                          onPress={() => setExplicitGroupSize(tour.id, 4)}
                        >
                          <Text style={[styles.quickTierBtnText, size >= 3 && size <= 5 && styles.quickTierBtnTextActive]}>
                            3-5 Guests (10% OFF)
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[styles.quickTierBtn, size >= 6 && styles.quickTierBtnActive]}
                          onPress={() => setExplicitGroupSize(tour.id, 6)}
                        >
                          <Text style={[styles.quickTierBtnText, size >= 6 && styles.quickTierBtnTextActive]}>6+ Group (20% OFF)</Text>
                        </Pressable>
                      </View>

                      {/* Stepper Control */}
                      <View style={styles.stepperWrapRow}>
                        <Text style={styles.stepperHeadingLabel}>Custom Group Size:</Text>
                        <View style={styles.stepperWrap}>
                          <Pressable
                            style={[styles.stepperBtn, size <= 1 && styles.stepperBtnDisabled]}
                            onPress={() => handleGroupSizeChange(tour.id, -1)}
                            disabled={size <= 1}
                          >
                            <Ionicons name="remove" size={16} color={size <= 1 ? "#9CA3AF" : "#111827"} />
                          </Pressable>

                          <View style={styles.stepperValueBox}>
                            <Text style={styles.stepperValueText}>{size}</Text>
                            <Text style={styles.stepperSubText}>{size === 1 ? "Guest" : "Guests"}</Text>
                          </View>

                          <Pressable
                            style={[styles.stepperBtn, size >= 20 && styles.stepperBtnDisabled]}
                            onPress={() => handleGroupSizeChange(tour.id, 1)}
                            disabled={size >= 20}
                          >
                            <Ionicons name="add" size={16} color="#111827" />
                          </Pressable>
                        </View>
                      </View>

                      {/* Pricing Breakdown & Action Row */}
                      <View style={styles.priceCalculationRow}>
                        <View>
                          <View style={styles.originalSubtotalRow}>
                            {pricing.discountPercent > 0 && (
                              <Text style={styles.oldSubtotalText}>{formatCurrency(pricing.baseRatePerPerson, tour.currency)}</Text>
                            )}
                            <Text style={styles.discountedRateBig}>{formatCurrency(pricing.discountedRatePerPerson, tour.currency)}</Text>
                            <Text style={styles.rateGuestLabel}>/ guest</Text>
                          </View>
                          <Text style={styles.totalForGuestsSummary}>
                            Total: <Text style={{ fontWeight: "800", color: "#111827" }}>{formatCurrency(pricing.totalAmount, tour.currency)}</Text> for {size} guests
                            {pricing.totalSavings > 0 && (
                              <Text style={{ color: "#059669", fontWeight: "700" }}> (Save {formatCurrency(pricing.totalSavings, tour.currency)})</Text>
                            )}
                          </Text>
                        </View>

                        <Pressable style={styles.bookTourBtn} onPress={() => handleBookTour(tour)}>
                          <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.bookTourBtnText}>Book Tour</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Full-Screen Pinch-to-Zoom Image Preview Modal */}
      <FullScreenImageModal
        visible={fullScreenModal.visible}
        images={fullScreenModal.images}
        initialIndex={fullScreenModal.index}
        title={fullScreenModal.title}
        onClose={() => setFullScreenModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Digital Tour Pass Modal */}
      {digitalPass && (
        <Modal visible={passModalVisible} transparent animationType="slide" onRequestClose={() => setPassModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.passCardModal, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
              <View style={styles.passModalTopBar}>
                <View style={styles.passVerifiedChip}>
                  <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
                  <Text style={styles.passVerifiedText}>OFFICIAL TOUR PASS</Text>
                </View>
                <Pressable style={styles.closeModalBtn} onPress={() => setPassModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#4B5563" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.passScrollArea}>
                <View style={styles.passTicketShell}>
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketLogoRow}>
                      <Ionicons name="airplane" size={18} color="#FFFFFF" />
                      <Text style={styles.ticketBrand}>TRIP.COM PASS</Text>
                    </View>
                    <Text style={styles.ticketIdBadge}>#{digitalPass.passId}</Text>
                  </View>

                  <View style={styles.ticketBody}>
                    <Text style={styles.ticketTourTitle}>{digitalPass.tourTitle}</Text>
                    <View style={styles.ticketDestRow}>
                      <Ionicons name="location-sharp" size={14} color="#6B7280" />
                      <Text style={styles.ticketDestText}>{digitalPass.destination}</Text>
                    </View>

                    {/* Schedule & Travelers */}
                    <View style={styles.ticketGrid}>
                      <View style={styles.ticketGridCol}>
                        <Text style={styles.ticketLabel}>SCHEDULE</Text>
                        <Text style={styles.ticketValPrimary}>{digitalPass.timeSlotLabel}</Text>
                        <Text style={styles.ticketValSub}>{digitalPass.date} · {digitalPass.timeSlotHours}</Text>
                      </View>

                      <View style={styles.ticketGridCol}>
                        <Text style={styles.ticketLabel}>TRAVELERS</Text>
                        <Text style={styles.ticketValPrimary}>
                          {digitalPass.groupSize} {digitalPass.groupSize === 1 ? "Traveler" : "Travelers"}
                        </Text>
                        {digitalPass.discountPercent > 0 && (
                          <Text style={styles.ticketDiscountTag}>{digitalPass.discountPercent}% Group Saver</Text>
                        )}
                      </View>
                    </View>

                    {/* Guide Card in Pass */}
                    <View style={styles.ticketGuideCard}>
                      <Image source={{ uri: digitalPass.guide.avatar }} style={styles.ticketGuideAvatar} />
                      <View style={styles.ticketGuideInfo}>
                        <Text style={styles.ticketGuideHeaderLabel}>ASSIGNED TOUR GUIDE</Text>
                        <Text style={styles.ticketGuideName}>{digitalPass.guide.name}</Text>
                        <Text style={styles.ticketGuideRole}>{digitalPass.guide.badge}</Text>
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

                    {/* Inclusions & Exclusions Summary */}
                    <View style={styles.passTagsSection}>
                      <Text style={styles.ticketLabel}>HIGH-CONTRAST INCLUSIONS</Text>
                      <View style={styles.passTagsWrap}>
                        {digitalPass.inclusions.slice(0, 3).map((item, i) => (
                          <View key={i} style={styles.passInclusionChip}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.passInclusionChipText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Scannable QR Code */}
                    <View style={styles.qrCodeSection}>
                      <View style={styles.qrWrapper}>
                        <QRCode value={digitalPass.qrPayload} size={110} color="#0F172A" backgroundColor="#FFFFFF" />
                      </View>
                      <Text style={styles.qrInstruction}>Scan at meeting point for instant pass check-in</Text>
                    </View>

                    {/* Amount Due Bar */}
                    <View style={styles.ticketAmountRow}>
                      <View>
                        <Text style={styles.ticketLabel}>TOTAL PAYABLE</Text>
                        <Text style={styles.ticketAmountValue}>{formatCurrency(digitalPass.totalAmount, digitalPass.currency)}</Text>
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
                  <Pressable style={styles.proceedPaymentBtn} onPress={() => handleProceedToPayment(digitalPass)}>
                    <Ionicons name="card" size={20} color="#FFFFFF" />
                    <Text style={styles.proceedPaymentBtnText}>
                      Proceed to Payment ({formatCurrency(digitalPass.totalAmount, digitalPass.currency)})
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>

                  <Pressable style={styles.sharePassBtn} onPress={() => handleSharePass(digitalPass)}>
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

// ============================================================================
// Stylesheet
// ============================================================================

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
    gap: 18,
  },
  tourCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardBody: {
    padding: 16,
  },
  titleMetaSection: {
    marginBottom: 12,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 6,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  badgeInstantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeInstantText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  tierStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
  },

  // Inclusions & Exclusions
  inclusionsExclusionsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  tagSection: {},
  tagSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  inclusionsSectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#065F46",
    letterSpacing: 0.5,
  },
  exclusionsSectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#991B1B",
    letterSpacing: 0.5,
  },
  inclusionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  inclusionHighContrastTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inclusionHighContrastText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  exclusionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  exclusionHighContrastTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exclusionHighContrastText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
  },

  // Itinerary Section
  itinerarySection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 14,
  },
  itinerarySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itinerarySectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  itineraryCountBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  itineraryAccordionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 6,
    overflow: "hidden",
  },
  itineraryAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  dayPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayPillText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#2563EB",
  },
  dayTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  itineraryAccordionBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  daySummary: {
    fontSize: 11,
    color: "#475569",
    marginTop: 6,
    lineHeight: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 8,
  },
  timelineMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },
  timelineDesc: {
    fontSize: 11,
    color: "#475569",
    marginTop: 1,
    lineHeight: 15,
  },
  mealIndicatorsBar: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mealBarLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#64748B",
    marginBottom: 4,
  },
  mealChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealBadgeActive: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  mealBadgeInactive: {
    backgroundColor: "#F1F5F9",
  },
  mealBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  mealBadgeTextActive: {
    color: "#059669",
  },

  // Guide Card
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 14,
  },
  guideLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  guideAvatarWrapper: {
    position: "relative",
  },
  guideAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
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
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  guideActionsStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  guideProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guideProfileBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  guideCallGroup: {
    flexDirection: "row",
    gap: 6,
  },
  callIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  videoCallBtn: {
    backgroundColor: "#EFF6FF",
  },

  // Date selection
  sectionBlock: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  sectionBlockTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  dateSelectorRow: {
    flexDirection: "row",
    gap: 6,
  },
  dateOptionPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  dateOptionPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  dateOptionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  dateOptionTextActive: {
    color: "#2563EB",
    fontWeight: "900",
  },

  // Time Slot
  timeSlotRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeSlotPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  timeSlotPillActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  timeSlotIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotTextWrap: {
    flex: 1,
  },
  timeSlotTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B",
  },
  timeSlotTitleActive: {
    color: "#1D4ED8",
  },
  timeSlotTime: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 1,
  },
  timeSlotCheck: {
    marginLeft: 2,
  },

  // Group Tier Pricing Box
  groupTierContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  groupTierHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupTierHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  groupTierSub: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 1,
  },
  groupTierActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupTierActiveBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#065F46",
  },
  tierProgressionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  tierStep: {
    alignItems: "center",
    gap: 2,
  },
  tierStepActive: {},
  tierStepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  tierStepCircleActive: {
    backgroundColor: "#2563EB",
  },
  tierStepNum: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  tierStepLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },
  tierStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
    marginBottom: 10,
  },
  tierStepLineActive: {
    backgroundColor: "#2563EB",
  },
  quickTierPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  quickTierBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  quickTierBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  quickTierBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  quickTierBtnTextActive: {
    color: "#2563EB",
    fontWeight: "900",
  },
  stepperWrapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepperHeadingLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperValueBox: {
    paddingHorizontal: 8,
    alignItems: "center",
  },
  stepperValueText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepperSubText: {
    fontSize: 8,
    color: "#64748B",
  },
  priceCalculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  originalSubtotalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  oldSubtotalText: {
    fontSize: 11,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  discountedRateBig: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  rateGuestLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  totalForGuestsSummary: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },
  bookTourBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookTourBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Digital Tour Pass Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  passCardModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  passModalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  passVerifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  passVerifiedText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 0.5,
  },
  closeModalBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  passScrollArea: {
    paddingBottom: 24,
  },
  passTicketShell: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  ticketHeader: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ticketBrand: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  ticketIdBadge: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  ticketBody: {
    padding: 16,
    gap: 12,
  },
  ticketTourTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketDestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ticketDestText: {
    fontSize: 12,
    color: "#64748B",
  },
  ticketGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 10,
  },
  ticketGridCol: {
    flex: 1,
  },
  ticketLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  ticketValPrimary: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketValSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  ticketDiscountTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    marginTop: 2,
  },
  ticketGuideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  ticketGuideAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  ticketGuideInfo: {
    flex: 1,
  },
  ticketGuideHeaderLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#64748B",
  },
  ticketGuideName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketGuideRole: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "700",
  },
  ticketGuideCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  passTagsSection: {
    gap: 6,
  },
  passTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  passInclusionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  passInclusionChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065F46",
  },
  qrCodeSection: {
    alignItems: "center",
    paddingVertical: 8,
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
