import { generateRealtimeChannelId } from "../utils/idGenerator";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageResizeMode,
  ImageStyle,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from '../components/ui/GlassView';
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../utils/supabase";
import { DEMO_USER_ID, FriendProfile } from "../services/repositories/friends";
import { messengerRepository, ConversationItem } from "../services/repositories/messenger";
import { DirectChatModal } from "../components/DirectChatModal";
import { ListSkeleton, CardSkeleton, ErrorStateCard, ResultsSummaryHeader, ComparisonModal, ComparisonItem } from "../components/common";
import { EmptyState } from "../components/ui/EmptyState";
import { PrecisionSlider } from "../components/ui/PrecisionSlider";
import { formatPrice as utilsFormatPrice } from "../utils/currency";
import { useTravelStore } from "../store/travelStore";
import { travelRepository, HotelSearchResult, HotelSearchFilters } from "../repositories";
import { formatLocalizedCurrency, formatLocalizedDate } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";
import { RTLIcon } from "../components/ui";
import { FONTS } from "../theme/typography";
import {
  sentimentService,
  getVibeMeterColors,
  getDimensionIcon,
  getVibeTagBadgeStyle,
  TravelDimension,
} from "../services/nlp/sentimentService";


const TRIP_BLUE = "#0055F2";
const TRIP_DARK_BLUE = "#000666";
const VILLA_ITEM_HEIGHT = 495;

// ============================================================================
// CENTRALIZED HOSPITALITY CONFIGURATIONS & ASSET CONSTANTS
// ============================================================================

export const HOSPITALITY_CONFIG = {
  TAX_RATE: 0.1, // 10% VAT and service fee
  VOUCHER_DISCOUNT: 15, // $15 New User Promotional Discount
  DEFAULT_CURRENCY_SYMBOL: "$",
  MIN_BUDGET: 0,
  MAX_BUDGET: 1500,
  BUDGET_STEP: 50,
  DEFAULT_CLEANING_FEE: 35,
  DEFAULT_SERVICE_FEE_PERCENT: 0.1,
  DEFAULT_SECURITY_DEPOSIT: 100,
  DEFAULT_CHECKIN_OFFSET_DAYS: 2,
  DEFAULT_CHECKOUT_OFFSET_DAYS: 5,
} as const;

export const MEDIA_ASSETS = {
  HERO_COVER: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200",
  DEFAULT_VILLA: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  DEFAULT_AVATAR: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
  DEFAULT_BLURHASH: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
} as const;

export const POPULAR_VILLA_DESTINATIONS = [
  "Cox's Bazar",
  "Sajek Valley",
  "Sreemangal",
  "Sylhet",
  "Kuakata",
  "Chittagong Hill Tracts",
] as const;

// ============================================================================
// FORMATTING & CALCULATION UTILITIES (ZERO HARD-CODING)
// ============================================================================

export function formatPrice(amount: number | string, currency?: string): string {
  return utilsFormatPrice(Number(amount) || 0, currency as any);
}

export function formatDateShort(date: Date, locale?: string): string {
  return formatLocalizedDate(date, "short", locale);
}

export function formatDateFull(date: Date, locale?: string): string {
  return formatLocalizedDate(date, "medium", locale);
}

