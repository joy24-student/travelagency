import { AppImage } from "../components/ui/AppImage";
import { generateReferenceCode } from "../utils/idGenerator";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Alert,
  ActivityIndicator,
  Animated,
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
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../hooks/useAuth";
import { bookingRepository } from "../services/repositories/booking";
import { travelRepository } from "../repositories";
import { useBookingStore } from "../store/bookingStore";
import { supabase } from "../utils/supabase";
import { TopBar } from "./TopBar";
import { savedItemsService } from "../services/savedItemsService";
import { screens, type UIScreen } from "../data/screens";
import { WeatherWidget } from "../components/weather/WeatherWidget";
import { ErrorStateCard, EmptyStateView, StickyHeader, ResultsSummaryHeader, ComparisonModal, ComparisonItem } from "../components/common";

import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const TRIP_PURPLE = "#7C3AED";
const TRIP_EMERALD = "#059669";
const TRIP_ROSE = "#DC2626";

// ============================================================================
// Types & Models
// ============================================================================

export interface FlightLegDetail {
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  route: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  cabinClass: string;
  baggageAllowance: string;
  aircraft: string;
  isDirect: boolean;
}

export interface HotelPackageDetail {
  name: string;
  stars: number;
  address: string;
  roomType: string;
  bedSetup: string;
  amenities: string[];
  image: string;
  checkInTime: string;
  checkOutTime: string;
}

export interface ItineraryDay {
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

export interface PackageAddon {
  id: string;
  name: string;
  description: string;
  pricePerPerson: number;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface VacationPackage {
  id: string;
  name: string;
  slug: string;
  destinationCity: string;
  destinationCountry: string;
  departureCity: string;
  duration: string;
  durationDays: number;
  category: string;
  badge: string;
  rating: number;
  reviewsCount: number;
  image: string;
  galleryImages: string[];
  pricePerPerson: number;
  originalPricePerPerson: number;
  currency: string;
  flight: FlightLegDetail;
  hotel: HotelPackageDetail;
  inclusions: string[];
  exclusions: string[];
  meals: string[];
  itinerary: ItineraryDay[];
  addons: PackageAddon[];
  cancellationPolicy: string;
  seatsLeft: number;
  provider: string;
}

export interface AirportOption {
  code: string;
  city: string;
  airport: string;
  country: string;
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

// ============================================================================
// Group Tier Pricing Calculator
// Requirements:
// 1-2 persons: standard/duo rate (1: base, 2: 5% duo saver)
// 3-5 persons: small group discount (10% off per person)
// 6+ persons: group discount (20% off per person)
// ============================================================================

export function calculateGroupTierPricing(baseRatePerPerson: number, groupSize: number): GroupTierPricingResult {
  const safeGroupSize = Math.max(1, Math.round(groupSize));
  let discountPercent = 0;
  let tierIndex = 1;
  let tierLabel = "Standard Rate (1 Guest)";
  let tierBadge = "Standard Tier";
  let nextTierHint = "Add 1 more guest to unlock 5% Duo discount!";

  if (safeGroupSize >= 6) {
    discountPercent = 20;
    tierIndex = 3;
    tierLabel = "6+ Group Super Saver (20% OFF)";
    tierBadge = "Tier 3: 20% Group Discount";
    nextTierHint = "Maximum 20% group discount applied!";
  } else if (safeGroupSize >= 3) {
    discountPercent = 10;
    tierIndex = 2;
    tierLabel = "3-5 Group Discount (10% OFF)";
    tierBadge = "Tier 2: 10% Group Saver";
    const needed = 6 - safeGroupSize;
    nextTierHint = `Add ${needed} more guest${needed > 1 ? "s" : ""} to unlock 20% Group Discount!`;
  } else if (safeGroupSize === 2) {
    discountPercent = 5;
    tierIndex = 1;
    tierLabel = "Duo Traveler Special (5% OFF)";
    tierBadge = "Tier 1: Duo Saver";
    nextTierHint = "Add 1 more guest to unlock 10% Group Discount!";
  } else {
    discountPercent = 0;
    tierIndex = 1;
    tierLabel = "Solo Explorer (1 Guest)";
    tierBadge = "Standard Rate";
    nextTierHint = "Add 1 guest for 5% Duo discount or 2 guests for 10% off!";
  }

  const discountedRatePerPerson = Math.round(baseRatePerPerson * (1 - discountPercent / 100));
  const subtotalBeforeDiscount = baseRatePerPerson * safeGroupSize;
  const totalAmount = discountedRatePerPerson * safeGroupSize;
  const totalSavings = subtotalBeforeDiscount - totalAmount;

  return {
    groupSize: safeGroupSize,
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
      console.warn("travelRepository.getTourPackages Supabase query notice:", e);
    }

    try {
      const featured = await travelRepository.getFeaturedTours(options?.limit || 20, options);
      if (featured && featured.length > 0) {
        return featured;
      }
      return [];
    } catch (e) {
      throw e;
    }
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
    } catch (parseErr) {
      // Fall back to delimiter splitting
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

function parseItineraryField(rawItinerary: any, city: string, durationDays: number): ItineraryDay[] | null {
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
        title: d.title || `Day ${dayNum}: ${city} Exploration & Culture`,
        summary: d.summary || d.description || `Curated sightseeing schedule in ${city}.`,
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
    } catch (parseErr) {
      // Fall back to empty itinerary
    }
  }
  return null;
}

function generateDynamicItinerary(
  t: any,
  city: string,
  country: string,
  durationDays: number,
  highlights: string[]
): ItineraryDay[] {
  if (t.itinerary) {
    const parsed = parseItineraryField(t.itinerary, city, durationDays);
    if (parsed && parsed.length > 0) return parsed;
  }

  const days: ItineraryDay[] = [];
  const totalDays = Math.max(1, durationDays);

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    if (dayNum === 1) {
      days.push({
        dayNumber: 1,
        title: `Day 1: VIP Arrival in ${city} & Resort Check-in`,
        summary: `VIP airport greeting, luxury private chauffeur transfer to hotel, and sunset welcome reception.`,
        morning: `VIP greeting at airport arrival gate with luxury private chauffeur transfer.`,
        afternoon: `Smooth priority check-in at 5-star partner resort, signature welcome drink, and poolside relaxation.`,
        evening: `Scenic twilight coastal viewpoint walk followed by an exclusive curated welcome dinner.`,
        mealsIncluded: "Dinner",
        meals: { breakfast: false, lunch: false, dinner: true },
      });
    } else if (dayNum === totalDays && totalDays > 1) {
      days.push({
        dayNumber: totalDays,
        title: `Day ${totalDays}: Artisan Bazaars & Departure Transfer`,
        summary: `Farewell buffet breakfast, artisan souvenir shopping, and private airport departure transfer.`,
        morning: `Gourmet breakfast buffet, hotel check-out assistance & luggage concierge.`,
        afternoon: `Visit to authentic local artisan bazaars for handcrafted souvenirs & tax-free shopping.`,
        evening: `Chauffeur drop-off at departure terminal with priority fast-track check-in assistance.`,
        mealsIncluded: "Breakfast",
        meals: { breakfast: true, lunch: false, dinner: false },
      });
    } else {
      const hl1 = highlights[(dayNum - 2) % Math.max(1, highlights.length)] || `${city} Cultural Wonders`;
      const hl2 = highlights[(dayNum - 1) % Math.max(1, highlights.length)] || `Scenic Natural Panoramas`;

      const hasLunch = dayNum % 2 === 0;
      const hasDinner = dayNum % 2 !== 0;
      const mealsIncluded = `Breakfast${hasLunch ? ", Lunch" : ""}${hasDinner ? ", Dinner" : ""}`;

      days.push({
        dayNumber: dayNum,
        title: `Day ${dayNum}: Guided Excursion — ${hl1}`,
        summary: `Full-day immersive adventure exploring ${hl1} and ${hl2} with expert guide.`,
        morning: `Buffet breakfast followed by guided visit to ${hl1} with VIP monument passes.`,
        afternoon: `Guided exploration of ${hl2} with an authentic regional gastronomic lunch.`,
        evening: hasDinner
          ? `Gourmet rooftop dining experience showcasing chef-curated seasonal dishes.`
          : `Leisure evening for sunset strolling, vibrant night markets, and live street performances.`,
        mealsIncluded,
        meals: { breakfast: true, lunch: hasLunch, dinner: hasDinner },
      });
    }
  }