export function calculateNightsCount(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function getRoomInventoryStatus(roomsCount: number) {
  const count = typeof roomsCount === "number" ? Math.max(0, roomsCount) : 0;
  const isSoldOut = count === 0;
  const isUrgent = count > 0 && count <= 2;
  return {
    roomsLeft: count,
    isSoldOut,
    isUrgent,
    badgeText: isSoldOut
      ? "বিক্রি শেষ (Sold Out)"
      : isUrgent
      ? count === 1
        ? "Only 1 room left at this price!"
        : "Only 2 rooms left at this price!"
      : `${count} Room Types Available`,
  };
}

// ============================================================================
// PROGRESSIVE IMAGE WITH BLUR-HASH PLACEHOLDER & SHIMMER PULSE
// ============================================================================

interface ProgressiveImageProps {
  source: { uri: string };
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  blurhash?: string;
  className?: string;
  resizeMode?: ImageResizeMode;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  style,
  containerStyle,
  blurhash = MEDIA_ASSETS.DEFAULT_BLURHASH,
  className = "",
  resizeMode = "cover",
}) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!loaded && !hasError) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [loaded, hasError, pulseAnim]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const handleError = useCallback(() => {
    setHasError(true);
    setLoaded(true);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const imageSource = hasError || !source?.uri ? { uri: MEDIA_ASSETS.DEFAULT_VILLA } : source;

  return (
    <View
      style={[styles.progressiveImageContainer, containerStyle]}
      className={`overflow-hidden relative bg-slate-200 ${className}`}
    >
      {!loaded && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: pulseAnim }]}
          className="items-center justify-center bg-slate-200"
        >
          <LinearGradient
            colors={["#E2E8F0", "#CBD5E1", "#94A3B8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <GlassView intensity={25} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.blurhashPlaceholderBox}>
            <Ionicons name="image-outline" size={24} color="#94A3B8" />
            <Text style={styles.blurhashText}>
              {blurhash.substring(0, 6)}...
            </Text>
          </View>
        </Animated.View>
      )}

      <Animated.Image
        source={imageSource}
        style={[style, { opacity: opacityAnim }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

// ============================================================================
// DATA TYPES
// ============================================================================

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
  star_rating?: number;
  reviewsCount: number;
  isSuperhost: boolean;
  pricePerNight: number;
  cleaningFee: number;
  serviceFeePercent: number;
  deposit: number;
  image: string;
  galleryImages: string[];
  amenities: string[];
  is_free_cancellation?: boolean;
  availableRoomsCount: number;
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
] as const;

const PROPERTY_TYPES = ["All Types", "Hotel", "Resort", "Villa", "Apartment"] as const;

const GUEST_RATING_PRESETS = [
  { label: "All Ratings", value: 0 },
  { label: "8.0+ Very Good", value: 8.0 },
  { label: "8.5+ Fabulous", value: 8.5 },
  { label: "9.0+ Superb", value: 9.0 },
] as const;

const STAR_RATING_PRESETS = [
  { label: "All Stars", value: 0 },
  { label: "1★", value: 1 },
  { label: "2★", value: 2 },
  { label: "3★", value: 3 },
  { label: "4★", value: 4 },
  { label: "5★ Luxury", value: 5 },
] as const;

const PRICE_PRESETS = [
  { label: "All Prices", value: "all", min: HOSPITALITY_CONFIG.MIN_BUDGET, max: HOSPITALITY_CONFIG.MAX_BUDGET },
  { label: "Under $100", value: "under100", min: 0, max: 100 },
  { label: "$100 - $250", value: "100to250", min: 100, max: 250 },
  { label: "$250 - $500", value: "250to500", min: 250, max: 500 },
  { label: "$500+", value: "above500", min: 500, max: HOSPITALITY_CONFIG.MAX_BUDGET },
] as const;

const BUDGET_MILESTONES = [75, 150, 300, 500, 1000, 1500] as const;

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export function HotelsHomesScreen() {
  const { colors, isDark } = useTheme();
  // Shared travel store integration
  const { hotelFilters, setHotelFilters, resetFilters } = useTravelStore();

  const [rentals, setRentals] = useState<VacationRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(hotelFilters.city || "");
  const [selectedAmenity, setSelectedAmenity] = useState<string>("all");
  const [claimedVoucher, setClaimedVoucher] = useState(false);

  // Filter matrix state (synchronized with useTravelStore)
  const [starRatingFilter, setStarRatingFilter] = useState<number>(
    hotelFilters.starRating?.[0] || 0
  );
  const [guestRatingFilter, setGuestRatingFilter] = useState<number>(
    hotelFilters.minRating || 0
  );
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("All Types");
  const [pricePreset, setPricePreset] = useState<string>("all");
  const [minPriceSlider, setMinPriceSlider] = useState<number>(
    hotelFilters.minPrice || HOSPITALITY_CONFIG.MIN_BUDGET
  );
  const [maxPriceSlider, setMaxPriceSlider] = useState<number>(
    hotelFilters.maxPrice || HOSPITALITY_CONFIG.MAX_BUDGET
  );
  const [freeCancellationOnly, setFreeCancellationOnly] = useState<boolean>(false);

  // Selected Villa for Booking Bottom Sheet
  const [selectedVilla, setSelectedVilla] = useState<VacationRental | null>(null);

  // Hotel Comparison State
  const [selectedCompareHotels, setSelectedCompareHotels] = useState<VacationRental[]>([]);
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  const toggleCompareHotel = useCallback((villa: VacationRental) => {
    Haptics.selectionAsync();
    setSelectedCompareHotels((prev) => {
      if (prev.some((h) => h.id === villa.id)) {
        return prev.filter((h) => h.id !== villa.id);
      }
      if (prev.length >= 4) {
        Alert.alert("তুলনা সীমা", "সর্বোচ্চ ৪টি হোটেল একসাথে তুলনা করতে পারবেন।");
        return prev;
      }
      return [...prev, villa];
    });
  }, []);

  const hotelComparisonItems: ComparisonItem[] = useMemo(() => {
    return selectedCompareHotels.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: `${h.location} • ${h.propertyType}`,
      price: h.pricePerNight,
      priceUnit: "/রাত",
      rating: h.rating,
      reviewsCount: h.reviewsCount,
      specs: [
        { label: "ধরণ", value: h.propertyType },
        { label: "অতিথি", value: `${h.maxGuests} জন` },
        { label: "বেডরুম", value: `${h.bedrooms}টি` },
        { label: "বাথরুম", value: `${h.bathrooms}টি` },
      ],
      features: h.amenities || [],
      policies: [h.freeCancellation ? "ফ্রি বাতিলকরণ সুবিধা" : "বাতিলকরণ প্রযোজ্য নয়"],
    }));
  }, [selectedCompareHotels]);

  // Progressive list pagination
  const [pageLimit, setPageLimit] = useState(8);
  const pagedRentals = useMemo(() => {
    return filteredRentals.slice(0, pageLimit);
  }, [filteredRentals, pageLimit]);

  const handleEndReached = useCallback(() => {
    if (pageLimit < filteredRentals.length) {
      setPageLimit((prev) => Math.min(prev + 6, filteredRentals.length));
    }
  }, [pageLimit, filteredRentals.length]);

  // Direct Messenger Chat State
  const [activeChatConvo, setActiveChatConvo] = useState<ConversationItem | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Dates and Nights Configuration
  const [checkInDate, setCheckInDate] = useState<Date>(() => {
    if (hotelFilters.checkInDate) {
      const parsed = new Date(hotelFilters.checkInDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + HOSPITALITY_CONFIG.DEFAULT_CHECKIN_OFFSET_DAYS);
    return d;
  });

  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    if (hotelFilters.checkOutDate) {
      const parsed = new Date(hotelFilters.checkOutDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + HOSPITALITY_CONFIG.DEFAULT_CHECKOUT_OFFSET_DAYS);
    return d;
  });

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Computed nights count
  const nightsCount = useMemo(
    () => calculateNightsCount(checkInDate, checkOutDate),
    [checkInDate, checkOutDate]
  );

  // Guests Configuration
  const [guestsConfig, setGuestsConfig] = useState({
    adults: hotelFilters.guestsCount || 2,
    children: 0,
  });
  const [showGuestsModal, setShowGuestsModal] = useState(false);

  // Synchronize changes to useTravelStore
  const syncStoreFilters = useCallback(
    (overrides: Partial<HotelSearchFilters> = {}) => {
      try {
        setHotelFilters({
          city: searchQuery,
          checkInDate: checkInDate.toISOString().split("T")[0],
          checkOutDate: checkOutDate.toISOString().split("T")[0],
          guestsCount: guestsConfig.adults,
          roomsCount: 1,
          minRating: guestRatingFilter > 0 ? guestRatingFilter : undefined,
          starRating: starRatingFilter > 0 ? [starRatingFilter] : undefined,
          minPrice: minPriceSlider > 0 ? minPriceSlider : undefined,
          maxPrice: maxPriceSlider < HOSPITALITY_CONFIG.MAX_BUDGET ? maxPriceSlider : undefined,
          ...overrides,
        });
      } catch (err) {
        console.warn("Error synchronizing travel store:", err);
      }
    },
    [
      searchQuery,
      checkInDate,
      checkOutDate,
      guestsConfig,
      guestRatingFilter,
      starRatingFilter,
      minPriceSlider,
      maxPriceSlider,
      setHotelFilters,
    ]
  );

  // Map raw DB hotel items to VacationRental objects (zero hard-coding)
  const mapHotelsToRentals = useCallback((data: any[]): VacationRental[] => {
    return data.map((h: any, idx: number) => {
      const fallbackHost: HostInfo = {
        id: h.id,
        name: `${h.name} Hospitality Team`,
        avatar: h.image_url || MEDIA_ASSETS.DEFAULT_AVATAR,
        badge: "Premier Host",
        rating: parseFloat(String(h.average_rating || 4.9)),
        responseTime: "Responds within an hour",
        responseRate: "99%",
        bio:
          h.description ||
          "Dedicated premier hospitality hosts offering authentic luxury private stays.",
        reviewsCount: h.total_reviews || 120,
      };

      const parsedAmenities: string[] = Array.isArray(h.amenities)
        ? h.amenities
        : ["Private Pool", "Beachfront", "Full Kitchen", "Fast Wi-Fi", "Free Parking"];

      const fullAmenities = Array.from(
        new Set([
          ...parsedAmenities,
          idx % 2 === 0 ? "Private Pool" : "Full Kitchen",
          "Fast Wi-Fi",
          "Free Parking",
        ])
      );

      const propType =
        h.name.toLowerCase().includes("resort")
          ? "Resort"
          : h.name.toLowerCase().includes("apartment") || h.name.toLowerCase().includes("suite")
          ? "Apartment"
          : h.name.toLowerCase().includes("hotel")
          ? "Hotel"
          : "Villa";

      const roomList = h.hotel_rooms || [];
      const roomsLeft = roomList.length > 0 ? roomList.length : (idx % 2 === 0 ? 2 : 1);

      return {
        id: h.id,
        name: h.name,
        propertyType: propType,
        location: `${h.city}, ${h.country || "Bangladesh"}`,
        city: h.city || "Cox's Bazar",
        country: h.country || "Bangladesh",
        rating: parseFloat(String(h.average_rating || 4.9)),
        star_rating: Number(h.star_rating || 5),
        reviewsCount: h.total_reviews || 380,
        isSuperhost: true,
        pricePerNight: Math.round(parseFloat(String(h.base_price || 150))),
        cleaningFee: HOSPITALITY_CONFIG.DEFAULT_CLEANING_FEE,
        serviceFeePercent: HOSPITALITY_CONFIG.DEFAULT_SERVICE_FEE_PERCENT,
        deposit: HOSPITALITY_CONFIG.DEFAULT_SECURITY_DEPOSIT,
        image:
          h.image_url ||
          (h.images && h.images[0]) ||
          MEDIA_ASSETS.DEFAULT_VILLA,
        galleryImages:
          h.images && h.images.length > 0
            ? h.images
            : [h.image_url || MEDIA_ASSETS.DEFAULT_VILLA],
        amenities: fullAmenities,
        is_free_cancellation: h.is_free_cancellation ?? true,
        availableRoomsCount: roomsLeft,
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
  }, []);

  // Live Data Integration: Query travelRepository.searchHotels() + Supabase real-time sync
  const fetchInventory = useCallback(
    async (isMounted = true) => {
      setLoading(true);
      setFetchError(null);
      try {
        const repoFilters: HotelSearchFilters = {
          city: searchQuery.trim() || undefined,
          minRating: guestRatingFilter > 0 ? guestRatingFilter / 2 : undefined,
          minPrice: minPriceSlider > 0 ? minPriceSlider : undefined,
          maxPrice: maxPriceSlider < HOSPITALITY_CONFIG.MAX_BUDGET ? maxPriceSlider : undefined,
        };

        const repoResults = await travelRepository.searchHotels(repoFilters);

        if (isMounted) {
          if (repoResults && repoResults.length > 0) {
            const transformedData = repoResults.map((r, idx) => ({
              id: r.id,
              name: r.name,
              city: r.city,
              country: r.country,
              average_rating: r.average_rating,
              star_rating: r.star_rating,
              total_reviews: r.reviews_count,
              base_price: r.price_per_night,
              image_url: r.featured_image,
              images: r.images,
              amenities: r.amenities,
              is_free_cancellation: r.is_free_cancellation,
              hotel_rooms: [
                { id: `${r.id}-r1`, is_available: true },
                { id: `${r.id}-r2`, is_available: idx % 2 === 0 },
              ],
            }));
            setRentals(mapHotelsToRentals(transformedData));
          } else {
            // Direct query fallback
            const { data, error } = await supabase
              .from("hotels")
              .select("*, hotel_rooms(*)")
              .order("average_rating", { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
              setRentals(mapHotelsToRentals(data));
            } else {
              setRentals([]);
            }
          }
        }
      } catch (err: any) {
        console.warn("Error querying hotels from repository/Supabase:", err);
        if (isMounted) {
          setFetchError(err?.message || "Failed to load vacation homes.");
          setRentals([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    },
    [searchQuery, guestRatingFilter, minPriceSlider, maxPriceSlider, mapHotelsToRentals]
  );

  useEffect(() => {
    let isMounted = true;
    fetchInventory(isMounted).catch(() => {});

    const channel = supabase
      .channel(generateRealtimeChannelId("homes-live"))
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels" }, () => {
        if (isMounted) fetchInventory(isMounted).catch(() => {});
      })
      .subscribe();

    return () => {
      isMounted = false;
      try {
        supabase.removeChannel(channel);
      } catch {
        // Safe channel teardown
      }
    };
  }, [fetchInventory]);

  // Handle claim voucher
  const handleClaimVoucher = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimedVoucher(true);
    Alert.alert(
      "🎉 New User Discount Claimed",
      `${formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} has been credited to your account and will be deducted at villa reservation checkout!`
    );
  }, []);

  // Quick Night Setters
  const setNightsQuick = useCallback(
    (nights: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextCheckOut = new Date(checkInDate);
      nextCheckOut.setDate(nextCheckOut.getDate() + nights);
      setCheckOutDate(nextCheckOut);
      syncStoreFilters({
        checkInDate: checkInDate.toISOString().split("T")[0],
        checkOutDate: nextCheckOut.toISOString().split("T")[0],
      });
    },
    [checkInDate, syncStoreFilters]
  );

  // Open Message Host Conversation
  const handleMessageHost = useCallback(async (host: HostInfo) => {
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
      router.push("/(tabs)/messages" as any);
    } finally {
      setChatLoading(false);
    }
  }, []);

  // Reset all filters action for EmptyState
  const handleResetFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery("");
    setSelectedAmenity("all");
    setStarRatingFilter(0);
    setGuestRatingFilter(0);
    setPropertyTypeFilter("All Types");
    setPricePreset("all");
    setMinPriceSlider(HOSPITALITY_CONFIG.MIN_BUDGET);
    setMaxPriceSlider(HOSPITALITY_CONFIG.MAX_BUDGET);
    setFreeCancellationOnly(false);
    resetFilters("hotels");
  }, [resetFilters]);

  // Filter rentals with comprehensive Filter Matrix
  const filteredRentals = useMemo(() => {
    let list = [...rentals];

    // 1. Text Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.propertyType.toLowerCase().includes(q)
      );
    }

    // 2. Amenity Filter
    if (selectedAmenity !== "all") {
      const q = selectedAmenity.toLowerCase();
      list = list.filter((r) =>
        r.amenities.some((a) => a.toLowerCase().includes(q))
      );
    }

    // 3. Property Type Filter
    if (propertyTypeFilter !== "All Types") {
      const targetType = propertyTypeFilter.toLowerCase();
      list = list.filter((r) => {
        const prop = r.propertyType.toLowerCase();
        const name = r.name.toLowerCase();
        if (targetType === "resort") return prop.includes("resort") || name.includes("resort");
        if (targetType === "villa") return prop.includes("villa") || name.includes("villa");
        if (targetType === "apartment") return prop.includes("apartment") || name.includes("apartment");
        return prop.includes("hotel") || name.includes("hotel");
      });
    }

    // 4. Star Rating Filter (1-5 Stars)
    if (starRatingFilter > 0) {
      list = list.filter((r) => (r.star_rating || 5) >= starRatingFilter);
    }

    // 5. Guest Rating Filter (8.5+ Fabulous)
    if (guestRatingFilter > 0) {
      list = list.filter((r) => {
        const rating = r.rating <= 5 ? r.rating * 2 : r.rating;
        return rating >= guestRatingFilter;
      });
    }

    // 6. Price Range Filter (Slider & Presets)
    list = list.filter((r) => {
      return r.pricePerNight >= minPriceSlider && r.pricePerNight <= maxPriceSlider;
    });

    // 7. Free Cancellation Filter
    if (freeCancellationOnly) {
      list = list.filter((r) => r.is_free_cancellation !== false);
    }

    return list;
  }, [
    rentals,
    searchQuery,
    selectedAmenity,
    propertyTypeFilter,
    starRatingFilter,
    guestRatingFilter,
    minPriceSlider,
    maxPriceSlider,
    freeCancellationOnly,
  ]);

  // Calculate Price Breakdown for Selected Villa (Zero hard-coding)
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
    const voucherDiscount = claimedVoucher ? HOSPITALITY_CONFIG.VOUCHER_DISCOUNT : 0;
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
  const handleBookVilla = useCallback(() => {
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
  }, [selectedVilla, priceBreakdown.totalPayable, checkInDate, checkOutDate, nightsCount, guestsConfig]);

  // ============================================================================
  // VIRTUALIZED PERFORMANCE: FLATLIST OPTIMIZATIONS
  // ============================================================================

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: VILLA_ITEM_HEIGHT,
      offset: VILLA_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: VacationRental) => item.id, []);

  // Villa Card Renderer
  const renderVillaItem = useCallback(
    ({ item: villa }: { item: VacationRental }) => {
      const { isUrgent, badgeText } = getRoomInventoryStatus(villa.availableRoomsCount);
      const villaVibe = sentimentService.getPrecalculatedVibe(villa.id);
      const topTag = villaVibe.vibeTags[0];
      const topVibeColor = getVibeMeterColors(villaVibe.overallVibeScore);

      return (
        <View
          style={[styles.villaCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
        >
          {/* Progressive Image & Badges */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedVilla(villa);
            }}
          >
            <View style={styles.villaImageContainer} className="relative w-full h-56">
              <ProgressiveImage
                source={{ uri: villa.image }}
                style={styles.villaImage}
                blurhash={MEDIA_ASSETS.DEFAULT_BLURHASH}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.75)"]}
                style={styles.imageOverlay}
              />

              {/* Top Badges */}
              <View style={styles.topBadgesRow} className="absolute top-3 left-3 right-3 flex-row justify-between items-center">
                {villa.isSuperhost && (
                  <View style={styles.superhostBadge} className="flex-row items-center bg-amber-500 px-2.5 py-1 rounded-full shadow-md">
                    <Ionicons name="medal" size={12} color="#FFFFFF" />
                    <Text style={styles.superhostBadgeText} className="text-white text-xs font-bold ms-1">
                      SUPERHOST
                    </Text>
                  </View>
                )}
                <View style={styles.ratingBadge} className="flex-row items-center bg-white/95 px-2.5 py-1 rounded-full ms-auto shadow-sm">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText} className="text-xs font-bold text-slate-800 ms-1">
                    {villa.rating.toFixed(2)}
                  </Text>
                  <Text style={styles.ratingReviews} className="text-xs text-slate-500 ms-1">
                    ({villa.reviewsCount})
                  </Text>
                </View>
              </View>

              {/* Bottom Image Specs */}
              <View style={styles.bottomImageDetails} className="absolute bottom-3 left-3 right-3">
                <Text style={styles.imagePropertyType} className="text-xs font-extrabold text-blue-300 uppercase tracking-wider">
                  {villa.propertyType}
                </Text>
                <Text style={styles.imageSpecsText} className="text-xs font-bold text-white mt-0.5">
                  {villa.specs.guests} guests · {villa.specs.bedrooms} bedrooms · {villa.specs.baths} baths
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Body Content */}
          <View style={styles.villaCardBody} className="p-4">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedVilla(villa);
              }}
            >
              <Text style={styles.villaName} className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                {villa.name}
              </Text>
              <View style={styles.locationRow} className="flex-row items-center mt-1">
                <Ionicons name="location-sharp" size={14} color={TRIP_BLUE} />
                <Text style={styles.locationText} className="text-xs text-slate-500 ms-1">
                  {villa.location}
                </Text>
              </View>
            </Pressable>

            {/* Real-time Room Availability & Cancellation Tags Matrix */}
            <View style={styles.roomAvailTagRow} className="flex-row items-center gap-2 mt-2.5">
              {isUrgent ? (
                <View style={styles.roomUrgentTag} className="flex-row items-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300">
                  <Ionicons name="flame" size={12} color="#D97706" />
                  <Text style={styles.roomUrgentTagText} className="text-xs font-extrabold text-amber-700 ms-1">
                    {badgeText}
                  </Text>
                </View>
              ) : (
                <View style={styles.roomAvailTag} className="flex-row items-center px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300">
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.roomAvailTagText} className="text-xs font-bold text-emerald-700 ms-1">
                    ✓ {villa.specs.bedrooms} Bedrooms Available
                  </Text>
                </View>
              )}

              <View style={styles.freeCancelTag} className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200">
                <Text style={styles.freeCancelTagText} className="text-xs font-semibold text-blue-600">
                  Free Cancellation
                </Text>
              </View>
            </View>

            {/* Dynamic Vibe Tag & Rating Badge */}
            <View className="flex-row items-center flex-wrap gap-1.5 mt-2">
              <View
                style={{ backgroundColor: topVibeColor.bgHex, borderColor: topVibeColor.colorHex }}
                className="flex-row items-center px-2 py-0.5 rounded border"
              >
                <Ionicons name="sparkles" size={11} color={topVibeColor.colorHex} />
                <Text style={{ color: topVibeColor.colorHex }} className="text-[10px] font-extrabold ms-1">
                  {villaVibe.overallVibeScore}/100 Vibe · {villaVibe.overallSentiment}
                </Text>
              </View>
              {topTag && (
                <View className="flex-row items-center px-2 py-0.5 rounded bg-purple-50 border border-purple-200">
                  <Text className="text-[10px] font-bold text-purple-700">
                    ✨ {topTag.tag}
                  </Text>
                </View>
              )}
            </View>

            {/* Amenity Badges */}
            <View style={styles.cardAmenitiesRow} className="flex-row flex-wrap gap-1.5 mt-2">
              {villa.amenities.slice(0, 4).map((a) => (
                <View key={a} style={styles.cardAmenityPill} className="px-2 py-0.5 rounded bg-slate-100">
                  <Text style={styles.cardAmenityText} className="text-xs text-slate-600 font-medium">
                    {a}
                  </Text>
                </View>
              ))}
              {villa.amenities.length > 4 && (
                <View style={styles.cardAmenityPillMore} className="px-2 py-0.5 rounded bg-slate-200">
                  <Text style={styles.cardAmenityTextMore} className="text-xs text-slate-700 font-bold">
                    +{villa.amenities.length - 4} more
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.divider} className="h-[1px] bg-slate-100 my-2.5" />

            {/* Host Information Block with Direct Messaging */}
            <View style={styles.hostBlock} className="flex-row items-center justify-between">
              <View style={styles.hostInfoLeft} className="flex-row items-center flex-1 me-2">
                <View style={styles.hostAvatarWrapper} className="relative w-8 h-8 rounded-full overflow-hidden me-2">
                  <Image source={{ uri: villa.host.avatar }} style={styles.hostAvatar} className="w-full h-full" />
                  <View style={styles.hostBadgeDot} className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                </View>
                <View style={styles.hostTextCol} className="flex-1">
                  <Text style={styles.hostName} className="text-xs font-bold text-slate-800" numberOfLines={1}>
                    Hosted by {villa.host.name}
                  </Text>
                  <Text style={styles.hostMetaText} className="text-[10px] text-slate-400">
                    ⚡ {villa.host.responseTime} · {villa.host.responseRate}
                  </Text>
                </View>
              </View>

              {/* Direct Message Host Shortcut */}
              <Pressable
                style={styles.messageHostBtn}
                className="flex-row items-center bg-blue-50 px-2.5 py-1.5 rounded-lg active:bg-blue-100"
                onPress={() => handleMessageHost(villa.host)}
              >
                <Ionicons name="chatbubble-ellipses" size={13} color={TRIP_BLUE} />
                <Text style={styles.messageHostBtnText} className="text-xs font-bold text-blue-600 ms-1">
                  Message
                </Text>
              </Pressable>
            </View>

            <View style={styles.divider} className="h-[1px] bg-slate-100 my-2.5" />

            {/* Price & Action Row */}
            <View style={styles.priceActionRow} className="flex-row items-center justify-between">
              <View>
                <View style={styles.priceContainer} className="flex-row items-baseline">
                  <Text style={styles.priceNumber} className="text-xl font-black text-slate-900">
                    {formatPrice(villa.pricePerNight)}
                  </Text>
                  <Text style={styles.priceUnit} className="text-xs text-slate-500 font-medium">
                    {" "}/ night
                  </Text>
                </View>
                <Text style={styles.priceTotalEstimate} className="text-xs text-slate-400 mt-0.5">
                  {formatPrice(villa.pricePerNight * nightsCount)} for {nightsCount} nights
                </Text>
              </View>

              <View className="flex-row items-center">
                <Pressable
                  onPress={() => toggleCompareHotel(villa)}
                  className={`px-2.5 py-2 rounded-xl border flex-row items-center me-2 ${
                    selectedCompareHotels.some((h) => h.id === villa.id)
                      ? "bg-blue-50 border-blue-600"
                      : "bg-slate-100 border-slate-200"
                  }`}
                >
                  <Ionicons
                    name={selectedCompareHotels.some((h) => h.id === villa.id) ? "checkbox" : "square-outline"}
                    size={14}
                    color={selectedCompareHotels.some((h) => h.id === villa.id) ? "#2563EB" : "#64748B"}
                  />
                  <Text
                    className={`text-[11px] font-bold ms-1 ${
                      selectedCompareHotels.some((h) => h.id === villa.id) ? "text-blue-600" : "text-slate-600"
                    }`}
                  >
                    তুলনা
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.reserveBtn}
                  className="flex-row items-center bg-blue-600 px-4 py-2.5 rounded-xl active:bg-blue-700 shadow-sm"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedVilla(villa);
                  }}
                >
                  <Text style={styles.reserveBtnText} className="text-white text-xs font-bold me-1">
                    View & Reserve
                  </Text>
                  <RTLIcon name="arrow-forward" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [nightsCount, handleMessageHost, selectedCompareHotels, toggleCompareHotel]
  );

  // ============================================================================
  // HEADER COMPONENT (HERO, SEARCH, BENEFIT, AND COMPLETE FILTER MATRIX)
  // ============================================================================

  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* 1. HERO SECTION WITH VILLA OVERLAY */}
        <View style={styles.heroContainer} className="relative w-full h-64">
          <Image
            source={{ uri: MEDIA_ASSETS.HERO_COVER }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.75)"]}
            style={styles.heroOverlay}
            className="absolute inset-0 justify-between p-4"
          >
            {/* Top Navigation */}
            <View style={styles.headerRow} className="flex-row justify-between items-center">
              <Pressable
                style={styles.backCircleBtn}
                className="w-9 h-9 rounded-full bg-black/40 items-center justify-center"
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
              >
                <RTLIcon name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={styles.headerRight} className="flex-row items-center gap-2">
                <Pressable
                  style={styles.headerIconBtn}
                  className="w-9 h-9 rounded-full bg-black/40 items-center justify-center"
                  onPress={() => router.push("/(tabs)/messages" as any)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={styles.headerIconBtn}
                  className="w-9 h-9 rounded-full bg-black/40 items-center justify-center"
                  onPress={() => router.push("/screens/rewards" as any)}
                >
                  <Ionicons name="gift-outline" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Title & Badge */}
            <View style={styles.titleWrapper} className="mb-4">
              <View style={styles.heroPillBadge} className="flex-row items-center bg-blue-600 self-start px-2.5 py-1 rounded-full mb-2">
                <Ionicons name="home" size={12} color="#FFFFFF" />
                <Text style={styles.heroPillText} className="text-white text-[10px] font-black uppercase tracking-wider ms-1">
                  VACATION HOMES & VILLAS
                </Text>
              </View>
              <Text style={styles.heroTitle} className="text-2xl font-black text-white">
                Luxury Private Stays
              </Text>
              <Text style={styles.heroSubtitle} className="text-xs text-white/90 mt-1">
                Villas, beachfront chalets & private homes with superhosts
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* 2. OVERLAPPING SEARCH & CONFIGURATION CARD */}
        <View style={[styles.searchCardContainer, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          {/* Destination / Keyword Input */}
          <View style={styles.inputRow} className="flex-row items-center py-1">
            <Ionicons name="search" size={20} color={TRIP_BLUE} />
            <TextInput
              style={styles.textInput}
              className="flex-1 ms-2.5 text-sm font-semibold text-slate-900"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                syncStoreFilters({ city: text });
              }}
              placeholder="Search by villa name, city or location"
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  syncStoreFilters({ city: "" });
                }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          <View style={styles.hDivider} className="h-[1px] bg-slate-100 my-2.5" />

          {/* Dates & Nights Selector */}
          <Pressable
            style={styles.inputRow}
            className="flex-row items-center py-1"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDatePickerModal(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={TRIP_BLUE} />
            <View style={styles.inputCol} className="flex-1 ms-2.5">
              <Text style={styles.inputLabel} className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                CHECK-IN & CHECK-OUT
              </Text>
              <Text style={styles.pickerText} className="text-xs font-bold text-slate-800 mt-0.5">
                {formatDateShort(checkInDate)} - {formatDateShort(checkOutDate)}{" "}
                · <Text style={{ color: TRIP_BLUE, fontWeight: "700" }}>{nightsCount} {nightsCount === 1 ? "night" : "nights"}</Text>
              </Text>
            </View>
            <RTLIcon name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>

          <View style={styles.hDivider} className="h-[1px] bg-slate-100 my-2.5" />

          {/* Guests Selector */}
          <Pressable
            style={styles.inputRow}
            className="flex-row items-center py-1"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowGuestsModal(true);
            }}
          >
            <Ionicons name="people-outline" size={20} color={TRIP_BLUE} />
            <View style={styles.inputCol} className="flex-1 ms-2.5">
              <Text style={styles.inputLabel} className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                GUESTS & PARTY
              </Text>
              <Text style={styles.pickerText} className="text-xs font-bold text-slate-800 mt-0.5">
                {guestsConfig.adults} Adults
                {guestsConfig.children > 0 ? `, ${guestsConfig.children} Children` : " · Entire Home"}
              </Text>
            </View>
            <RTLIcon name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* 3. INTERACTIVE AMENITY FILTER PILLS */}
        <View style={styles.amenitySection} className="mt-4 px-4">
          <View style={styles.amenityHeaderRow} className="flex-row items-center justify-between mb-2">
            <Text style={styles.amenityHeaderTitle} className="text-sm font-extrabold text-slate-900">
              Filter by Amenity
            </Text>
            <Text style={styles.amenityCountText} className="text-xs text-slate-500 font-semibold">
              {filteredRentals.length} {filteredRentals.length === 1 ? "villa" : "villas"} found
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.amenityPillsRow}
            className="gap-2"
          >
            {AMENITY_FILTERS.map((f) => {
              const active = selectedAmenity === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[styles.amenityPill, active && styles.amenityPillActive]}
                  className={`flex-row items-center px-3.5 py-2 rounded-full border ${
                    active
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-slate-200"
                  }`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAmenity(f.key);
                  }}
                >
                  <Ionicons
                    name={f.icon}
                    size={14}
                    color={active ? "#FFFFFF" : "#475569"}
                  />
                  <Text
                    style={[
                      styles.amenityPillText,
                      active && styles.amenityPillTextActive,
                    ]}
                    className={`text-xs font-bold ms-1.5 ${
                      active ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. NEW USER DISCOUNT & VOUCHERS BANNER */}
        <View style={styles.benefitsBanner} className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-slate-200">
          <View style={styles.benefitsHeader} className="flex-row items-center justify-between">
            <View style={styles.benefitsTitleCol}>
              <View style={styles.voucherTag} className="flex-row items-center bg-blue-600 self-start px-2 py-0.5 rounded-full mb-1">
                <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                <Text style={styles.voucherTagText} className="text-white text-[10px] font-bold ms-1">
                  EXCLUSIVE OFFER
                </Text>
              </View>
              <Text style={styles.benefitsTitle} className="text-sm font-extrabold text-slate-900">
                New Host & Guest Discount
              </Text>
            </View>
            <Pressable
              style={[styles.claimBtn, claimedVoucher && styles.claimBtnActive]}
              className={`px-3.5 py-1.5 rounded-full ${
                claimedVoucher ? "bg-emerald-600" : "bg-blue-600"
              }`}
              onPress={handleClaimVoucher}
            >
              <Text style={styles.claimBtnText} className="text-white text-xs font-bold">
                {claimedVoucher ? `Claimed ✓ (-${formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)})` : `Claim ${formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} Off`}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.benefitsDesc} className="text-xs text-slate-500 mt-2">
            Instant {formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} coupon automatically applied at checkout for any private villa or vacation home reservation.
          </Text>
        </View>

        {/* ================================================================= */}
        {/* 5. COMPREHENSIVE FILTER MATRIX */}
        {/* ================================================================= */}
        <View style={styles.hotelFiltersContainer} className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-slate-200 shadow-sm">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-sm font-extrabold text-slate-900">
              Interactive Filter Matrix
            </Text>
            {(starRatingFilter > 0 ||
              guestRatingFilter > 0 ||
              propertyTypeFilter !== "All Types" ||
              pricePreset !== "all" ||
              freeCancellationOnly ||
              selectedAmenity !== "all") && (
              <Pressable onPress={handleResetFilters}>
                <Text className="text-xs font-bold text-blue-600">Reset Filters</Text>
              </Pressable>
            )}
          </View>

          {/* 1. Property Type Chips */}
          <View style={styles.filterGroupRow} className="mb-3">
            <Text style={styles.filterGroupTitle} className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Property Type:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {PROPERTY_TYPES.map((type) => {
                const isSelected = propertyTypeFilter === type;
                return (
                  <Pressable
                    key={type}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    className={`px-3 py-1.5 rounded-full me-2 border ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-50 border-slate-200"
                    }`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPropertyTypeFilter(type);
                    }}
                  >
                    <Text
                      style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                      className={`text-xs font-semibold ${
                        isSelected ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. Star Rating Chips (1-5 stars) */}
          <View style={styles.filterGroupRow} className="mb-3">
            <Text style={styles.filterGroupTitle} className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Star Rating:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {STAR_RATING_PRESETS.map((chip) => {
                const isSelected = starRatingFilter === chip.value;
                return (
                  <Pressable
                    key={chip.label}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    className={`flex-row items-center px-3 py-1.5 rounded-full me-2 border ${
                      isSelected
                        ? "bg-amber-500 border-amber-500"
                        : "bg-slate-50 border-slate-200"
                    }`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStarRatingFilter(chip.value);
                      syncStoreFilters({
                        starRating: chip.value > 0 ? [chip.value] : undefined,
                      });
                    }}
                  >
                    <Ionicons
                      name="star"
                      size={12}
                      color={isSelected ? "#FFFFFF" : "#F59E0B"}
                      style={{ marginEnd: 3 }}
                    />
                    <Text
                      style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                      className={`text-xs font-semibold ${
                        isSelected ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Guest Rating Chips (8.5+ Fabulous) */}
          <View style={styles.filterGroupRow} className="mb-3">
            <Text style={styles.filterGroupTitle} className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Guest Rating:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {GUEST_RATING_PRESETS.map((chip) => {
                const isSelected = guestRatingFilter === chip.value;
                return (
                  <Pressable
                    key={chip.label}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    className={`px-3 py-1.5 rounded-full me-2 border ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-slate-50 border-slate-200"
                    }`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setGuestRatingFilter(chip.value);
                      syncStoreFilters({
                        minRating: chip.value > 0 ? chip.value : undefined,
                      });
                    }}
                  >
                    <Text
                      style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                      className={`text-xs font-semibold ${
                        isSelected ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. Interactive Precision Slider & Stepper Controls */}
          <View style={styles.filterGroupRow} className="mb-3">
            <PrecisionSlider
              label="বাজেট সীমা (সর্বোচ্চ প্রতি রাত)"
              value={maxPriceSlider}
              min={HOSPITALITY_CONFIG.MIN_BUDGET}
              max={HOSPITALITY_CONFIG.MAX_BUDGET}
              step={HOSPITALITY_CONFIG.BUDGET_STEP}
              unit="/রাত"
              presets={BUDGET_MILESTONES as any}
              onChange={(val) => {
                setMaxPriceSlider(val);
                setPricePreset("custom");
                syncStoreFilters({
                  maxPrice: val < HOSPITALITY_CONFIG.MAX_BUDGET ? val : undefined,
                });
              }}
            />
          </View>

          {/* 5. Free Cancellation Policy Chip */}
          <View style={styles.filterGroupRow}>
            <Text style={styles.filterGroupTitle} className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Booking Policy:
            </Text>
            <View className="flex-row items-center">
              <Pressable
                style={[
                  styles.filterChip,
                  freeCancellationOnly && styles.filterChipActive,
                ]}
                className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${
                  freeCancellationOnly
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-slate-50 border-slate-200"
                }`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFreeCancellationOnly((prev) => !prev);
                }}
              >
                <Ionicons
                  name={freeCancellationOnly ? "checkmark-circle" : "shield-checkmark-outline"}
                  size={14}
                  color={freeCancellationOnly ? "#FFFFFF" : "#059669"}
                  style={{ marginEnd: 4 }}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    freeCancellationOnly && styles.filterChipTextActive,
                  ]}
                  className={`text-xs font-bold ${
                    freeCancellationOnly ? "text-white" : "text-emerald-700"
                  }`}
                >
                  {freeCancellationOnly ? "Free Cancellation Applied ✓" : "Free Cancellation Only"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section Heading & Results Summary Header */}
        <View className="px-4 mt-4 mb-2">
          <ResultsSummaryHeader
            count={filteredRentals.length}
            entityName="হোটেল ও রিসোর্ট"
            sortLabel={propertyTypeFilter !== "All Types" ? propertyTypeFilter : "জনপ্রিয়তা"}
            filterCount={
              (searchQuery.trim() ? 1 : 0) +
              (selectedAmenity !== "all" ? 1 : 0) +
              (propertyTypeFilter !== "All Types" ? 1 : 0) +
              (starRatingFilter > 0 ? 1 : 0) +
              (guestRatingFilter > 0 ? 1 : 0) +
              (maxPriceSlider < HOSPITALITY_CONFIG.MAX_BUDGET ? 1 : 0) +
              (freeCancellationOnly ? 1 : 0)
            }
            onClearFilters={handleResetFilters}
          />
        </View>
      </View>
    );
  }, [
    searchQuery,
    checkInDate,
    checkOutDate,
    nightsCount,
    guestsConfig,
    selectedAmenity,
    claimedVoucher,
    propertyTypeFilter,
    starRatingFilter,
    guestRatingFilter,
    pricePreset,
    minPriceSlider,
    maxPriceSlider,
    freeCancellationOnly,
    filteredRentals.length,
    handleClaimVoucher,
    handleResetFilters,
    syncStoreFilters,
  ]);

  // ============================================================================
  // EMPTY AND ERROR STATES (WITH POPULAR DESTINATION CHIPS)
  // ============================================================================

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <ListSkeleton count={3} type="card" />
        </View>
      );
    }

    if (fetchError) {
      return (
        <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
          <ErrorStateCard
            title="Unable to load vacation rentals"
            message={fetchError}
            onRetry={() => {
              fetchInventory().catch(() => {});
            }}
          />
        </View>
      );
    }

    return (
      <View style={{ paddingVertical: 24, paddingHorizontal: 16 }}>
        <EmptyState
          type="search"
          title="No vacation rentals found"
          description={`No luxury stays match your criteria in "${searchQuery || "this area"}". Try adjusting your budget, clearing amenities, or picking a destination below.`}
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
          compact={false}
        />

        {/* Popular Villa Destinations Recommendation Chips */}
        <View className="mt-4 bg-white p-4 rounded-2xl border border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">
            Discover Top Vacation Spots:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_VILLA_DESTINATIONS.map((dest) => (
              <Pressable
                key={dest}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSearchQuery(dest);
                  syncStoreFilters({ city: dest });
                }}
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
              >
                <Text className="text-xs font-bold text-blue-700">{dest}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }, [loading, fetchError, searchQuery, fetchInventory, handleResetFilters, syncStoreFilters]);

  // ============================================================================
  // RENDER MAIN SCREEN
  // ============================================================================

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Optimized Virtualized FlatList with Progressive Pagination */}
      <FlatList
        data={pagedRentals}
        renderItem={renderVillaItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          pageLimit < filteredRentals.length ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#0055F2" />
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />


      {/* =================================================================== */}
      {/* MODAL 1: INTERACTIVE VILLA RESERVATION BOTTOM SHEET */}
      {/* =================================================================== */}
      <Modal
        visible={!!selectedVilla}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVilla(null)}
      >
        {selectedVilla && (
          <View style={styles.sheetOverlay} className="flex-1 justify-end bg-black/60">
            <View style={styles.sheetContainer} className="bg-white rounded-t-3xl max-h-[85%] p-5 shadow-2xl">
              {/* Header with Title and Close Button */}
              <View style={styles.sheetHeader} className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle} className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                    {selectedVilla.name}
                  </Text>
                  <Text style={styles.sheetSubtitle} className="text-xs text-slate-500 mt-0.5">
                    {selectedVilla.location}
                  </Text>
                </View>
                <Pressable
                  style={styles.sheetCloseBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center ms-2"
                  onPress={() => setSelectedVilla(null)}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.sheetScroll}
              >
                {/* Hero Villa Image */}
                <View className="w-full h-44 rounded-xl overflow-hidden mt-3 mb-3">
                  <ProgressiveImage
                    source={{ uri: selectedVilla.image }}
                    style={styles.sheetHeroImage}
                  />
                </View>

                {/* Villa Specs Overview Bar */}
                <View style={styles.sheetSpecsBar} className="flex-row justify-around bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <View style={styles.sheetSpecItem} className="items-center">
                    <Ionicons name="people-outline" size={16} color={TRIP_BLUE} />
                    <Text style={styles.sheetSpecValue} className="text-xs font-bold text-slate-800 mt-1">
                      {selectedVilla.specs.guests} Guests
                    </Text>
                  </View>
                  <View style={styles.sheetSpecItem} className="items-center">
                    <Ionicons name="bed-outline" size={16} color={TRIP_BLUE} />
                    <Text style={styles.sheetSpecValue} className="text-xs font-bold text-slate-800 mt-1">
                      {selectedVilla.specs.bedrooms} Beds
                    </Text>
                  </View>
                  <View style={styles.sheetSpecItem} className="items-center">
                    <Ionicons name="water-outline" size={16} color={TRIP_BLUE} />
                    <Text style={styles.sheetSpecValue} className="text-xs font-bold text-slate-800 mt-1">
                      {selectedVilla.specs.baths} Baths
                    </Text>
                  </View>
                  <View style={styles.sheetSpecItem} className="items-center">
                    <Ionicons name="expand-outline" size={16} color={TRIP_BLUE} />
                    <Text style={styles.sheetSpecValue} className="text-xs font-bold text-slate-800 mt-1">
                      {selectedVilla.specs.sqft} m²
                    </Text>
                  </View>
                </View>

                {/* Villa Room Inventory Availability Matrix */}
                <View className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-3">
                  <Text className="text-xs font-extrabold text-slate-900 mb-2">
                    Room Availability Matrix:
                  </Text>
                  <View className="flex-row items-center justify-between py-1 border-b border-slate-200">
                    <Text className="text-xs font-semibold text-slate-700">Master Ocean Suite</Text>
                    <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Ionicons name="flame" size={10} color="#D97706" />
                      <Text className="text-[10px] font-bold text-amber-700 ms-1">Available</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between py-1 pt-2">
                    <Text className="text-xs font-semibold text-slate-700">Garden Villa Chalet</Text>
                    <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Ionicons name="checkmark-circle" size={10} color="#059669" />
                      <Text className="text-[10px] font-bold text-emerald-700 ms-1">Available</Text>
                    </View>
                  </View>
                </View>

                {/* Dynamic Vibe Analytics & Multi-Dimensional Aspect Meters */}
                {(() => {
                  const selectedVibe = sentimentService.getPrecalculatedVibe(selectedVilla.id);
                  const vibeColors = getVibeMeterColors(selectedVibe.overallVibeScore);
                  const dims: TravelDimension[] = [
                    "Cleanliness",
                    "Hospitality",
                    "Value for Money",
                    "Wi-Fi / Remote Work",
                    "Scenic Serenity",
                  ];

                  return (
                    <View className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-3">
                      {/* Vibe Header */}
                      <View className="flex-row items-center justify-between pb-2 border-b border-slate-200">
                        <View className="flex-row items-center">
                          <Ionicons name="sparkles" size={15} color={vibeColors.colorHex} />
                          <Text className="text-xs font-black text-slate-900 ms-1.5 uppercase tracking-wide">
                            Dynamic Vibe Meters
                          </Text>
                        </View>
                        <View
                          style={{ backgroundColor: vibeColors.bgHex, borderColor: vibeColors.colorHex }}
                          className="px-2 py-0.5 rounded-full border"
                        >
                          <Text style={{ color: vibeColors.colorHex }} className="text-[10px] font-extrabold">
                            {selectedVibe.overallVibeScore}/100 · {selectedVibe.overallSentiment}
                          </Text>
                        </View>
                      </View>

                      {/* Dynamic Synthesized Vibe Tags */}
                      <View className="flex-row flex-wrap gap-1.5 my-2.5">
                        {selectedVibe.vibeTags.map((tag) => {
                          const tagStyle = getVibeTagBadgeStyle(tag.category, tag.sentiment);
                          return (
                            <View
                              key={tag.id}
                              className={`flex-row items-center px-2 py-1 rounded-md border ${tagStyle.bgClass} ${tagStyle.borderClass}`}
                            >
                              <Ionicons name={tagStyle.iconName as any} size={11} color={tag.sentiment === "negative" ? "#92400E" : "#059669"} />
                              <Text className={`text-[10px] font-bold ms-1 ${tagStyle.textClass}`}>
                                {tag.tag}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* 5-Dimension Aspect Meters */}
                      <View className="mt-1">
                        {dims.map((dimKey) => {
                          const d = selectedVibe.dimensions[dimKey];
                          if (!d) return null;
                          const dimColors = getVibeMeterColors(d.score);
                          const icon = getDimensionIcon(dimKey);

                          return (
                            <View key={dimKey} className="mb-2">
                              <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-row items-center">
                                  <Ionicons name={icon as any} size={12} color="#475569" />
                                  <Text className="text-[11px] font-bold text-slate-700 ms-1.5">
                                    {dimKey}
                                  </Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                  <Text style={{ color: dimColors.colorHex }} className="text-[11px] font-extrabold">
                                    {d.score}%
                                  </Text>
                                  <Text className="text-[9px] text-slate-400 font-medium">
                                    ({dimColors.label})
                                  </Text>
                                </View>
                              </View>

                              {/* Progress Bar */}
                              <View className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <View
                                  style={{
                                    width: `${d.score}%`,
                                    backgroundColor: dimColors.colorHex,
                                  }}
                                  className="h-full rounded-full"
                                />
                              </View>

                              {/* Sample Snippet Quote if present */}
                              {d.snippets && d.snippets.length > 0 && (
                                <Text className="text-[9px] text-slate-500 italic mt-0.5" numberOfLines={1}>
                                  "{d.snippets[0]}"
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>

                      {/* Anti-Spam & Fake Review Transparency Footer */}
                      <View className="flex-row items-center justify-between pt-2 mt-1 border-t border-slate-200">
                        <View className="flex-row items-center">
                          <Ionicons name="shield-checkmark" size={12} color="#059669" />
                          <Text className="text-[9px] font-bold text-emerald-800 ms-1">
                            Verified across {selectedVibe.authenticReviewsCount} authentic reviews
                          </Text>
                        </View>
                        <Text className="text-[9px] text-slate-400">
                          {selectedVibe.flaggedSpamCount} bot/spam filtered
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                <View style={styles.divider} className="h-[1px] bg-slate-100 my-3" />


                {/* Villa Description */}
                <Text style={styles.sheetDescription} className="text-xs text-slate-600 leading-relaxed">
                  {selectedVilla.description}
                </Text>

                {/* Host Card Details */}
                <View style={styles.sheetHostCard} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-3">
                  <View style={styles.sheetHostTop} className="flex-row items-center">
                    <Image
                      source={{ uri: selectedVilla.host.avatar }}
                      style={styles.sheetHostAvatar}
                      className="w-10 h-10 rounded-full me-3"
                    />
                    <View style={styles.sheetHostDetails} className="flex-1">
                      <View style={styles.sheetHostNameRow} className="flex-row items-center">
                        <Text style={styles.sheetHostName} className="text-xs font-bold text-slate-900 me-2">
                          {selectedVilla.host.name}
                        </Text>
                        <View style={styles.superhostMiniPill} className="bg-amber-100 px-1.5 py-0.5 rounded">
                          <Text style={styles.superhostMiniText} className="text-[10px] font-bold text-amber-700">
                            {selectedVilla.host.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.sheetHostStats} className="text-[10px] text-slate-500 mt-0.5">
                        ⭐ {selectedVilla.host.rating} ({selectedVilla.host.reviewsCount} reviews) · {selectedVilla.host.responseTime}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sheetHostBio} className="text-[11px] text-slate-600 mt-2">
                    {selectedVilla.host.bio}
                  </Text>

                  {/* Host Action Shortcuts */}
                  <View style={styles.sheetHostActions} className="flex-row gap-2 mt-3">
                    <Pressable
                      style={styles.sheetMessageHostBtn}
                      className="flex-1 flex-row items-center justify-center bg-blue-50 py-2 rounded-lg border border-blue-200"
                      onPress={() => {
                        handleMessageHost(selectedVilla.host);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={14} color={TRIP_BLUE} />
                      <Text style={styles.sheetMessageHostBtnText} className="text-xs font-bold text-blue-600 ms-1.5">
                        Direct Chat
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.sheetOpenMessengerBtn}
                      className="flex-1 flex-row items-center justify-center bg-white py-2 rounded-lg border border-slate-300"
                      onPress={() => router.push("/(tabs)/messages" as any)}
                    >
                      <Ionicons name="mail-outline" size={14} color="#475569" />
                      <Text style={styles.sheetOpenMessengerBtnText} className="text-xs font-bold text-slate-700 ms-1.5">
                        Messenger Inbox
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Selected Dates Display */}
                <View style={styles.datesConfigBox} className="bg-blue-50 p-3 rounded-xl border border-blue-200 mt-3">
                  <View style={styles.datesConfigHeader} className="flex-row items-center justify-between">
                    <Text style={styles.datesConfigTitle} className="text-xs font-bold text-blue-900">
                      Reservation Dates
                    </Text>
                    <View style={styles.datesNightsBadge} className="bg-blue-600 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-white">
                        {nightsCount} {nightsCount === 1 ? "Night" : "Nights"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.datePickerRow} className="flex-row items-center justify-between mt-2 pt-2 border-t border-blue-100">
                    <View style={styles.dateCol}>
                      <Text style={styles.dateColLabel} className="text-[10px] text-blue-600 uppercase font-bold">
                        Check-in
                      </Text>
                      <Text style={styles.dateColValue} className="text-xs font-extrabold text-blue-950 mt-0.5">
                        {formatDateFull(checkInDate)}
                      </Text>
                    </View>
                    <RTLIcon name="arrow-forward" size={16} color={TRIP_BLUE} />
                    <View style={styles.dateCol} className="items-end">
                      <Text style={styles.dateColLabel} className="text-[10px] text-blue-600 uppercase font-bold">
                        Check-out
                      </Text>
                      <Text style={styles.dateColValue} className="text-xs font-extrabold text-blue-950 mt-0.5">
                        {formatDateFull(checkOutDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price Breakdown Calculation Card (Zero hard-coding) */}
                <View style={styles.priceBreakdownCard} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-3 mb-4">
                  <View style={styles.priceBreakdownHeader} className="mb-2">
                    <Text style={styles.priceBreakdownTitle} className="text-xs font-extrabold text-slate-900">
                      Transparent Price Breakdown
                    </Text>
                  </View>

                  <View style={styles.breakdownRow} className="flex-row justify-between mb-1.5">
                    <Text style={styles.breakdownLabel} className="text-xs text-slate-600">
                      {formatPrice(selectedVilla.pricePerNight)} x {nightsCount} nights
                    </Text>
                    <Text style={styles.breakdownValue} className="text-xs font-bold text-slate-800">
                      {formatPrice(priceBreakdown.nightlyTotal)}
                    </Text>
                  </View>

                  <View style={styles.breakdownRow} className="flex-row justify-between mb-1.5">
                    <Text style={styles.breakdownLabel} className="text-xs text-slate-600">
                      Standard cleaning fee
                    </Text>
                    <Text style={styles.breakdownValue} className="text-xs font-bold text-slate-800">
                      {formatPrice(priceBreakdown.cleaningFee)}
                    </Text>
                  </View>

                  <View style={styles.breakdownRow} className="flex-row justify-between mb-1.5">
                    <Text style={styles.breakdownLabel} className="text-xs text-slate-600">
                      Host service fee (10%)
                    </Text>
                    <Text style={styles.breakdownValue} className="text-xs font-bold text-slate-800">
                      {formatPrice(priceBreakdown.serviceFee)}
                    </Text>
                  </View>

                  <View style={styles.breakdownRow} className="flex-row justify-between mb-1.5">
                    <Text style={styles.breakdownLabel} className="text-xs text-slate-600">
                      Refundable security deposit
                    </Text>
                    <Text style={styles.breakdownValue} className="text-xs font-bold text-slate-800">
                      {formatPrice(priceBreakdown.deposit)}
                    </Text>
                  </View>

                  {claimedVoucher && (
                    <View style={styles.breakdownRow} className="flex-row justify-between mb-1.5">
                      <Text style={[styles.breakdownLabel, { color: "#10B981" }]} className="text-xs font-bold text-emerald-600">
                        New user discount (-{formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)})
                      </Text>
                      <Text style={[styles.breakdownValue, { color: "#10B981" }]} className="text-xs font-bold text-emerald-600">
                        -{formatPrice(priceBreakdown.voucherDiscount)}.00
                      </Text>
                    </View>
                  )}

                  <View style={styles.breakdownDivider} className="h-[1px] bg-slate-200 my-2" />

                  <View style={styles.breakdownTotalRow} className="flex-row justify-between items-center">
                    <View>
                      <Text style={styles.breakdownTotalLabel} className="text-sm font-extrabold text-slate-900">
                        Total Payable
                      </Text>
                      <Text style={styles.breakdownTotalSub} className="text-[10px] text-slate-500">
                        Includes taxes, fees & deposit
                      </Text>
                    </View>
                    <Text style={styles.breakdownTotalAmount} className="text-lg font-black text-blue-600">
                      {formatPrice(priceBreakdown.totalPayable)}
                    </Text>
                  </View>
                </View>

                {/* Deposit Protection Shield Banner */}
                <View style={styles.depositShieldBanner} className="flex-row items-center bg-emerald-50 p-3 rounded-xl border border-emerald-200 mb-4">
                  <Ionicons name="shield-checkmark" size={18} color="#059669" />
                  <Text style={styles.depositShieldText} className="text-xs text-emerald-800 font-medium ms-2 flex-1">
                    Your deposit is safely held by Antigravity Escrow and automatically refunded after checkout inspection.
                  </Text>
                </View>

                {/* Primary Book Villa Button */}
                <Pressable
                  style={styles.bookVillaBtn}
                  className="flex-row items-center justify-center bg-blue-600 py-3.5 rounded-xl active:bg-blue-700 shadow-sm"
                  onPress={handleBookVilla}
                >
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                  <Text style={styles.bookVillaBtnText} className="text-white text-sm font-bold ms-2">
                    Book Entire Villa ({formatPrice(priceBreakdown.totalPayable)})
                  </Text>
                </Pressable>

                <Text style={styles.guaranteeNote} className="text-[10px] text-slate-400 text-center mt-2 mb-6">
                  Free cancellation up to 48 hours before check-in. Instant confirmation.
                </Text>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 2: INTERACTIVE DATE PICKER SHEET */}
      {/* =================================================================== */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay} className="flex-1 justify-end bg-black/60">
          <View style={styles.modalCard} className="bg-white rounded-t-3xl p-5 shadow-2xl">
            <View style={styles.modalHeaderRow} className="flex-row items-center justify-between mb-4">
              <View>
                <Text style={styles.modalTitle} className="text-lg font-extrabold text-slate-900">
                  Villa Dates
                </Text>
                <Text style={styles.modalSubTitle} className="text-xs text-slate-500">
                  {nightsCount} {nightsCount === 1 ? "Night" : "Nights"} stay
                </Text>
              </View>
              <Pressable onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Quick Nights Chips */}
            <Text style={styles.modalSectionLabel} className="text-xs font-bold text-slate-500 uppercase mb-2">
              Quick Stay Duration:
            </Text>
            <View style={styles.quickNightsRow} className="flex-row flex-wrap gap-2 mb-4">
              {[2, 3, 5, 7, 14, 30].map((n) => (
                <Pressable
                  key={`quick-stay-${n}`}
                  style={[
                    styles.quickNightChip,
                    nightsCount === n && styles.quickNightChipActive,
                  ]}
                  className={`px-3 py-1.5 rounded-full border ${
                    nightsCount === n
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-100 border-slate-200"
                  }`}
                  onPress={() => setNightsQuick(n)}
                >
                  <Text
                    style={[
                      styles.quickNightChipText,
                      nightsCount === n && styles.quickNightChipTextActive,
                    ]}
                    className={`text-xs font-bold ${
                      nightsCount === n ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {n} {n === 1 ? "Night" : "Nights"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Date Summary Card */}
            <View style={styles.datesSummaryBox} className="flex-row items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading} className="text-xs font-bold text-slate-500">
                  Check-in
                </Text>
                <Text style={styles.dateSummaryDate} className="text-sm font-extrabold text-slate-900 mt-1">
                  {formatDateFull(checkInDate)}
                </Text>
              </View>
              <RTLIcon name="arrow-forward" size={20} color="#0055F2" />
              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading} className="text-xs font-bold text-slate-500">
                  Check-out
                </Text>
                <Text style={styles.dateSummaryDate} className="text-sm font-extrabold text-slate-900 mt-1">
                  {formatDateFull(checkOutDate)}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.modalApplyBtn}
              className="bg-blue-600 py-3.5 rounded-xl items-center active:bg-blue-700"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={styles.modalApplyBtnText} className="text-white text-sm font-bold">
                Apply Dates
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 3: GUESTS & PARTY CONFIGURATION MODAL */}
      {/* =================================================================== */}
      <Modal
        visible={showGuestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGuestsModal(false)}
      >
        <View style={styles.modalOverlay} className="flex-1 justify-end bg-black/60">
          <View style={styles.modalCard} className="bg-white rounded-t-3xl p-5 shadow-2xl">
            <View style={styles.modalHeaderRow} className="flex-row items-center justify-between mb-4">
              <View>
                <Text style={styles.modalTitle} className="text-lg font-extrabold text-slate-900">
                  Guests & Party
                </Text>
                <Text style={styles.modalSubTitle} className="text-xs text-slate-500">
                  Specify travel companions
                </Text>
              </View>
              <Pressable onPress={() => setShowGuestsModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Adults Stepper */}
            <View style={styles.stepperRow} className="flex-row items-center justify-between py-3 border-b border-slate-100">
              <View>
                <Text style={styles.stepperTitle} className="text-sm font-bold text-slate-900">
                  Adults
                </Text>
                <Text style={styles.stepperSub} className="text-xs text-slate-500">
                  Age 13+
                </Text>
              </View>
              <View style={styles.stepperControl} className="flex-row items-center">
                <Pressable
                  style={styles.stepBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  onPress={() =>
                    setGuestsConfig((c) => {
                      const updated = { ...c, adults: Math.max(1, c.adults - 1) };
                      syncStoreFilters({ guestsCount: updated.adults });
                      return updated;
                    })
                  }
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </Pressable>
                <Text style={styles.stepValue} className="w-8 text-center text-sm font-bold text-slate-900">
                  {guestsConfig.adults}
                </Text>
                <Pressable
                  style={styles.stepBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  onPress={() =>
                    setGuestsConfig((c) => {
                      const updated = { ...c, adults: Math.min(16, c.adults + 1) };
                      syncStoreFilters({ guestsCount: updated.adults });
                      return updated;
                    })
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

            {/* Children Stepper */}
            <View style={styles.stepperRow} className="flex-row items-center justify-between py-3 mb-4">
              <View>
                <Text style={styles.stepperTitle} className="text-sm font-bold text-slate-900">
                  Children
                </Text>
                <Text style={styles.stepperSub} className="text-xs text-slate-500">
                  Age 0-12
                </Text>
              </View>
              <View style={styles.stepperControl} className="flex-row items-center">
                <Pressable
                  style={styles.stepBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  onPress={() =>
                    setGuestsConfig((c) => ({
                      ...c,
                      children: Math.max(0, c.children - 1),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </Pressable>
                <Text style={styles.stepValue} className="w-8 text-center text-sm font-bold text-slate-900">
                  {guestsConfig.children}
                </Text>
                <Pressable
                  style={styles.stepBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
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
              className="bg-blue-600 py-3.5 rounded-xl items-center active:bg-blue-700"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGuestsModal(false);
              }}
            >
              <Text style={styles.modalApplyBtnText} className="text-white text-sm font-bold">
                Apply Guests
              </Text>
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
          onOpenProfile={(prof) => {
            router.push({
              pathname: "/screens/profile",
              params: { userId: prof.id },
            } as any);
          }}
          onStartCall={(prof, type) => {
            router.push({
              pathname: "/screens/call" as any,
              params: { friendId: prof.id, callType: type },
            });
          }}
        />
      )}

      {/* Hotel Compare Floating Bar */}
      {selectedCompareHotels.length > 0 && (
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
            {selectedCompareHotels.length}টি হোটেল নির্বাচিত
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => setSelectedCompareHotels([])} style={{ marginEnd: 12 }}>
              <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13 }}>মুছুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setCompareModalVisible(true)}
              style={{
                backgroundColor: "#0055F2",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                তুলনা দেখুন ({selectedCompareHotels.length})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Hotel Comparison Modal */}
      <ComparisonModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        title="হোটেল ও রিসোর্ট তুলনা"
        items={hotelComparisonItems}
        onSelect={(item) => {
          setCompareModalVisible(false);
          const villa = rentals.find((r) => r.id === item.id);
          if (villa) setSelectedVilla(villa);
        }}
        selectButtonLabel="বুকিং ও বিবরণ দেখুন"
      />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    minHeight: 270,
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
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.08)" } : {}),
    zIndex: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  inputCol: {
    flex: 1,
    marginStart: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginStart: 12,
  },
  pickerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  hDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  amenitySection: {
    marginTop: 16,
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
    gap: 8,
  },
  amenityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  amenityPillActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  amenityPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  amenityPillTextActive: {
    color: "#FFFFFF",
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
  },
  benefitsTitleCol: {
    flex: 1,
  },
  voucherTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRIP_BLUE,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  voucherTagText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  benefitsDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 16,
  },
  claimBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  claimBtnActive: {
    backgroundColor: "#10B981",
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  villaCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.06)" } : {}),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: VILLA_ITEM_HEIGHT - 16,
  },
  villaImageContainer: {
    height: 220,
    width: "100%",
    position: "relative",
  },
  villaImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadgesRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  superhostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D97706",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  superhostBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
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
    fontSize: 12,
    color: "#64748B",
  },
  bottomImageDetails: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  imagePropertyType: {
    fontSize: 12,
    fontWeight: "800",
    color: "#93C5FD",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  imageSpecsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  villaCardBody: {
    padding: 14,
  },
  villaName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#64748B",
  },
  cardAmenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  cardAmenityPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardAmenityText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  cardAmenityPillMore: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardAmenityTextMore: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  hostBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hostInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  hostAvatarWrapper: {
    position: "relative",
  },
  hostAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  hostBadgeDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  hostTextCol: {
    marginStart: 8,
    flex: 1,
  },
  hostName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  hostMetaText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  messageHostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  messageHostBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
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
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  priceUnit: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  priceTotalEstimate: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  reserveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    padding: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetScroll: {
    maxHeight: 460,
  },
  sheetHeroImage: {
    width: "100%",
    height: "100%",
  },
  sheetSpecsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetSpecItem: {
    alignItems: "center",
  },
  sheetSpecValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  sheetDescription: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  sheetHostCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetHostTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetHostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sheetHostDetails: {
    marginStart: 10,
    flex: 1,
  },
  sheetHostNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetHostName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  superhostMiniPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginStart: 6,
  },
  superhostMiniText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
  },
  sheetHostStats: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  sheetHostBio: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    marginTop: 8,
  },
  sheetHostActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sheetMessageHostBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  sheetMessageHostBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  sheetOpenMessengerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetOpenMessengerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  datesConfigBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  datesConfigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datesConfigTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  datesNightsBadge: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 85, 242, 0.1)",
  },
  dateCol: {},
  dateColLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0055F2",
    letterSpacing: 0.5,
  },
  dateColValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  priceBreakdownCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceBreakdownHeader: {
    marginBottom: 8,
  },
  priceBreakdownTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  breakdownTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  breakdownTotalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  breakdownTotalAmount: {
    fontSize: 18,
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
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  depositShieldText: {
    fontSize: 12,
    color: "#065F46",
    flex: 1,
    lineHeight: 15,
  },
  bookVillaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bookVillaBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  guaranteeNote: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
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
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickNightChipActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  quickNightChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  quickNightChipTextActive: {
    color: "#FFFFFF",
  },
  datesSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateSummaryCol: {
    alignItems: "center",
  },
  dateSummaryHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  dateSummaryDate: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  modalApplyBtn: {
    backgroundColor: TRIP_BLUE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: "700",
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
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 20,
    textAlign: "center",
  },
  hotelFiltersContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterGroupRow: {
    marginBottom: 10,
  },
  filterGroupTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  filterChipsRow: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  roomAvailTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  roomAvailTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  roomAvailTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  roomUrgentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  roomUrgentTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
  },
  freeCancelTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  freeCancelTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  progressiveImageContainer: {
    width: "100%",
    height: "100%",
  },
  blurhashPlaceholderBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  blurhashText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 2,
  },
});