  return days;
}

function buildCuratedGallery(city: string, primaryImg: string, additionalUrls?: string[]): string[] {
  if (Array.isArray(additionalUrls) && additionalUrls.length > 1) {
    return additionalUrls;
  }
  const cityKey = (city || "").toLowerCase();
  if (cityKey.includes("cox") || cityKey.includes("beach") || cityKey.includes("island")) {
    return [
      primaryImg,
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    ];
  }
  if (cityKey.includes("maldives") || cityKey.includes("bali") || cityKey.includes("phuket")) {
    return [
      primaryImg,
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800",
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800",
    ];
  }
  return [
    primaryImg,
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
    "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800",
  ];
}

function mapTourToPackage(t: any, defaultOriginCity = "Dhaka"): VacationPackage {
  const priceNum = Number(t.price || t.price_per_person || t.base_price) || 280;
  const origPriceNum = Number(t.original_price) || Math.round(priceNum * 1.3);
  const city = t.destination_city || t.city || "Scenic City";
  const country = t.destination_country || t.country || "Global";
  const days = Number(t.duration_days) || 4;
  const departureCity = t.departure_city || defaultOriginCity;

  const image =
    (Array.isArray(t.image_urls) && t.image_urls[0]) ||
    t.image_url ||
    t.featured_image ||
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800";

  const gallery = buildCuratedGallery(city, image, t.image_urls);

  const parsedHighlights = parseArrayField(t.highlights, [
    `${city} Historic Landmarks & Heritage Sites`,
    "Scenic Viewpoints & Coastal Lookouts",
    "Artisan Bazaars & Traditional Crafts",
    "Authentic Regional Gastronomy Tasting",
  ]);

  const parsedInclusions = parseArrayField(t.included_services || t.inclusions, [
    "Hotel: 5-Star Luxury Accommodations with Ocean / City View",
    "Transport: Round-trip Flights & Private Airport Chauffeur",
    "Guide: Certified Professional English-Speaking Local Guide",
    "Sightseeing: All Monument, Museum & National Park Entrance Fees",
    "Meals: Daily Gourmet Buffet Breakfast & Welcome Dinner",
    "Activities: Guided Excursions with Private Air-Conditioned Coach",
  ]);

  const parsedExclusions = parseArrayField(t.not_included || t.exclusions, [
    "Visa: International Visa Processing Fees & Expedited Service",
    "Expenses: Personal Souvenirs & Shopping Purchases",
    "Insurance: Comprehensive Travel, Medical & Baggage Protection",
    "Gratuities: Driver & Guide Discretionary Tips",
  ]);

  const itinerary = generateDynamicItinerary(t, city, country, days, parsedHighlights);

  const category =
    t.category ||
    (city.toLowerCase().includes("beach") || city.toLowerCase().includes("cox") || city.toLowerCase().includes("maldives")
      ? "Beach & Tropical"
      : days >= 5
      ? "Flight + Hotel"
      : "City Break");

  const hotelStars = Number(t.hotel_stars) || 5;
  const currency = t.currency || "USD";

  return {
    id: t.id || `pkg-${generateReferenceCode("PKG")}`,
    name: t.title || `${city} Escape: Luxury Flight + 5-Star Hotel Bundle`,
    slug: t.slug || t.id,
    destinationCity: city,
    destinationCountry: country,
    departureCity,
    duration: t.duration_text || `${days} Days / ${Math.max(1, days - 1)} Nights`,
    durationDays: days,
    category,
    badge: t.is_featured ? "VERIFIED BUNDLE" : "TOP RATED",
    rating: Number(t.rating) || 4.9,
    reviewsCount: Number(t.reviews_count) || 164,
    image,
    galleryImages: gallery,
    pricePerPerson: priceNum,
    originalPricePerPerson: origPriceNum,
    currency,
    flight: {
      airline: t.airline || "Partner Airline Express",
      airlineLogo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100",
      flightNumber: t.flight_number || `FL-${city.slice(0, 3).toUpperCase()}-101`,
      route: `${departureCity.slice(0, 3).toUpperCase()} ➔ ${city.slice(0, 3).toUpperCase()}`,
      departureAirport: `${departureCity} International Airport`,
      arrivalAirport: `${city} International Airport`,
      duration: t.flight_duration || "1h 45m Nonstop",
      cabinClass: t.cabin_class || "Economy Class (Upgradable)",
      baggageAllowance: t.baggage_allowance || "30kg Checked + 7kg Cabin",
      aircraft: t.aircraft || "Boeing 737-800 Modern Jet",
      isDirect: true,
    },
    hotel: {
      name: t.hotel_name || `${city} Grand Palace Resort & Spa`,
      stars: hotelStars,
      address: t.hotel_address || `Prime Scenic Promenade, ${city}, ${country}`,
      roomType: t.room_type || "Deluxe Ocean Panorama Suite",
      bedSetup: t.bed_setup || "1 King Bed or 2 Twin Beds",
      amenities: parseArrayField(t.hotel_amenities, [
        "Free High-Speed Wi-Fi (500 Mbps)",
        "Daily Gourmet Buffet Breakfast Included",
        "Infinity Oceanview Heated Pool",
        "Full-Service Luxury Spa & Sauna",
        "24/7 Concierge & Private Airport Pick-up",
      ]),
      image: gallery[1] || image,
      checkInTime: t.check_in_time || "14:00",
      checkOutTime: t.check_out_time || "12:00",
    },
    inclusions: parsedInclusions,
    exclusions: parsedExclusions,
    meals: ["Daily Gourmet Buffet Breakfast", "Curated Welcome Dinner"],
    itinerary,
    addons: [
      {
        id: "addon-insurance",
        name: "Comprehensive Travel & Medical Shield",
        description: "Full emergency medical, lost luggage & flight delay protection",
        pricePerPerson: Math.round(priceNum * 0.08) || 25,
        icon: "shield-checkmark-outline",
      },
      {
        id: "addon-esim",
        name: "Unlimited 5G International eSIM",
        description: "High-speed unlimited local data & calls throughout the package",
        pricePerPerson: Math.round(priceNum * 0.05) || 18,
        icon: "wifi-outline",
      },
      {
        id: "addon-vip-lounge",
        name: "VIP Airport Lounge & Fast-Track Access",
        description: "Complimentary gourmet dining, refreshments & priority boarding",
        pricePerPerson: Math.round(priceNum * 0.1) || 35,
        icon: "airplane-outline",
      },
    ],
    cancellationPolicy: t.cancellation_policy || "100% Free Cancellation up to 7 days before departure. Instant automated refund.",
    seatsLeft: typeof t.seats_left === "number" ? Math.max(0, t.seats_left) : t.max_participants ? Math.max(0, t.max_participants - (t.current_participants || 0)) : (t.is_available === false ? 0 : 8),
    provider: t.guide_name ? `${t.guide_name} Holidays` : "Trip.com Certified Luxury Partner",
  };
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
        message: `Check out this photo from "${title}":\n${currentImage}`,
        url: currentImage,
      });
    } catch (shareErr) {
      console.warn("[PackageScreen] Share error:", shareErr);
    }
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
                  key={`zoom-thumb-${imgUrl}-${idx}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrentIndex(idx);
                  }}
                  style={[zoomStyles.thumbWrapper, isSelected && zoomStyles.thumbWrapperSelected]}
                >
                  <AppImage source={{ uri: imgUrl }} placeholderCategory="package" style={zoomStyles.thumbImage} />
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
    fontSize: 12,
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
    fontSize: 12,
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
// Image Gallery Carousel Component
// ============================================================================

interface ImageCarouselProps {
  images: string[];
  title: string;
  badge?: string;
  onOpenZoom: (index: number) => void;
  isFav?: boolean;
  onToggleFav?: () => void;
}

function ImageGalleryCarousel({ images, title, badge, onOpenZoom, isFav, onToggleFav }: ImageCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (SCREEN_WIDTH - 32));
    if (index !== activeIdx && index >= 0 && index < images.length) {
      setActiveIdx(index);
    }
  };

  return (
    <View style={carouselStyles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={carouselStyles.scrollView}
      >
        {images.map((img, i) => (
          <Pressable key={`slide-${img}-${i}`} onPress={() => onOpenZoom(i)} style={carouselStyles.slide}>
            <AppImage source={{ uri: img }} placeholderCategory="package" style={carouselStyles.image} />
            <LinearGradient colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Top Badges */}
      <View style={carouselStyles.topRow}>
        {badge ? (
          <View style={carouselStyles.badgePill}>
            <Ionicons name="sparkles" size={11} color="#FACC15" />
            <Text style={carouselStyles.badgeText}>{badge}</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={carouselStyles.zoomTriggerBtn}
            onPress={() => {
              Haptics.selectionAsync();
              onOpenZoom(activeIdx);
            }}
          >
            <Ionicons name="expand" size={16} color="#FFFFFF" />
            <Text style={carouselStyles.zoomTriggerText}>Zoom</Text>
          </Pressable>

          {onToggleFav && (
            <Pressable
              style={carouselStyles.heartBtn}
              onPress={(e) => {
                e.stopPropagation();
                onToggleFav();
              }}
            >
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#EF4444" : "#FFFFFF"} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Bottom Paging Dots & Image Count Badge */}
      <View style={carouselStyles.bottomControlsRow}>
        <View style={carouselStyles.dotsRow}>
          {images.map((_, dotIdx) => (
            <View key={dotIdx} style={[carouselStyles.dot, dotIdx === activeIdx && carouselStyles.dotActive]} />
          ))}
        </View>

        <Pressable style={carouselStyles.counterBadge} onPress={() => onOpenZoom(activeIdx)}>
          <Ionicons name="images-outline" size={12} color="#FFFFFF" />
          <Text style={carouselStyles.counterBadgeText}>
            {activeIdx + 1} / {images.length}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const carouselStyles = StyleSheet.create({
  container: {
    width: "100%",
    height: 200,
    position: "relative",
    backgroundColor: "#1F2937",
  },
  scrollView: {
    width: "100%",
    height: "100%",
  },
  slide: {
    width: "100%",
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
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FACC15",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  zoomTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  zoomTriggerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  heartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomControlsRow: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FACC15",
  },
  counterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});

// ============================================================================
// Main PackageScreen Component
// ============================================================================

export function PackageScreen({ screen }: { screen?: UIScreen } = {}) {
  const { colors, isDark } = useTheme();
  const activeScreen = screen ?? screens.find((s) => s.slug === "packages") ?? screens[0];
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Core package state
  const [packages, setPackages] = useState<VacationPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [originAirport, setOriginAirport] = useState<AirportOption>({
    code: "DAC",
    city: "Dhaka",
    airport: "Hazrat Shahjalal Int'l (DAC)",
    country: "Bangladesh",
  });
  const [selectedDestination, setSelectedDestination] = useState<string>("All Destinations");
  const [activeCategory, setActiveCategory] = useState<string>("All Packages");
  const [activeDuration, setActiveDuration] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Group size state
  const [travelersCount, setTravelersCount] = useState<number>(2);

  // Comparison State
  const [comparePackageIds, setComparePackageIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleComparePackage = useCallback((pkgId: string) => {
    Haptics.selectionAsync();
    setComparePackageIds((prev) => {
      if (prev.includes(pkgId)) return prev.filter((id) => id !== pkgId);
      if (prev.length >= 4) {
        Alert.alert("তুলনা সীমা", "সর্বোচ্চ ৪টি প্যাকেজ একসাথে তুলনা করতে পারবেন।");
        return prev;
      }
      return [...prev, pkgId];
    });
  }, []);

  const packageComparisonItems: ComparisonItem[] = useMemo(() => {
    return packages
      .filter((p) => comparePackageIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.durationDays} দিন / ${p.durationNights} রাত • ${p.destination}`,
        price: p.basePrice,
        priceUnit: "/জন",
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        specs: [
          { label: "গন্তব্য", value: p.destination },
          { label: "হোটেল", value: p.hotel?.name || "পার্টনার হোটেল" },
          { label: "খাবার", value: p.mealsIncluded ? "অন্তর্ভুক্ত" : "ব্যক্তিগত" },
          { label: "সিট বাকি", value: `${p.seatsLeft}টি` },
        ],
        features: p.inclusions || [],
        policies: [p.cancellationPolicy || "শর্ত প্রযোজ্য"],
      }));
  }, [packages, comparePackageIds]);

  // Modals state
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [airportSearchText, setAirportSearchText] = useState("");
  const [destSearchText, setDestSearchText] = useState("");

  // Full-Screen Image Preview Modal State
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

  // Drawer / Details modal state
  const [selectedPackage, setSelectedPackage] = useState<VacationPackage | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"Overview" | "Itinerary" | "Inclusions" | "Flights & Hotel" | "Group Pricing">("Overview");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 1: true });
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  // Animation values for drawer
  const drawerSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const drawerBackdropAnim = useRef(new Animated.Value(0)).current;

  // --------------------------------------------------------------------------
  // Data Fetching: Connect to travelRepository.getTourPackages()
  // --------------------------------------------------------------------------

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const repo = travelRepository as typeof travelRepository & ITravelRepositoryWithPackages;
      const rawData = await repo.getTourPackages({ limit: 50 });

      if (rawData && rawData.length > 0) {
        const mapped: VacationPackage[] = rawData.map((item) => mapTourToPackage(item, originAirport.city));
        setPackages(mapped);
      } else {
        setPackages([]);
      }
    } catch (err: any) {
      console.warn("Error fetching tour packages from travelRepository:", err);
      setFetchError(err?.message || "Failed to load packages. Please check your network connection.");
      setPackages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPackages();

    const channel = supabase
      .channel("packages-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
        fetchPackages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchPackages();
  };

  // --------------------------------------------------------------------------
  // Dynamically Derived Catalogs (No Rigid Hardcoding)
  // --------------------------------------------------------------------------

  const dynamicDestinations = useMemo(() => {
    const list: { name: string; country: string }[] = [{ name: "All Destinations", country: "Global" }];
    const seen = new Set<string>(["all destinations"]);

    packages.forEach((pkg) => {
      const city = pkg.destinationCity.trim();
      if (city && !seen.has(city.toLowerCase())) {
        seen.add(city.toLowerCase());
        list.push({ name: city, country: pkg.destinationCountry || "Global" });
      }
    });

    return list;
  }, [packages]);

  const dynamicAirports = useMemo<AirportOption[]>(() => {
    const airportList: AirportOption[] = [];
    const seen = new Set<string>();

    // Dynamic airports derived directly from packages departure & destination cities
    packages.forEach((pkg) => {
      if (pkg.departureCity) {
        const code = pkg.departureCity.slice(0, 3).toUpperCase();
        if (!seen.has(code)) {
          seen.add(code);
          airportList.push({
            code,
            city: pkg.departureCity,
            airport: `${pkg.departureCity} International Airport`,
            country: pkg.destinationCountry || "Global",
          });
        }
      }
      if (pkg.destinationCity) {
        const code = pkg.destinationCity.slice(0, 3).toUpperCase();
        if (!seen.has(code)) {
          seen.add(code);
          airportList.push({
            code,
            city: pkg.destinationCity,
            airport: `${pkg.destinationCity} Airport`,
            country: pkg.destinationCountry || "Global",
          });
        }
      }
    });

    // Sensible base hubs if inventory is being loaded
    const standardHubs: AirportOption[] = [
      { code: "DAC", city: "Dhaka", airport: "Hazrat Shahjalal Int'l (DAC)", country: "Bangladesh" },
      { code: "CGP", city: "Chittagong", airport: "Shah Amanat Int'l (CGP)", country: "Bangladesh" },
      { code: "ZYL", city: "Sylhet", airport: "Osmani Int'l (ZYL)", country: "Bangladesh" },
      { code: "BKK", city: "Bangkok", airport: "Suvarnabhumi Airport (BKK)", country: "Thailand" },
      { code: "SIN", city: "Singapore", airport: "Singapore Changi (SIN)", country: "Singapore" },
      { code: "DXB", city: "Dubai", airport: "Dubai Int'l Airport (DXB)", country: "UAE" },
      { code: "MLE", city: "Malé", airport: "Velana Int'l Airport (MLE)", country: "Maldives" },
    ];

    standardHubs.forEach((hub) => {
      if (!seen.has(hub.code)) {
        seen.add(hub.code);
        airportList.push(hub);
      }
    });

    return airportList;
  }, [packages]);

  const categoryTabs = useMemo(() => {
    const categoriesSet = new Set<string>(["All Packages"]);
    packages.forEach((pkg) => {
      if (pkg.category) categoriesSet.add(pkg.category);
    });
    return Array.from(categoriesSet);
  }, [packages]);

  // --------------------------------------------------------------------------
  // Cache Selected Package Into useBookingStore
  // --------------------------------------------------------------------------

  const cachePackageIntoBookingStore = (pkg: VacationPackage, groupSize: number, customFinalPrice?: number) => {
    const pricing = calculateGroupTierPricing(pkg.pricePerPerson, groupSize);
    const finalPrice = customFinalPrice !== undefined ? customFinalPrice : pricing.totalAmount;

    useBookingStore.getState().initDraft({
      productType: "package",
      productId: pkg.id,
      destinationCity: pkg.destinationCity,
      destinationCountry: pkg.destinationCountry,
      basePrice: finalPrice,
      currency: pkg.currency || "USD",
      numberOfGuests: groupSize,
    });

    useBookingStore.getState().setNotes(
      `Package: ${pkg.name} | Tier: ${pricing.tierLabel} (${pricing.discountPercent}% off) | Flight: ${pkg.flight.airline} (${pkg.flight.flightNumber}) | Hotel: ${pkg.hotel.name} | Inclusions: ${pkg.inclusions.slice(0, 3).join(", ")} | Exclusions: ${pkg.exclusions.slice(0, 3).join(", ")}`
    );
  };

  // --------------------------------------------------------------------------
  // Drawer Animation Controls
  // --------------------------------------------------------------------------

  const openDrawer = (pkg: VacationPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPackage(pkg);
    setActiveDetailTab("Overview");
    setSelectedAddonIds([]);
    setExpandedDays({ 1: true, 2: true });

    cachePackageIntoBookingStore(pkg, travelersCount);

    Animated.parallel([
      Animated.spring(drawerSlideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(drawerBackdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(drawerBackdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedPackage(null);
    });
  };

  // --------------------------------------------------------------------------
  // Filters & Dynamic Calculations
  // --------------------------------------------------------------------------

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (selectedDestination !== "All Destinations") {
        if (!pkg.destinationCity.toLowerCase().includes(selectedDestination.toLowerCase())) {
          return false;
        }
      }

      if (activeCategory !== "All Packages") {
        if (pkg.category !== activeCategory) {
          return false;
        }
      }

      if (activeDuration !== "All") {
        if (activeDuration === "7D/6N+" && pkg.durationDays < 7) return false;
        if (activeDuration !== "7D/6N+" && !pkg.duration.includes(activeDuration)) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          pkg.name.toLowerCase().includes(q) ||
          pkg.destinationCity.toLowerCase().includes(q) ||
          pkg.hotel.name.toLowerCase().includes(q) ||
          pkg.flight.airline.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [packages, selectedDestination, activeCategory, activeDuration, searchQuery]);

  const toggleWishlist = (id: string) => {
    Haptics.selectionAsync();
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      savedItemsService.toggleSaveItem({
        id: pkg.id,
        type: "package",
        title: pkg.name,
        subtitle: `${pkg.duration} · ${pkg.destinationCity}`,
        destination: pkg.destinationCity,
        price: pkg.pricePerPerson,
        totalPriceWithTax: Math.round(pkg.pricePerPerson * 1.05),
        rating: pkg.rating,
        image_url: pkg.galleryImages?.[0],
        route: `/screens/packages?packageId=${pkg.id}`,
      });
    }
  };

  const toggleAddon = (addonId: string) => {
    Haptics.selectionAsync();
    setSelectedAddonIds((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
  };

  const calculateTotalWithAddons = (pkg: VacationPackage, size: number) => {
    const tierPricing = calculateGroupTierPricing(pkg.pricePerPerson, size);

    let addonsTotal = 0;
    if (selectedAddonIds.length > 0) {
      pkg.addons.forEach((addon) => {
        if (selectedAddonIds.includes(addon.id)) {
          addonsTotal += addon.pricePerPerson * size;
        }
      });
    }

    const finalTotal = tierPricing.totalAmount + addonsTotal;
    return {
      tierPricing,
      addonsTotal,
      finalTotal,
    };
  };

  const toggleDayAccordion = (dayNum: number) => {
    Haptics.selectionAsync();
    setExpandedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  const toggleAllDays = (totalDays: number, expand: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState: Record<number, boolean> = {};
    for (let i = 1; i <= totalDays; i++) {
      nextState[i] = expand;
    }
    setExpandedDays(nextState);
  };

  // --------------------------------------------------------------------------
  // Instant Reservation & Payment Route Trigger
  // --------------------------------------------------------------------------

  const handleBookNow = async (pkg: VacationPackage) => {
    if (pkg.seatsLeft <= 0 || travelersCount > pkg.seatsLeft) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "প্যাকেজ বুকিং বন্ধ (Sold Out)",
        pkg.seatsLeft <= 0
          ? "এই প্যাকেজের সকল আসন বুক হয়ে গেছে (Sold Out)। অনুগ্রহ করে অন্য প্যাকেজ বা তারিখ বেছে নিন।"
          : `এই প্যাকেজে মাত্র ${pkg.seatsLeft}টি আসন বাকি আছে, কিন্তু আপনি ${travelersCount} জন ভ্রমণকারী নির্বাচন করেছেন। অনুগ্রহ করে ভ্রমণকারীর সংখ্যা কমান।`,
        [{ text: "ঠিক আছে", style: "default" }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsBooking(true);

    try {
      const ref = generateReferenceCode("PKG");
      const { tierPricing, finalTotal } = calculateTotalWithAddons(pkg, travelersCount);

      cachePackageIntoBookingStore(pkg, travelersCount, finalTotal);

      let bookingId = "";
      if (user?.id) {
        try {
          const newBooking = await bookingRepository.createBooking(user.id, {
            booking_reference: ref,
            product_type: "package",
            status: "payment_pending",
            flow_step: "payment",
            destination_city: pkg.destinationCity,
            destination_country: pkg.destinationCountry,
            number_of_guests: travelersCount,
            total_price: finalTotal,
            final_price: finalTotal,
            currency: pkg.currency || "USD",
            notes: `Flight: ${pkg.flight.airline} (${pkg.flight.route}) | Hotel: ${pkg.hotel.name} | Tier: ${tierPricing.tierLabel} (${tierPricing.discountPercent}% off) | Addons: ${selectedAddonIds.join(", ") || "None"}`,
          });
          if (newBooking?.id) bookingId = newBooking.id;
        } catch (dbErr) {
          console.warn("Could not insert pending package booking into Supabase:", dbErr);
        }
      }

      closeDrawer();

      router.push({
        pathname: "/screens/payments" as any,
        params: {
          amount: finalTotal.toString(),
          reference: ref,
          productType: "package",
          packageTitle: pkg.name,
          packageId: pkg.id,
          flightInfo: `${pkg.flight.airline} · ${pkg.flight.route}`,
          hotelName: `${pkg.hotel.name} (${pkg.hotel.stars}★ ${pkg.hotel.roomType})`,
          destination: `${pkg.destinationCity}, ${pkg.destinationCountry}`,
          duration: pkg.duration,
          travelers: `${travelersCount}`,
          roomCount: "1",
          bookingId,
          tierDiscount: `${tierPricing.discountPercent}% (${tierPricing.tierLabel})`,
        },
      });
    } catch (err: any) {
      console.error("Booking error:", err);
    } finally {
      setIsBooking(false);
    }
  };

  const handleShare = async (pkg: VacationPackage) => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `🌴 Check out this Flight + Hotel Bundle: "${pkg.name}" for ${formatCurrency(pkg.pricePerPerson, pkg.currency)}/person on Trip.com!\nIncludes ${pkg.flight.airline} flights & 5-Star ${pkg.hotel.name}. Group discounts available!`,
        title: pkg.name,
      });
    } catch (shareErr) {
      console.warn("[PackageScreen] Share package error:", shareErr);
    }
  };

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]} edges={["top"]}>
      <TopBar screen={activeScreen} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TRIP_PURPLE, TRIP_BLUE]} />}
      >
        {/* Hero Banner with Search Controls */}
        <LinearGradient colors={["#4C1D95", "#6D28D9", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadgePill}>
              <Ionicons name="sparkles" size={12} color="#FACC15" />
              <Text style={styles.heroBadgeText}>FLIGHT + HOTEL PACKAGES</Text>
            </View>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE UP TO 20% WITH GROUPS</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Curated Escapes & Luxury Bundles</Text>
          <Text style={styles.heroSubtitle}>Flights, 5-Star Resorts, Guided Excursions & Group Tier Pricing in one place.</Text>

          {/* Search Box Card */}
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.borderSubtle, borderWidth: 1 }]}>
            <View style={styles.searchRow}>
              {/* Departure Airport Button */}
              <Pressable
                style={styles.searchFieldCol}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowOriginModal(true);
                }}
              >
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="airplane-outline" size={13} color="#6B7280" />
                  <Text style={styles.fieldLabel}>FROM</Text>
                </View>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {originAirport.city} ({originAirport.code})
                </Text>
              </Pressable>

              <View style={styles.searchDividerVertical}>
                <Ionicons name="swap-horizontal" size={16} color="#9CA3AF" />
              </View>

              {/* Destination Button */}
              <Pressable
                style={styles.searchFieldCol}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowDestModal(true);
                }}
              >
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="location-outline" size={13} color="#6B7280" />
                  <Text style={styles.fieldLabel}>DESTINATION</Text>
                </View>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {selectedDestination}
                </Text>
              </Pressable>
            </View>

            <View style={styles.searchDividerHorizontal} />

            {/* Travelers Group Tier Stepper Row */}
            <View style={styles.searchRow}>
              <View style={styles.searchFieldCol}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="people" size={13} color={TRIP_PURPLE} />
                  <Text style={styles.fieldLabel}>GROUP TIER PRICING</Text>
                </View>
                <View style={styles.stepperInline}>
                  <Pressable
                    style={[styles.miniStepBtn, travelersCount <= 1 && styles.miniStepBtnDisabled]}
                    onPress={() => {
                      if (travelersCount > 1) {
                        Haptics.selectionAsync();
                        setTravelersCount((c) => c - 1);
                      }
                    }}
                  >
                    <Ionicons name="remove" size={14} color={travelersCount <= 1 ? "#9CA3AF" : "#111827"} />
                  </Pressable>
                  <Text style={styles.miniStepVal}>
                    {travelersCount} {travelersCount === 1 ? "Traveler" : "Travelers"}
                  </Text>
                  <Pressable
                    style={[styles.miniStepBtn, travelersCount >= 20 && styles.miniStepBtnDisabled]}
                    onPress={() => {
                      if (travelersCount < 20) {
                        Haptics.selectionAsync();
                        setTravelersCount((c) => c + 1);
                      }
                    }}
                  >
                    <Ionicons name="add" size={14} color="#111827" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.searchDividerVertical}>
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
              </View>

              {/* Duration Preset Selector */}
              <View style={styles.searchFieldCol}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="time-outline" size={13} color="#6B7280" />
                  <Text style={styles.fieldLabel}>DURATION</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, marginTop: 2 }}>
                  {["All", "3D/2N", "4D/3N", "5D/4N", "6D/5N", "7D/6N+"].map((dur) => (
                    <Pressable
                      key={dur}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setActiveDuration(dur);
                      }}
                      style={[styles.miniDurationPill, activeDuration === dur && styles.miniDurationPillActive]}
                    >
                      <Text style={[styles.miniDurationText, activeDuration === dur && styles.miniDurationTextActive]}>{dur}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </LinearGradient>

        <StickyHeader backgroundColor="#FFFFFF" elevation={3} style={{ paddingVertical: 4 }}>
{/* Dynamic Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categoryTabs.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(cat);
              }}
              style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
            >
              <Text style={[styles.categoryTabText, activeCategory === cat && styles.categoryTabTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Results Summary Header & Search Input */}
        <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
          <ResultsSummaryHeader
            count={filteredPackages.length}
            entityName="ভ্যাকেশন প্যাকেজ"
            sortLabel={activeCategory !== "All Packages" ? activeCategory : "জনপ্রিয়তা"}
            filterCount={
              (activeCategory !== "All Packages" ? 1 : 0) +
              (activeDuration !== "All" ? 1 : 0) +
              (selectedDestination !== "All Destinations" ? 1 : 0) +
              (searchQuery.trim() ? 1 : 0)
            }
            onClearFilters={() => {
              setSelectedDestination("All Destinations");
              setActiveCategory("All Packages");
              setActiveDuration("All");
              setSearchQuery("");
            }}
          />
          <View style={[styles.searchPillInput, { marginTop: 8 }]}>
            <Ionicons name="search" size={14} color="#6B7280" />
            <TextInput
              style={styles.inlineSearchInput}
              placeholder="Search resorts or cities..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        
</StickyHeader>
        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={TRIP_PURPLE} />
            <Text style={styles.loadingText}>Fetching packages from travelRepository...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && fetchError && (
          <View style={{ marginHorizontal: 16, marginVertical: 20 }}>
            <ErrorStateCard
              title="Unable to load packages"
              message={fetchError}
              retryText="Retry Packages"
              onRetry={fetchPackages}
            />
          </View>
        )}

        {/* Empty State */}
        {!loading && !fetchError && filteredPackages.length === 0 && (
          <View style={{ marginHorizontal: 16, marginVertical: 20 }}>
            <EmptyStateView
              icon="airplane-outline"
              title="No Packages Found"
              description="Try changing your destination, category tab, or duration filter."
              actionText="Reset All Filters"
              onAction={() => {
                setSelectedDestination("All Destinations");
                setActiveCategory("All Packages");
                setActiveDuration("All");
                setSearchQuery("");
              }}
            />
          </View>
        )}

        {/* Packages List */}
        {!loading &&
          filteredPackages.map((pkg) => {
            const isFav = wishlist.includes(pkg.id);
            const { tierPricing, finalTotal } = calculateTotalWithAddons(pkg, travelersCount);

            return (
              <View key={pkg.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                {/* 1. Image Carousel with Pinch-to-Zoom & Full-Screen Trigger */}
                <ImageGalleryCarousel
                  images={pkg.galleryImages}
                  title={pkg.name}
                  badge={pkg.badge}
                  isFav={isFav}
                  onToggleFav={() => toggleWishlist(pkg.id)}
                  onOpenZoom={(idx) => {
                    setFullScreenModal({
                      visible: true,
                      images: pkg.galleryImages,
                      index: idx,
                      title: pkg.name,
                    });
                  }}
                />

                {/* Card Main Body */}
                <View style={styles.cardBody}>
                  {/* Title & Reviews */}
                  <View style={styles.titleMetaSection}>
                    <Text style={styles.cardTitle}>{pkg.name}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingText}>{pkg.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.reviewCountText}>({pkg.reviewsCount} reviews)</Text>
                      {pkg.seatsLeft <= 0 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFE4E6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginStart: 6 }}>
                          <Ionicons name="close-circle" size={11} color="#E11D48" />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#E11D48", marginStart: 2 }}>বিক্রি শেষ</Text>
                        </View>
                      ) : pkg.seatsLeft <= 3 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginStart: 6 }}>
                          <Ionicons name="flame" size={11} color="#D97706" />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#D97706", marginStart: 2 }}>{pkg.seatsLeft}টি বাকি</Text>
                        </View>
                      ) : null}
                      <Text style={styles.durationBullet}>·</Text>
                      <Text style={styles.durationText}>{pkg.duration}</Text>
                      <Text style={styles.durationBullet}>·</Text>
                      <Text style={styles.durationText}>{pkg.destinationCity}</Text>
                    </View>
                  </View>

                  {/* Flight & Hotel Pills */}
                  <View style={styles.dualPillRow}>
                    <View style={styles.flightPill}>
                      <Ionicons name="airplane" size={13} color="#2563EB" />
                      <Text style={styles.flightPillText} numberOfLines={1}>
                        {pkg.flight.airline} ({pkg.flight.isDirect ? "Direct" : "1-Stop"})
                      </Text>
                    </View>
                    <View style={styles.hotelPill}>
                      <Ionicons name="business" size={13} color="#7C3AED" />
                      <Text style={styles.hotelPillText} numberOfLines={1}>
                        {pkg.hotel.name} ({pkg.hotel.stars}★)
                      </Text>
                    </View>
                  </View>

                  {/* 2. Package Inclusions & Exclusions Tags (High-Contrast) */}
                  <View style={styles.tagsContainer}>
                    <View style={styles.tagSection}>
                      <View style={styles.tagSectionHeader}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.inclusionsSectionTitle}>INCLUSIONS (What's Covered)</Text>
                      </View>
                      <View style={styles.inclusionsWrap}>
                        {pkg.inclusions.slice(0, 3).map((inc, i) => (
                          <View key={`inc-${inc}-${i}`} style={styles.inclusionHighContrastTag}>
                            <Ionicons name="checkmark-circle" size={14} color="#059669" />
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
                      <View style={styles.exclusionsWrap}>
                        {pkg.exclusions.slice(0, 2).map((exc, i) => (
                          <View key={`exc-${exc}-${i}`} style={styles.exclusionHighContrastTag}>
                            <Ionicons name="close-circle" size={14} color="#DC2626" />
                            <Text style={styles.exclusionHighContrastText} numberOfLines={1}>
                              {exc}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 3. Day-by-Day Visual Itinerary Preview with Meal Indicators */}
                  <View style={styles.itineraryPreviewBox}>
                    <View style={styles.itineraryPreviewHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="calendar" size={15} color={TRIP_PURPLE} />
                        <Text style={styles.itineraryPreviewHeading}>Day-by-Day Visual Itinerary</Text>
                      </View>
                      <Pressable onPress={() => openDrawer(pkg)}>
                        <Text style={styles.seeFullItineraryText}>View Full Timeline →</Text>
                      </Pressable>
                    </View>

                    {pkg.itinerary.slice(0, 2).map((day) => {
                      const isExpanded = expandedDays[day.dayNumber] ?? false;
                      return (
                        <View key={day.dayNumber} style={styles.cardItineraryDay}>
                          <Pressable style={styles.cardDayHeader} onPress={() => toggleDayAccordion(day.dayNumber)}>
                            <View style={styles.dayMiniBadge}>
                              <Text style={styles.dayMiniBadgeText}>DAY {day.dayNumber}</Text>
                            </View>
                            <Text style={styles.dayMiniTitle} numberOfLines={1}>
                              {day.title}
                            </Text>
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#6B7280" />
                          </Pressable>

                          {isExpanded && (
                            <View style={styles.cardDayBody}>
                              <Text style={styles.daySummaryText}>{day.summary}</Text>

                              {/* Meal Indicators */}
                              <View style={styles.mealIndicatorsRow}>
                                <Text style={styles.mealIndicatorLabel}>MEALS:</Text>
                                <View style={[styles.mealChip, day.meals.breakfast ? styles.mealChipActive : styles.mealChipInactive]}>
                                  <Ionicons name="restaurant-outline" size={11} color={day.meals.breakfast ? "#059669" : "#9CA3AF"} />
                                  <Text style={[styles.mealChipText, day.meals.breakfast ? styles.mealChipTextActive : styles.mealChipTextInactive]}>
                                    Breakfast {day.meals.breakfast ? "✓" : "—"}
                                  </Text>
                                </View>
                                <View style={[styles.mealChip, day.meals.lunch ? styles.mealChipActive : styles.mealChipInactive]}>
                                  <Ionicons name="restaurant-outline" size={11} color={day.meals.lunch ? "#059669" : "#9CA3AF"} />
                                  <Text style={[styles.mealChipText, day.meals.lunch ? styles.mealChipTextActive : styles.mealChipTextInactive]}>
                                    Lunch {day.meals.lunch ? "✓" : "—"}
                                  </Text>
                                </View>
                                <View style={[styles.mealChip, day.meals.dinner ? styles.mealChipActive : styles.mealChipInactive]}>
                                  <Ionicons name="restaurant-outline" size={11} color={day.meals.dinner ? "#059669" : "#9CA3AF"} />
                                  <Text style={[styles.mealChipText, day.meals.dinner ? styles.mealChipTextActive : styles.mealChipTextInactive]}>
                                    Dinner {day.meals.dinner ? "✓" : "—"}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* 4. Group Tier Pricing Calculator Box */}
                  <View style={styles.groupTierBox}>
                    <View style={styles.groupTierTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupTierTitle}>Group Tier Pricing</Text>
                        <Text style={styles.groupTierSubtitle}>{tierPricing.nextTierHint}</Text>
                      </View>
                      <View style={styles.groupTierBadge}>
                        <Ionicons name="people" size={12} color="#059669" />
                        <Text style={styles.groupTierBadgeText}>{tierPricing.tierBadge}</Text>
                      </View>
                    </View>

                    {/* Visual Tier Indicator Progress */}
                    <View style={styles.tierProgressionBar}>
                      <View style={[styles.tierStep, tierPricing.tierIndex >= 1 && styles.tierStepActive]}>
                        <View style={[styles.tierStepCircle, tierPricing.tierIndex >= 1 && styles.tierStepCircleActive]}>
                          <Text style={styles.tierStepNum}>1</Text>
                        </View>
                        <Text style={styles.tierStepLabel}>1-2 (Base/5%)</Text>
                      </View>
                      <View style={[styles.tierStepLine, tierPricing.tierIndex >= 2 && styles.tierStepLineActive]} />
                      <View style={[styles.tierStep, tierPricing.tierIndex >= 2 && styles.tierStepActive]}>
                        <View style={[styles.tierStepCircle, tierPricing.tierIndex >= 2 && styles.tierStepCircleActive]}>
                          <Text style={styles.tierStepNum}>2</Text>
                        </View>
                        <Text style={styles.tierStepLabel}>3-5 (10% OFF)</Text>
                      </View>
                      <View style={[styles.tierStepLine, tierPricing.tierIndex >= 3 && styles.tierStepLineActive]} />
                      <View style={[styles.tierStep, tierPricing.tierIndex >= 3 && styles.tierStepActive]}>
                        <View style={[styles.tierStepCircle, tierPricing.tierIndex >= 3 && styles.tierStepCircleActive]}>
                          <Text style={styles.tierStepNum}>3</Text>
                        </View>
                        <Text style={styles.tierStepLabel}>6+ (20% OFF)</Text>
                      </View>
                    </View>

                    {/* Quick Tier Selection Buttons */}
                    <View style={styles.quickTierPillsRow}>
                      <Pressable
                        style={[styles.tierPillBtn, travelersCount <= 2 && styles.tierPillBtnActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setTravelersCount(2);
                        }}
                      >
                        <Text style={[styles.tierPillText, travelersCount <= 2 && styles.tierPillTextActive]}>1-2 Guests</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.tierPillBtn, travelersCount >= 3 && travelersCount <= 5 && styles.tierPillBtnActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setTravelersCount(4);
                        }}
                      >
                        <Text style={[styles.tierPillText, travelersCount >= 3 && travelersCount <= 5 && styles.tierPillTextActive]}>
                          3-5 Guests (10% OFF)
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[styles.tierPillBtn, travelersCount >= 6 && styles.tierPillBtnActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setTravelersCount(6);
                        }}
                      >
                        <Text style={[styles.tierPillText, travelersCount >= 6 && styles.tierPillTextActive]}>6+ Group (20% OFF)</Text>
                      </Pressable>
                    </View>

                    {/* Dynamic Pricing Breakdown */}
                    <View style={styles.priceBreakdownRow}>
                      <View>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                          {tierPricing.discountPercent > 0 && (
                            <Text style={styles.strikethroughPrice}>{formatCurrency(tierPricing.baseRatePerPerson, pkg.currency)}</Text>
                          )}
                          <Text style={styles.discountedRateText}>
                            {formatCurrency(tierPricing.discountedRatePerPerson, pkg.currency)}
                          </Text>
                          <Text style={styles.rateUnitText}>/ person</Text>
                        </View>
                        <Text style={styles.groupTotalSummary}>
                          Total: <Text style={{ fontWeight: "800", color: "#111827" }}>{formatCurrency(finalTotal, pkg.currency)}</Text> for {travelersCount} guests
                          {tierPricing.totalSavings > 0 && (
                            <Text style={{ color: "#059669", fontWeight: "700" }}> (Save {formatCurrency(tierPricing.totalSavings, pkg.currency)})</Text>
                          )}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Pressable
                          onPress={() => toggleComparePackage(pkg.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: comparePackageIds.includes(pkg.id) ? "#EFF6FF" : "#F3F4F6",
                            borderWidth: 1,
                            borderColor: comparePackageIds.includes(pkg.id) ? "#2563EB" : "#E5E7EB",
                            marginEnd: 8,
                          }}
                        >
                          <Ionicons
                            name={comparePackageIds.includes(pkg.id) ? "checkbox" : "square-outline"}
                            size={14}
                            color={comparePackageIds.includes(pkg.id) ? "#2563EB" : "#6B7280"}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: comparePackageIds.includes(pkg.id) ? "#2563EB" : "#374151",
                              marginStart: 4,
                            }}
                          >
                            তুলনা
                          </Text>
                        </Pressable>

                        <Pressable style={styles.viewDetailBtn} onPress={() => openDrawer(pkg)}>
                          <Text style={styles.viewDetailBtnText}>Reserve</Text>
                          <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ==================================================================== */}
      {/* EXPANDABLE PACKAGE DETAILS DRAWER / MODAL                            */}
      {/* ==================================================================== */}
      {selectedPackage && (
        <Modal visible={true} transparent animationType="none" onRequestClose={closeDrawer}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.backdropPressable, { opacity: drawerBackdropAnim }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
            </Animated.View>

            <Animated.View style={[styles.drawerSheet, { transform: [{ translateY: drawerSlideAnim }] }]}>
              <View style={styles.drawerHandleBar} />
              <View style={styles.drawerHeader}>
                <View style={{ flex: 1, paddingEnd: 8 }}>
                  <Text style={styles.drawerHeaderTitle} numberOfLines={1}>
                    {selectedPackage.name}
                  </Text>
                  <Text style={styles.drawerHeaderSubtitle}>
                    {selectedPackage.duration} · {selectedPackage.destinationCity}, {selectedPackage.destinationCountry}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable onPress={() => handleShare(selectedPackage)} style={styles.drawerIconBtn}>
                    <Ionicons name="share-social-outline" size={20} color="#4B5563" />
                  </Pressable>
                  <Pressable onPress={closeDrawer} style={styles.drawerIconBtn}>
                    <Ionicons name="close" size={22} color="#111827" />
                  </Pressable>
                </View>
              </View>

              {/* Drawer Tabs */}
              <View style={styles.drawerTabsRow}>
                {(["Overview", "Itinerary", "Inclusions", "Flights & Hotel", "Group Pricing"] as const).map((tabKey) => (
                  <Pressable
                    key={tabKey}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveDetailTab(tabKey);
                    }}
                    style={[styles.drawerTabItem, activeDetailTab === tabKey && styles.drawerTabItemActive]}
                  >
                    <Text style={[styles.drawerTabItemText, activeDetailTab === tabKey && styles.drawerTabItemTextActive]}>
                      {tabKey}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Drawer Tab Content */}
              <ScrollView style={styles.drawerScrollBody} showsVerticalScrollIndicator={false}>
                {/* 1. OVERVIEW TAB */}
                {activeDetailTab === "Overview" && (
                  <View style={styles.tabContent}>
                    <Pressable
                      style={styles.drawerHeroImageWrapper}
                      onPress={() => {
                        setFullScreenModal({
                          visible: true,
                          images: selectedPackage.galleryImages,
                          index: 0,
                          title: selectedPackage.name,
                        });
                      }}
                    >
                      <AppImage source={{ uri: selectedPackage.image }} placeholderCategory="package" style={styles.drawerHeroImage} />
                      <View style={styles.drawerZoomPill}>
                        <Ionicons name="scan" size={13} color="#FFFFFF" />
                        <Text style={styles.drawerZoomPillText}>Pinch-to-Zoom Gallery ({selectedPackage.galleryImages.length})</Text>
                      </View>
                    </Pressable>

                    <View style={styles.overviewQuickSpecs}>
                      <View style={styles.specBox}>
                        <Ionicons name="time-outline" size={18} color={TRIP_PURPLE} />
                        <Text style={styles.specValue}>{selectedPackage.duration}</Text>
                        <Text style={styles.specLabel}>Trip Duration</Text>
                      </View>
                      <View style={styles.specBox}>
                        <Ionicons name="airplane-outline" size={18} color={TRIP_BLUE} />
                        <Text style={styles.specValue}>{selectedPackage.flight.airline}</Text>
                        <Text style={styles.specLabel}>Airline Carrier</Text>
                      </View>
                      <View style={styles.specBox}>
                        <Ionicons name="star" size={18} color="#F59E0B" />
                        <Text style={styles.specValue}>{selectedPackage.hotel.stars} Star</Text>
                        <Text style={styles.specLabel}>{selectedPackage.hotel.roomType}</Text>
                      </View>
                    </View>

                    {/* Live Destination Climate Snapshot */}
                    <WeatherWidget
                      location={selectedPackage.destinationCity}
                      variant="compact"
                      style={{ marginVertical: 10 }}
                    />

                    <Text style={styles.drawerSectionTitle}>Package Highlights & Inclusions</Text>
                    <View style={styles.inclusionsCard}>
                      {selectedPackage.inclusions.map((item, idx) => (
                        <View key={`pkg-inc-${item}-${idx}`} style={styles.checkItemRow}>
                          <Ionicons name="checkmark-circle" size={18} color="#059669" />
                          <Text style={styles.checkItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.drawerSectionTitle}>Enhance Your Experience (Add-ons)</Text>
                    <View style={styles.addonsList}>
                      {selectedPackage.addons.map((addon) => {
                        const isChecked = selectedAddonIds.includes(addon.id);
                        return (
                          <Pressable
                            key={addon.id}
                            style={[styles.addonCard, isChecked && styles.addonCardSelected]}
                            onPress={() => toggleAddon(addon.id)}
                          >
                            <View style={[styles.addonIconCircle, isChecked && { backgroundColor: "#EDE9FE" }]}>
                              <Ionicons name={addon.icon} size={20} color={isChecked ? TRIP_PURPLE : "#4B5563"} />
                            </View>
                            <View style={{ flex: 1, paddingHorizontal: 10 }}>
                              <Text style={styles.addonTitle}>{addon.name}</Text>
                              <Text style={styles.addonDesc}>{addon.description}</Text>
                              <Text style={styles.addonPrice}>+{formatCurrency(addon.pricePerPerson, selectedPackage.currency)} / traveler</Text>
                            </View>
                            <View style={[styles.addonCheckbox, isChecked && styles.addonCheckboxChecked]}>
                              {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 2. ITINERARY TAB */}
                {activeDetailTab === "Itinerary" && (
                  <View style={styles.tabContent}>
                    <View style={styles.itineraryTabHeaderRow}>
                      <View>
                        <Text style={styles.drawerSectionTitle}>Day-by-Day Visual Timeline</Text>
                        <Text style={styles.itinerarySub}>Detailed schedule with included meals & excursions</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Pressable style={styles.expandAllBtn} onPress={() => toggleAllDays(selectedPackage.itinerary.length, true)}>
                          <Text style={styles.expandAllBtnText}>Expand All</Text>
                        </Pressable>
                        <Pressable style={styles.expandAllBtn} onPress={() => toggleAllDays(selectedPackage.itinerary.length, false)}>
                          <Text style={styles.expandAllBtnText}>Collapse</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Real-time Destination Meteorological Conditions & Packing Guide */}
                    <WeatherWidget
                      location={selectedPackage.destinationCity}
                      variant="card"
                      customTitle={`${selectedPackage.destinationCity} Itinerary Weather & Advisory`}
                      style={{ marginBottom: 16 }}
                    />

                    {selectedPackage.itinerary.map((day) => {
                      const isExpanded = expandedDays[day.dayNumber] ?? false;
                      return (
                        <View key={day.dayNumber} style={styles.itineraryAccordionCard}>
                          <Pressable style={styles.itineraryAccordionHeader} onPress={() => toggleDayAccordion(day.dayNumber)}>
                            <View style={styles.dayBadge}>
                              <Text style={styles.dayBadgeText}>DAY {day.dayNumber}</Text>
                            </View>
                            <View style={{ flex: 1, paddingHorizontal: 10 }}>
                              <Text style={styles.dayTitleText}>{day.title}</Text>
                              <Text style={styles.daySummaryText} numberOfLines={isExpanded ? undefined : 1}>
                                {day.summary}
                              </Text>
                            </View>
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                          </Pressable>

                          {isExpanded && (
                            <View style={styles.itineraryAccordionBody}>
                              {day.morning && (
                                <View style={styles.timelineNode}>
                                  <View style={styles.timelineSpine}>
                                    <View style={[styles.nodeDot, { backgroundColor: "#F59E0B" }]} />
                                    <View style={styles.nodeLine} />
                                  </View>
                                  <View style={styles.nodeContent}>
                                    <View style={styles.timeTag}>
                                      <Ionicons name="sunny" size={13} color="#F59E0B" />
                                      <Text style={styles.timeTagText}>Morning (09:00 AM)</Text>
                                    </View>
                                    <Text style={styles.eventText}>{day.morning}</Text>
                                  </View>
                                </View>
                              )}

                              {day.afternoon && (
                                <View style={styles.timelineNode}>
                                  <View style={styles.timelineSpine}>
                                    <View style={[styles.nodeDot, { backgroundColor: "#2563EB" }]} />
                                    <View style={styles.nodeLine} />
                                  </View>
                                  <View style={styles.nodeContent}>
                                    <View style={styles.timeTag}>
                                      <Ionicons name="partly-sunny" size={13} color="#2563EB" />
                                      <Text style={styles.timeTagText}>Afternoon (01:30 PM)</Text>
                                    </View>
                                    <Text style={styles.eventText}>{day.afternoon}</Text>
                                  </View>
                                </View>
                              )}

                              {day.evening && (
                                <View style={styles.timelineNode}>
                                  <View style={styles.timelineSpine}>
                                    <View style={[styles.nodeDot, { backgroundColor: "#7C3AED" }]} />
                                  </View>
                                  <View style={styles.nodeContent}>
                                    <View style={styles.timeTag}>
                                      <Ionicons name="moon" size={13} color="#7C3AED" />
                                      <Text style={styles.timeTagText}>Evening (06:30 PM)</Text>
                                    </View>
                                    <Text style={styles.eventText}>{day.evening}</Text>
                                  </View>
                                </View>
                              )}

                              <View style={styles.drawerMealBar}>
                                <Text style={styles.drawerMealBarLabel}>MEALS INCLUDED:</Text>
                                <View style={styles.drawerMealChipsWrap}>
                                  <View style={[styles.drawerMealChip, day.meals.breakfast ? styles.drawerMealChipYes : styles.drawerMealChipNo]}>
                                    <Ionicons
                                      name={day.meals.breakfast ? "checkmark-circle" : "close-circle-outline"}
                                      size={14}
                                      color={day.meals.breakfast ? "#059669" : "#9CA3AF"}
                                    />
                                    <Text style={[styles.drawerMealChipText, day.meals.breakfast && styles.drawerMealChipTextYes]}>
                                      Breakfast {day.meals.breakfast ? "Included" : "Excluded"}
                                    </Text>
                                  </View>

                                  <View style={[styles.drawerMealChip, day.meals.lunch ? styles.drawerMealChipYes : styles.drawerMealChipNo]}>
                                    <Ionicons
                                      name={day.meals.lunch ? "checkmark-circle" : "close-circle-outline"}
                                      size={14}
                                      color={day.meals.lunch ? "#059669" : "#9CA3AF"}
                                    />
                                    <Text style={[styles.drawerMealChipText, day.meals.lunch && styles.drawerMealChipTextYes]}>
                                      Lunch {day.meals.lunch ? "Included" : "Excluded"}
                                    </Text>
                                  </View>

                                  <View style={[styles.drawerMealChip, day.meals.dinner ? styles.drawerMealChipYes : styles.drawerMealChipNo]}>
                                    <Ionicons
                                      name={day.meals.dinner ? "checkmark-circle" : "close-circle-outline"}
                                      size={14}
                                      color={day.meals.dinner ? "#059669" : "#9CA3AF"}
                                    />
                                    <Text style={[styles.drawerMealChipText, day.meals.dinner && styles.drawerMealChipTextYes]}>
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
                )}

                {/* 3. INCLUSIONS & EXCLUSIONS TAB */}
                {activeDetailTab === "Inclusions" && (
                  <View style={styles.tabContent}>
                    <View style={styles.inclusionsBoxHighContrast}>
                      <View style={styles.inclusionsBoxHeader}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#059669" />
                        <Text style={styles.inclusionsBoxTitle}>Package Inclusions (All Covered)</Text>
                      </View>
                      <View style={styles.inclusionsTagsGrid}>
                        {selectedPackage.inclusions.map((item, idx) => (
                          <View key={`tab-inc-${item}-${idx}`} style={styles.inclusionCardTag}>
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                            <Text style={styles.inclusionCardTagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.exclusionsBoxHighContrast}>
                      <View style={styles.exclusionsBoxHeader}>
                        <Ionicons name="close-circle" size={20} color="#DC2626" />
                        <Text style={styles.exclusionsBoxTitle}>Package Exclusions (Not Covered)</Text>
                      </View>
                      <View style={styles.exclusionsTagsGrid}>
                        {selectedPackage.exclusions.map((item, idx) => (
                          <View key={`tab-exc-${item}-${idx}`} style={styles.exclusionCardTag}>
                            <Ionicons name="close-circle" size={16} color="#DC2626" />
                            <Text style={styles.exclusionCardTagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.policyCard}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                        <Text style={styles.policyCardHeading}>Free Cancellation Guarantee</Text>
                      </View>
                      <Text style={styles.policyCardBody}>{selectedPackage.cancellationPolicy}</Text>
                    </View>
                  </View>
                )}

                {/* 4. FLIGHTS & HOTEL TAB */}
                {activeDetailTab === "Flights & Hotel" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.drawerSectionTitle}>Return Flight Schedule</Text>
                    <View style={styles.flightDetailCard}>
                      <View style={styles.flightCardHeader}>
                        <View style={styles.airlineBadge}>
                          <Ionicons name="airplane" size={16} color="#2563EB" />
                          <Text style={styles.airlineBadgeText}>{selectedPackage.flight.airline}</Text>
                        </View>
                        <Text style={styles.flightNumberText}>{selectedPackage.flight.flightNumber}</Text>
                      </View>

                      <View style={styles.routeSchematic}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={styles.airportCodeText}>{originAirport.code}</Text>
                          <Text style={styles.airportCitySub}>{originAirport.city}</Text>
                        </View>
                        <View style={styles.flightLineCenter}>
                          <Ionicons name="airplane" size={16} color="#2563EB" />
                          <View style={styles.dashedFlightLine} />
                          <Text style={styles.flightDurationLabel}>{selectedPackage.flight.duration}</Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text style={styles.airportCodeText}>{selectedPackage.destinationCity.slice(0, 3).toUpperCase()}</Text>
                          <Text style={styles.airportCitySub}>{selectedPackage.destinationCity}</Text>
                        </View>
                      </View>

                      <View style={styles.flightSpecsGrid}>
                        <View style={styles.flightSpecItem}>
                          <Text style={styles.specSubHeading}>Cabin Class</Text>
                          <Text style={styles.specSubVal}>{selectedPackage.flight.cabinClass}</Text>
                        </View>
                        <View style={styles.flightSpecItem}>
                          <Text style={styles.specSubHeading}>Baggage Allowance</Text>
                          <Text style={styles.specSubVal}>{selectedPackage.flight.baggageAllowance}</Text>
                        </View>
                        <View style={styles.flightSpecItem}>
                          <Text style={styles.specSubHeading}>Aircraft Type</Text>
                          <Text style={styles.specSubVal}>{selectedPackage.flight.aircraft}</Text>
                        </View>
                        <View style={styles.flightSpecItem}>
                          <Text style={styles.specSubHeading}>Perks</Text>
                          <Text style={styles.specSubVal}>Complimentary Dining & Wi-Fi</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.drawerSectionTitle, { marginTop: 14 }]}>Accommodations & Resort</Text>
                    <View style={styles.hotelDetailsCard}>
                      <AppImage source={{ uri: selectedPackage.hotel.image }} placeholderCategory="hotel" style={styles.hotelPreviewImg} />
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.hotelNameTitle}>{selectedPackage.hotel.name}</Text>
                        <View style={styles.hotelStarsRow}>
                          {Array.from({ length: Math.floor(selectedPackage.hotel.stars) }).map((_, si) => (
                            <Ionicons key={si} name="star" size={14} color="#F59E0B" />
                          ))}
                        </View>
                      </View>

                      <Text style={styles.hotelAddress}>{selectedPackage.hotel.address}</Text>

                      <View style={styles.roomTypePill}>
                        <Ionicons name="bed-outline" size={15} color="#7C3AED" />
                        <Text style={styles.roomTypePillText}>
                          {selectedPackage.hotel.roomType} · {selectedPackage.hotel.bedSetup}
                        </Text>
                      </View>

                      <Text style={[styles.drawerSectionTitle, { marginTop: 14, marginBottom: 8 }]}>Property Amenities</Text>
                      <View style={styles.amenitiesWrap}>
                        {selectedPackage.hotel.amenities.map((amenity, ai) => (
                          <View key={ai} style={styles.amenityTag}>
                            <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                            <Text style={styles.amenityTagText}>{amenity}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* 5. GROUP PRICING TAB */}
                {activeDetailTab === "Group Pricing" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.drawerSectionTitle}>Group Tier Discount Calculator</Text>
                    <Text style={styles.itinerarySub}>Discount your per-person vacation rate automatically</Text>

                    <View style={styles.pricingCalculatorCard}>
                      <View style={styles.calcStepperRow}>
                        <View>
                          <Text style={styles.calcStepperLabel}>Total Guests</Text>
                          <Text style={styles.calcStepperSub}>Adults & Children</Text>
                        </View>
                        <View style={styles.calcStepperControls}>
                          <Pressable
                            style={[styles.calcStepBtn, travelersCount <= 1 && styles.calcStepBtnDisabled]}
                            onPress={() => {
                              if (travelersCount > 1) {
                                Haptics.selectionAsync();
                                setTravelersCount((c) => c - 1);
                              }
                            }}
                          >
                            <Ionicons name="remove" size={18} color={travelersCount <= 1 ? "#9CA3AF" : "#111827"} />
                          </Pressable>
                          <Text style={styles.calcStepValue}>{travelersCount}</Text>
                          <Pressable
                            style={[styles.calcStepBtn, travelersCount >= 20 && styles.calcStepBtnDisabled]}
                            onPress={() => {
                              if (travelersCount < 20) {
                                Haptics.selectionAsync();
                                setTravelersCount((c) => c + 1);
                              }
                            }}
                          >
                            <Ionicons name="add" size={18} color="#111827" />
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.tierCardsStack}>
                        <View style={[styles.tierDetailRow, travelersCount <= 2 && styles.tierDetailRowActive]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tierRowHeading}>1-2 Persons: Standard / Duo Rate</Text>
                            <Text style={styles.tierRowDesc}>Ideal for couples and solo adventurers</Text>
                          </View>
                          <Text style={styles.tierRowDiscount}>{travelersCount === 2 ? "5% OFF" : "BASE"}</Text>
                        </View>

                        <View style={[styles.tierDetailRow, travelersCount >= 3 && travelersCount <= 5 && styles.tierDetailRowActive]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tierRowHeading}>3-5 Persons: Small Group Saver</Text>
                            <Text style={styles.tierRowDesc}>Families & friends group savings</Text>
                          </View>
                          <Text style={[styles.tierRowDiscount, { color: "#059669" }]}>10% OFF</Text>
                        </View>

                        <View style={[styles.tierDetailRow, travelersCount >= 6 && styles.tierDetailRowActive]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tierRowHeading}>6+ Persons: Large Group Super Saver</Text>
                            <Text style={styles.tierRowDesc}>Corporate retreats & large travel groups</Text>
                          </View>
                          <Text style={[styles.tierRowDiscount, { color: "#7C3AED" }]}>20% OFF</Text>
                        </View>
                      </View>

                      {(() => {
                        const { tierPricing, addonsTotal, finalTotal } = calculateTotalWithAddons(selectedPackage, travelersCount);
                        return (
                          <View style={styles.calcSummaryBox}>
                            <View style={styles.calcSummaryLine}>
                              <Text style={styles.summaryLabel}>Base Rate:</Text>
                              <Text style={styles.summaryVal}>
                                {formatCurrency(tierPricing.baseRatePerPerson, selectedPackage.currency)} / person
                              </Text>
                            </View>
                            <View style={styles.calcSummaryLine}>
                              <Text style={styles.summaryLabel}>Active Discount ({tierPricing.discountPercent}%):</Text>
                              <Text style={[styles.summaryVal, { color: "#059669" }]}>
                                -{formatCurrency(tierPricing.baseRatePerPerson - tierPricing.discountedRatePerPerson, selectedPackage.currency)} / person
                              </Text>
                            </View>
                            <View style={styles.calcSummaryLine}>
                              <Text style={styles.summaryLabel}>Effective Per-Person Price:</Text>
                              <Text style={[styles.summaryVal, { fontWeight: "900", color: TRIP_PURPLE }]}>
                                {formatCurrency(tierPricing.discountedRatePerPerson, selectedPackage.currency)}
                              </Text>
                            </View>
                            {addonsTotal > 0 && (
                              <View style={styles.calcSummaryLine}>
                                <Text style={styles.summaryLabel}>Selected Addons:</Text>
                                <Text style={styles.summaryVal}>+{formatCurrency(addonsTotal, selectedPackage.currency)}</Text>
                              </View>
                            )}
                            <View style={styles.calcDivider} />
                            <View style={styles.calcSummaryLine}>
                              <Text style={[styles.summaryLabel, { fontWeight: "800", color: "#111827" }]}>
                                Total for {travelersCount} Travelers:
                              </Text>
                              <Text style={[styles.summaryVal, { fontSize: 20, fontWeight: "900", color: "#111827" }]}>
                                {formatCurrency(finalTotal, selectedPackage.currency)}
                              </Text>
                            </View>
                            {tierPricing.totalSavings > 0 && (
                              <View style={styles.savingsPill}>
                                <Ionicons name="sparkles" size={14} color="#059669" />
                                <Text style={styles.savingsPillText}>
                                  Total Group Savings: {formatCurrency(tierPricing.totalSavings, selectedPackage.currency)}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                )}

                <View style={{ height: 120 }} />
              </ScrollView>

              {/* Drawer Bottom Action Bar */}
              <View style={[styles.drawerFooterBar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
                {(() => {
                  const { tierPricing, finalTotal } = calculateTotalWithAddons(selectedPackage, travelersCount);
                  return (
                    <View>
                      <Text style={styles.footerTotalLabel}>
                        {travelersCount} Guests · {tierPricing.discountPercent > 0 ? `${tierPricing.discountPercent}% OFF` : "Standard"}:
                      </Text>
                      <Text style={styles.footerTotalAmount}>
                        {formatCurrency(finalTotal, selectedPackage.currency)}{" "}
                        <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "normal" }}>({selectedPackage.currency})</Text>
                      </Text>
                    </View>
                  );
                })()}

                {(() => {
                  const isSoldOut = selectedPackage.seatsLeft <= 0;
                  const isInsufficient = selectedPackage.seatsLeft < travelersCount;
                  const isActionDisabled = isBooking || isSoldOut || isInsufficient;

                  return (
                    <Pressable
                      style={[
                        styles.bookNowBtn,
                        isActionDisabled && !isBooking && { backgroundColor: "#94A3B8" },
                        isBooking && { opacity: 0.7 },
                      ]}
                      disabled={isActionDisabled}
                      onPress={() => handleBookNow(selectedPackage)}
                    >
                      {isBooking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : isSoldOut ? (
                        <>
                          <Ionicons name="ban" size={18} color="#FFFFFF" style={{ marginEnd: 6 }} />
                          <Text style={styles.bookNowBtnText}>প্যাকেজ পূর্ণ (Sold Out)</Text>
                        </>
                      ) : isInsufficient ? (
                        <>
                          <Ionicons name="alert-circle" size={18} color="#FFFFFF" style={{ marginEnd: 6 }} />
                          <Text style={styles.bookNowBtnText}>আসন অপর্যাপ্ত ({selectedPackage.seatsLeft}টি বাকি)</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.bookNowBtnText}>Reserve Package</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </>
                      )}
                    </Pressable>
                  );
                })()}
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Full-Screen Pinch-to-Zoom Image Preview Modal */}
      <FullScreenImageModal
        visible={fullScreenModal.visible}
        images={fullScreenModal.images}
        initialIndex={fullScreenModal.index}
        title={fullScreenModal.title}
        onClose={() => setFullScreenModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Departure Airport Modal */}
      <Modal visible={showOriginModal} transparent animationType="slide" onRequestClose={() => setShowOriginModal(false)}>
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Departure Airport</Text>
              <Pressable onPress={() => setShowOriginModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={18} color="#6B7280" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search airport or city..."
                placeholderTextColor="#9CA3AF"
                value={airportSearchText}
                onChangeText={setAirportSearchText}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {dynamicAirports
                .filter(
                  (a) =>
                    a.city.toLowerCase().includes(airportSearchText.toLowerCase()) ||
                    a.code.toLowerCase().includes(airportSearchText.toLowerCase())
                )
                .map((airport) => (
                  <Pressable
                    key={airport.code}
                    style={[styles.pickerItem, originAirport.code === airport.code && styles.pickerItemSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setOriginAirport(airport);
                      setShowOriginModal(false);
                    }}
                  >
                    <View style={styles.airportCodeBadge}>
                      <Text style={styles.airportCodeBadgeText}>{airport.code}</Text>
                    </View>
                    <View style={{ flex: 1, paddingStart: 12 }}>
                      <Text style={styles.pickerItemCity}>{airport.city}</Text>
                      <Text style={styles.pickerItemAirport}>{airport.airport}</Text>
                    </View>
                    {originAirport.code === airport.code && <Ionicons name="checkmark-circle" size={22} color={TRIP_BLUE} />}
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Destination Modal */}
      <Modal visible={showDestModal} transparent animationType="slide" onRequestClose={() => setShowDestModal(false)}>
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Destination</Text>
              <Pressable onPress={() => setShowDestModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={18} color="#6B7280" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search destination city..."
                placeholderTextColor="#9CA3AF"
                value={destSearchText}
                onChangeText={setDestSearchText}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {dynamicDestinations
                .filter((d) => d.name.toLowerCase().includes(destSearchText.toLowerCase()))
                .map((dest) => (
                  <Pressable
                    key={dest.name}
                    style={[styles.pickerItem, selectedDestination === dest.name && styles.pickerItemSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedDestination(dest.name);
                      setShowDestModal(false);
                    }}
                  >
                    <Ionicons name="location" size={20} color={TRIP_PURPLE} />
                    <View style={{ flex: 1, paddingStart: 12 }}>
                      <Text style={styles.pickerItemCity}>{dest.name}</Text>
                      <Text style={styles.pickerItemAirport}>{dest.country}</Text>
                    </View>
                    {selectedDestination === dest.name && <Ionicons name="checkmark-circle" size={22} color={TRIP_PURPLE} />}
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Package Compare Floating Bar */}
      {comparePackageIds.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 24,
            left: 16,
            right: 16,
            backgroundColor: "#0F172A",
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
            {comparePackageIds.length}টি প্যাকেজ নির্বাচিত
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => setComparePackageIds([])} style={{ marginEnd: 12 }}>
              <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13 }}>মুছুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCompareModal(true)}
              style={{
                backgroundColor: "#7C3AED",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                তুলনা দেখুন ({comparePackageIds.length})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Package Comparison Modal */}
      <ComparisonModal
        visible={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="ভ্যাকেশন প্যাকেজ তুলনা"
        items={packageComparisonItems}
        onSelect={(item) => {
          setShowCompareModal(false);
          const pkg = packages.find((p) => p.id === item.id);
          if (pkg) openDrawer(pkg);
        }}
        selectButtonLabel="বুকিং ও বিবরণ দেখুন"
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Stylesheet
// ============================================================================

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Hero Section
  heroCard: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  saveBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saveBadgeText: {
    color: "#1E1B4B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#E9D5FF",
    marginBottom: 16,
    lineHeight: 17,
  },

  // Search Box
  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.1)" } : {}),
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchFieldCol: {
    flex: 1,
    paddingVertical: 4,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  searchDividerVertical: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  searchDividerHorizontal: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },
  stepperInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  miniStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  miniStepBtnDisabled: {
    opacity: 0.4,
  },
  miniStepVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  miniDurationPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  miniDurationPillActive: {
    backgroundColor: TRIP_PURPLE,
  },
  miniDurationText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  miniDurationTextActive: {
    color: "#FFFFFF",
  },

  // Category Tabs
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryTabActive: {
    backgroundColor: TRIP_PURPLE,
    borderColor: TRIP_PURPLE,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },

  // Results bar
  resultsBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  resultsCountText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  searchPillInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    width: 170,
  },
  inlineSearchInput: {
    fontSize: 12,
    color: "#111827",
    padding: 0,
    flex: 1,
  },

  // Loading & Empty
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 10,
    backgroundColor: TRIP_PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // Package Card
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.06)" } : {}),
  },
  cardBody: {
    padding: 16,
  },
  titleMetaSection: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 22,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  reviewCountText: {
    fontSize: 12,
    color: "#6B7280",
  },
  durationBullet: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  durationText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },

  // Dual Pills
  dualPillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  flightPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  flightPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
    flex: 1,
  },
  hotelPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  hotelPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D28D9",
    flex: 1,
  },

  // High-Contrast Tags
  tagsContainer: {
    gap: 10,
    marginBottom: 14,
  },
  tagSection: {},
  tagSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  inclusionsSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#065F46",
    letterSpacing: 0.5,
  },
  exclusionsSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#991B1B",
    letterSpacing: 0.5,
  },
  inclusionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  inclusionHighContrastTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inclusionHighContrastText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },
  exclusionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  exclusionHighContrastTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exclusionHighContrastText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991B1B",
  },

  // Itinerary Preview Box
  itineraryPreviewBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 14,
  },
  itineraryPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itineraryPreviewHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  seeFullItineraryText: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_PURPLE,
  },
  cardItineraryDay: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    overflow: "hidden",
  },
  cardDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  dayMiniBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayMiniBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: TRIP_PURPLE,
  },
  dayMiniTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  cardDayBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  daySummaryText: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 6,
    lineHeight: 16,
  },
  mealIndicatorsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  mealIndicatorLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
  },
  mealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealChipActive: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  mealChipInactive: {
    backgroundColor: "#F3F4F6",
  },
  mealChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  mealChipTextActive: {
    color: "#059669",
  },
  mealChipTextInactive: {
    color: "#9CA3AF",
  },

  // Group Tier Calculator Box
  groupTierBox: {
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 12,
  },
  groupTierTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupTierTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  groupTierSubtitle: {
    fontSize: 12,
    color: "#6D28D9",
    fontWeight: "600",
    marginTop: 1,
  },
  groupTierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  groupTierBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#065F46",
  },
  tierProgressionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  tierStep: {
    alignItems: "center",
    gap: 3,
  },
  tierStepActive: {},
  tierStepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tierStepCircleActive: {
    backgroundColor: TRIP_PURPLE,
  },
  tierStepNum: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  tierStepLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  tierStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
    marginBottom: 12,
  },
  tierStepLineActive: {
    backgroundColor: TRIP_PURPLE,
  },
  quickTierPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  tierPillBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  tierPillBtnActive: {
    backgroundColor: "#EDE9FE",
    borderColor: TRIP_PURPLE,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  tierPillTextActive: {
    color: TRIP_PURPLE,
    fontWeight: "900",
  },
  priceBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EDE9FE",
    paddingTop: 10,
  },
  strikethroughPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  discountedRateText: {
    fontSize: 18,
    fontWeight: "900",
    color: TRIP_PURPLE,
  },
  rateUnitText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  groupTotalSummary: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewDetailBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  // Drawer Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    ...(Platform.OS === "web" ? { boxShadow: "0px -4px 16px rgba(15, 23, 42, 0.15)" } : {}),
  },
  drawerHandleBar: {
    width: 44,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  drawerHeaderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  drawerHeaderSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  drawerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FAFAFA",
  },
  drawerTabItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  drawerTabItemActive: {
    borderBottomColor: TRIP_PURPLE,
  },
  drawerTabItemText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  drawerTabItemTextActive: {
    color: TRIP_PURPLE,
    fontWeight: "900",
  },
  drawerScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabContent: {
    gap: 14,
  },
  drawerHeroImageWrapper: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  drawerHeroImage: {
    width: "100%",
    height: "100%",
  },
  drawerZoomPill: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  drawerZoomPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  overviewQuickSpecs: {
    flexDirection: "row",
    gap: 10,
  },
  specBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    alignItems: "center",
  },
  specValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginTop: 4,
    textAlign: "center",
  },
  specLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  inclusionsCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  checkItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
    lineHeight: 18,
  },
  addonsList: {
    gap: 10,
  },
  addonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  addonCardSelected: {
    borderColor: TRIP_PURPLE,
    backgroundColor: "#FAF5FF",
  },
  addonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addonTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  addonDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  addonPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_PURPLE,
    marginTop: 3,
  },
  addonCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  addonCheckboxChecked: {
    backgroundColor: TRIP_PURPLE,
    borderColor: TRIP_PURPLE,
  },

  // Itinerary Tab
  itineraryTabHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  itinerarySub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  expandAllBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandAllBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  itineraryAccordionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    overflow: "hidden",
  },
  itineraryAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  dayBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: TRIP_PURPLE,
  },
  dayTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  itineraryAccordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  timelineNode: {
    flexDirection: "row",
    marginTop: 10,
  },
  timelineSpine: {
    width: 20,
    alignItems: "center",
    marginEnd: 8,
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  nodeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 2,
  },
  nodeContent: {
    flex: 1,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4B5563",
  },
  eventText: {
    fontSize: 12,
    color: "#1F2937",
    lineHeight: 16,
  },
  drawerMealBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  drawerMealBarLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    marginBottom: 6,
  },
  drawerMealChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  drawerMealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  drawerMealChipYes: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  drawerMealChipNo: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  drawerMealChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  drawerMealChipTextYes: {
    color: "#065F46",
  },

  // Inclusions Tab
  inclusionsBoxHighContrast: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#10B981",
    padding: 14,
    marginBottom: 12,
  },
  inclusionsBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  inclusionsBoxTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#065F46",
  },
  inclusionsTagsGrid: {
    gap: 6,
  },
  inclusionCardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inclusionCardTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  exclusionsBoxHighContrast: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 14,
    marginBottom: 12,
  },
  exclusionsBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  exclusionsBoxTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#991B1B",
  },
  exclusionsTagsGrid: {
    gap: 6,
  },
  exclusionCardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exclusionCardTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
    flex: 1,
  },
  policyCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 14,
  },
  policyCardHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  policyCardBody: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },

  // Flight & Hotel Tab
  flightDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  flightCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  airlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  airlineBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  flightNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  routeSchematic: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 12,
  },
  airportCodeText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  airportCitySub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  flightLineCenter: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
  },
  dashedFlightLine: {
    width: "100%",
    height: 1,
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  flightDurationLabel: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
  },
  flightSpecsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  flightSpecItem: {
    width: "47%",
  },
  specSubHeading: {
    fontSize: 12,
    color: "#6B7280",
  },
  specSubVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginTop: 1,
  },
  hotelDetailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  hotelPreviewImg: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
  },
  hotelNameTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },
  hotelStarsRow: {
    flexDirection: "row",
    gap: 2,
  },
  hotelAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 8,
  },
  roomTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  roomTypePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D28D9",
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  amenityTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },

  // Group Pricing Tab
  pricingCalculatorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  calcStepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  calcStepperLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  calcStepperSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  calcStepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calcStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  calcStepBtnDisabled: {
    opacity: 0.3,
  },
  calcStepValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },
  tierCardsStack: {
    gap: 8,
    marginBottom: 14,
  },
  tierDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  tierDetailRowActive: {
    borderColor: TRIP_PURPLE,
    backgroundColor: "#FAF5FF",
  },
  tierRowHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  tierRowDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  tierRowDiscount: {
    fontSize: 12,
    fontWeight: "900",
    color: TRIP_PURPLE,
  },
  calcSummaryBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  calcSummaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  calcDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
    justifyContent: "center",
  },
  savingsPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },

  // Drawer Footer Bar
  drawerFooterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  footerTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  footerTotalAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: TRIP_PURPLE,
  },
  bookNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_PURPLE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  bookNowBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  // Modals Shared Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: 520,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  modalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 14,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerItemSelected: {
    backgroundColor: "#F5F3FF",
  },
  airportCodeBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  airportCodeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  pickerItemCity: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  pickerItemAirport: {
    fontSize: 12,
    color: "#6B7280",
  },
});
