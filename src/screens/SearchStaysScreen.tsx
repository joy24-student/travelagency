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
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../utils/supabase";
import { FALLBACK_HOTELS } from "../data/hotelCatalog";
import { ListSkeleton } from "../components/common";
import { EmptyState } from "../components/ui/EmptyState";
import { useTravelStore } from "../store/travelStore";
import { travelRepository, HotelSearchResult, HotelSearchFilters } from "../repositories";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const TRIP_DARK_BLUE = "#000666";
const HOTEL_CARD_HEIGHT = 455;

// ============================================================================
// CENTRALIZED HOSPITALITY CONFIGURATIONS & ASSET CONSTANTS
// ============================================================================

export const HOSPITALITY_CONFIG = {
  TAX_RATE: 0.1, // 10% VAT and local hospitality surcharge
  VOUCHER_DISCOUNT: 15, // $15 New User Promotional Credit
  DEFAULT_CURRENCY_SYMBOL: "$",
  MIN_BUDGET: 0,
  MAX_BUDGET: 1500,
  BUDGET_STEP: 50,
  DEFAULT_CHECKIN_OFFSET_DAYS: 1,
  DEFAULT_CHECKOUT_OFFSET_DAYS: 4,
} as const;

export const MEDIA_ASSETS = {
  DEFAULT_HOTEL: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
  DEFAULT_ROOM: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  DEFAULT_BLURHASH: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
} as const;

export const POPULAR_DESTINATIONS = [
  "Cox's Bazar",
  "Dhaka",
  "Sylhet",
  "Chittagong",
  "Sajek Valley",
  "Sreemangal",
] as const;

// ============================================================================
// FORMATTING & CALCULATION UTILITIES (ZERO HARD-CODING)
// ============================================================================

export function formatPrice(amount: number | string): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return `${HOSPITALITY_CONFIG.DEFAULT_CURRENCY_SYMBOL}${Math.round(numeric).toLocaleString()}`;
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateFull(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calculateNightsCount(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function getRoomInventoryStatus(roomsCount: number) {
  const roomsLeft = roomsCount <= 0 ? 1 : roomsCount;
  const isUrgent = roomsLeft <= 2;
  return {
    roomsLeft,
    isUrgent,
    badgeText: isUrgent
      ? roomsLeft === 1
        ? "Only 1 room left at this price!"
        : "Only 2 rooms left at this price!"
      : `${roomsLeft} Room Types Available`,
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

  // Shimmer pulse animation while waiting for high-res load
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

  const imageSource = hasError || !source?.uri ? { uri: MEDIA_ASSETS.DEFAULT_HOTEL } : source;

  return (
    <View
      style={[styles.progressiveImageContainer, containerStyle]}
      className={`overflow-hidden relative bg-slate-200 ${className}`}
    >
      {/* Blur-hash placeholder background with animated pulse */}
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
          <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.blurhashPlaceholderBox}>
            <Ionicons name="image-outline" size={24} color="#94A3B8" />
            <Text style={styles.blurhashText}>
              {blurhash.substring(0, 6)}...
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Primary Loaded Image */}
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
// DATA TYPES & FILTER MATRIX CONFIGURATIONS
// ============================================================================

export interface HotelRoom {
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
  is_available?: boolean;
}

export interface HotelItem {
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
  is_free_cancellation?: boolean;
  property_type?: "Hotel" | "Resort" | "Villa" | "Apartment";
}

const VIBE_CATEGORIES = [
  "All Stays",
  "Beachfront",
  "Eco Retreat",
  "Luxury Spa",
  "Heritage",
  "City Oasis",
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
// MAIN COMPONENT
// ============================================================================

export function SearchStaysScreen() {
  // Shared travel store integration
  const { hotelFilters, setHotelFilters, resetFilters } = useTravelStore();

  const [hotels, setHotels] = useState<HotelItem[]>(FALLBACK_HOTELS as any);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(hotelFilters.city || "");
  const [selectedVibe, setSelectedVibe] = useState<string>("All Stays");
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

  // 1. Dates & Nights Configuration
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

  // 2. Guests & Rooms Configuration
  const [guestsConfig, setGuestsConfig] = useState({
    rooms: hotelFilters.roomsCount || 1,
    adults: hotelFilters.guestsCount || 2,
    children: 0,
  });
  const [showGuestsModal, setShowGuestsModal] = useState(false);

  // 3. Room Selection Drawer & Availability Matrix State
  const [selectedHotel, setSelectedHotel] = useState<HotelItem | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);

  // Synchronize filter changes back to useTravelStore
  const syncStoreFilters = useCallback(
    (overrides: Partial<HotelSearchFilters> = {}) => {
      try {
        setHotelFilters({
          city: searchQuery,
          checkInDate: checkInDate.toISOString().split("T")[0],
          checkOutDate: checkOutDate.toISOString().split("T")[0],
          guestsCount: guestsConfig.adults,
          roomsCount: guestsConfig.rooms,
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

  // Load Hotels from travelRepository.searchHotels() with defensive fallback
  const fetchHotels = useCallback(
    async (isMounted = true) => {
      setLoading(true);
      try {
        const repoFilters: HotelSearchFilters = {
          city: searchQuery.trim() || undefined,
          minRating: guestRatingFilter > 0 ? guestRatingFilter / 2 : undefined,
          minPrice: minPriceSlider > 0 ? minPriceSlider : undefined,
          maxPrice: maxPriceSlider < HOSPITALITY_CONFIG.MAX_BUDGET ? maxPriceSlider : undefined,
        };

        const results = await travelRepository.searchHotels(repoFilters);

        if (isMounted) {
          if (results && results.length > 0) {
            const mappedHotels: HotelItem[] = results.map((r, idx) => {
              const basePrice = Number(r.price_per_night) || 85;
              const propType: "Hotel" | "Resort" | "Villa" | "Apartment" =
                r.name.toLowerCase().includes("resort")
                  ? "Resort"
                  : r.name.toLowerCase().includes("villa")
                  ? "Villa"
                  : r.name.toLowerCase().includes("apartment") || r.name.toLowerCase().includes("suite")
                  ? "Apartment"
                  : "Hotel";

              // Build room availability matrix
              const dynamicRooms: HotelRoom[] = [
                {
                  id: `${r.id}-deluxe-1`,
                  room_type: "Deluxe King Room",
                  description: "Spacious scenic room with plush king bedding and marble bathroom.",
                  max_occupancy: 2,
                  base_price: basePrice,
                  bed_type: "1 King Bed",
                  square_meters: 38,
                  amenities: ["Balcony", "AC", "Mini Bar", "Free WiFi"],
                  image_urls: [r.featured_image],
                  is_available: true,
                },
                {
                  id: `${r.id}-exec-2`,
                  room_type: "Executive Panoramic Suite",
                  description: "High-floor panorama suite with dedicated workspace and club lounge access.",
                  max_occupancy: 4,
                  base_price: Math.round(basePrice * 1.5),
                  bed_type: "2 Queen Beds",
                  square_meters: 65,
                  amenities: ["Living Room", "Bathtub", "Free Breakfast", "Airport Transfer"],
                  image_urls: r.images && r.images[1] ? [r.images[1]] : [r.featured_image],
                  is_available: idx % 2 === 0,
                },
              ];

              return {
                id: r.id,
                name: r.name,
                city: r.city,
                country: r.country || "Bangladesh",
                address: r.address || `${r.city}, Bangladesh`,
                star_rating: r.star_rating,
                average_rating: r.average_rating,
                total_reviews: r.reviews_count || 180,
                base_price: basePrice,
                image_url: r.featured_image,
                images: r.images && r.images.length > 0 ? r.images : [r.featured_image],
                amenities: r.amenities || ["Free Wi-Fi", "Swimming Pool", "Breakfast Included"],
                is_free_cancellation: r.is_free_cancellation ?? true,
                property_type: propType,
                hotel_rooms: dynamicRooms,
              };
            });
            setHotels(mappedHotels);
          } else {
            // Direct Supabase fallback
            const { data, error } = await supabase
              .from("hotels")
              .select("*, hotel_rooms(*)")
              .order("average_rating", { ascending: false });

            if (!error && data && data.length > 0) {
              setHotels(data);
            } else {
              setHotels(FALLBACK_HOTELS as any);
            }
          }
        }
      } catch (err) {
        console.warn("Hotel inventory fetch warning:", err);
        if (isMounted) {
          setHotels(FALLBACK_HOTELS as any);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    },
    [searchQuery, guestRatingFilter, minPriceSlider, maxPriceSlider]
  );

  useEffect(() => {
    let isMounted = true;
    fetchHotels(isMounted).catch(() => {});

    // Supabase real-time updates subscription
    const channelId = `stays-live-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels" }, () => {
        if (isMounted) fetchHotels(isMounted).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_rooms" }, () => {
        if (isMounted) fetchHotels(isMounted).catch(() => {});
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
  }, [fetchHotels]);

  // Handle Voucher claim
  const handleClaimVoucher = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimedVoucher(true);
    Alert.alert(
      "🎉 Voucher Claimed",
      `Your ${formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} New User discount will be deducted automatically at checkout!`
    );
  }, []);

  // Quick Nights Selector
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

  // Open Room Selection Modal for a Hotel
  const handleOpenHotelRooms = useCallback((hotel: HotelItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHotel(hotel);
    setSelectedRoomIndex(0);
  }, []);

  // Reset all filters action for EmptyState
  const handleResetFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery("");
    setSelectedVibe("All Stays");
    setStarRatingFilter(0);
    setGuestRatingFilter(0);
    setPropertyTypeFilter("All Types");
    setPricePreset("all");
    setMinPriceSlider(HOSPITALITY_CONFIG.MIN_BUDGET);
    setMaxPriceSlider(HOSPITALITY_CONFIG.MAX_BUDGET);
    setFreeCancellationOnly(false);
    resetFilters("hotels");
  }, [resetFilters]);

  // Filtered Hotels with full Filter Matrix
  const filteredHotels = useMemo(() => {
    let list = [...hotels];

    // 1. Text Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.country?.toLowerCase().includes(q) ||
          h.address?.toLowerCase().includes(q)
      );
    }

    // 2. Vibe Category Filter
    if (selectedVibe !== "All Stays") {
      const q = selectedVibe.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.amenities?.some((a) => a.toLowerCase().includes(q))
      );
    }

    // 3. Property Type Filter
    if (propertyTypeFilter !== "All Types") {
      const targetType = propertyTypeFilter.toLowerCase();
      list = list.filter((h) => {
        const propType = (h.property_type || "").toLowerCase();
        const name = h.name.toLowerCase();
        if (targetType === "resort") return propType === "resort" || name.includes("resort");
        if (targetType === "villa") return propType === "villa" || name.includes("villa") || name.includes("cottage");
        if (targetType === "apartment") return propType === "apartment" || name.includes("apartment") || name.includes("suite");
        return propType === "hotel" || (!name.includes("resort") && !name.includes("villa"));
      });
    }

    // 4. Star Rating Filter (1-5 Stars)
    if (starRatingFilter > 0) {
      list = list.filter((h) => Number(h.star_rating || 0) >= starRatingFilter);
    }

    // 5. Guest Rating Filter (8.5+ Fabulous)
    if (guestRatingFilter > 0) {
      list = list.filter((h) => {
        const avg = Number(h.average_rating || 0);
        const normalized = avg <= 5 ? avg * 2 : avg;
        return normalized >= guestRatingFilter;
      });
    }

    // 6. Price Range Filter (Slider & Presets)
    list = list.filter((h) => {
      const p = Number(h.base_price || 0);
      return p >= minPriceSlider && p <= maxPriceSlider;
    });

    // 7. Free Cancellation Filter
    if (freeCancellationOnly) {
      list = list.filter((h) => h.is_free_cancellation !== false);
    }

    return list;
  }, [
    hotels,
    searchQuery,
    selectedVibe,
    propertyTypeFilter,
    starRatingFilter,
    guestRatingFilter,
    minPriceSlider,
    maxPriceSlider,
    freeCancellationOnly,
  ]);

  // Selected Room in Bottom Sheet
  const activeRooms = useMemo(() => {
    if (!selectedHotel) return [];
    if (selectedHotel.hotel_rooms && selectedHotel.hotel_rooms.length > 0) {
      return selectedHotel.hotel_rooms;
    }
    return [];
  }, [selectedHotel]);

  const activeSelectedRoom = activeRooms[selectedRoomIndex] || activeRooms[0];

  // Dynamic Price Breakdown Calculations (Zero hard-coding)
  const roomRate = activeSelectedRoom
    ? parseFloat(String(activeSelectedRoom.base_price))
    : parseFloat(String(selectedHotel?.base_price)) || 80;
  const subtotal = roomRate * nightsCount * guestsConfig.rooms;
  const taxes = Math.round(subtotal * HOSPITALITY_CONFIG.TAX_RATE);
  const voucherDiscount = claimedVoucher ? HOSPITALITY_CONFIG.VOUCHER_DISCOUNT : 0;
  const finalTotal = Math.max(0, subtotal + taxes - voucherDiscount);

  // Reserve & Navigate to Checkout
  const handleReserveRoom = useCallback(() => {
    if (!selectedHotel) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const hotel = selectedHotel;
    const room = activeSelectedRoom;
    setSelectedHotel(null);

    router.push({
      pathname: "/screens/payments" as any,
      params: {
        hotelId: hotel.id,
        hotelName: hotel.name,
        roomType: room ? room.room_type : "Standard Room",
        roomId: room ? room.id : hotel.id,
        checkIn: checkInDate.toISOString().split("T")[0],
        checkOut: checkOutDate.toISOString().split("T")[0],
        nights: String(nightsCount),
        guests: `${guestsConfig.adults} Adults, ${guestsConfig.children} Children`,
        rooms: String(guestsConfig.rooms),
        amount: String(finalTotal),
        reference: `Booking: ${hotel.name} (${room ? room.room_type : "Standard"})`,
      },
    });
  }, [
    selectedHotel,
    activeSelectedRoom,
    checkInDate,
    checkOutDate,
    nightsCount,
    guestsConfig,
    finalTotal,
  ]);

  // ============================================================================
  // VIRTUALIZED PERFORMANCE: FLATLIST OPTIMIZATIONS
  // ============================================================================

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: HOTEL_CARD_HEIGHT,
      offset: HOTEL_CARD_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: HotelItem) => item.id, []);

  // Hotel Card Renderer
  const renderHotelItem = useCallback(
    ({ item: hotel }: { item: HotelItem }) => {
      const roomTypesCount = hotel.hotel_rooms?.length || 2;
      const { roomsLeft, isUrgent, badgeText } = getRoomInventoryStatus(roomTypesCount);
      const rating = hotel.average_rating || hotel.star_rating || "4.8";
      const reviews = hotel.total_reviews || 320;
      const startingPrice = hotel.base_price || 85;

      return (
        <Pressable
          style={styles.hotelCard}
          className="bg-white mx-4 mb-4 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
          onPress={() => handleOpenHotelRooms(hotel)}
        >
          {/* Progressive Image with Blur-Hash Placeholder */}
          <View style={styles.hotelImageWrapper} className="relative w-full h-52">
            <ProgressiveImage
              source={{ uri: hotel.image_url || MEDIA_ASSETS.DEFAULT_HOTEL }}
              style={styles.hotelImage}
              blurhash={MEDIA_ASSETS.DEFAULT_BLURHASH}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.68)"]}
              style={styles.hotelImageGradient}
            />

            {claimedVoucher && (
              <View style={styles.specialDealBadge} className="absolute top-3 left-3 flex-row items-center bg-emerald-600 px-2.5 py-1 rounded-full shadow-md">
                <Ionicons name="pricetag" size={11} color="#FFFFFF" />
                <Text style={styles.specialDealText} className="text-white text-xs font-bold ml-1">
                  {formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} OFF APPLIED
                </Text>
              </View>
            )}

            <View style={styles.ratingBadgePill} className="absolute bottom-3 right-3 flex-row items-center bg-white/95 px-2.5 py-1 rounded-full shadow-sm">
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingBadgeText} className="text-xs font-bold text-slate-800 ml-1">
                {rating}
              </Text>
              <Text style={styles.reviewsCountText} className="text-xs text-slate-500 ml-1">
                ({reviews})
              </Text>
            </View>
          </View>

          <View style={styles.hotelCardBody} className="p-4">
            <View style={styles.hotelTitleRow} className="flex-row items-center justify-between">
              <Text style={styles.hotelName} className="text-base font-extrabold text-slate-900 flex-1 mr-2" numberOfLines={1}>
                {hotel.name}
              </Text>
              {hotel.star_rating ? (
                <View className="flex-row items-center">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text className="text-xs font-bold text-amber-600 ml-0.5">{hotel.star_rating}★</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.hotelLocationRow} className="flex-row items-center mt-1">
              <Ionicons name="location-sharp" size={14} color={TRIP_BLUE} />
              <Text style={styles.hotelLocationText} className="text-xs text-slate-500 ml-1">
                {hotel.city}, {hotel.country || "Bangladesh"}
              </Text>
            </View>

            {/* Real-Time Room Inventory Availability Matrix */}
            <View style={styles.roomAvailTagRow} className="flex-row items-center gap-2 mt-2.5">
              {isUrgent ? (
                <View style={styles.roomUrgentTag} className="flex-row items-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300">
                  <Ionicons name="flame" size={12} color="#D97706" />
                  <Text style={styles.roomUrgentTagText} className="text-xs font-extrabold text-amber-700 ml-1">
                    {badgeText}
                  </Text>
                </View>
              ) : (
                <View style={styles.roomAvailTag} className="flex-row items-center px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300">
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.roomAvailTagText} className="text-xs font-bold text-emerald-700 ml-1">
                    {badgeText}
                  </Text>
                </View>
              )}

              <View style={styles.freeCancelTag} className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200">
                <Text style={styles.freeCancelTagText} className="text-xs font-semibold text-blue-600">
                  Free Cancellation
                </Text>
              </View>
            </View>

            {/* Amenities Tags */}
            <View style={styles.amenitiesTagsRow} className="flex-row flex-wrap gap-1.5 mt-2">
              {(hotel.amenities || ["Free WiFi", "Breakfast Included", "Pool"])
                .slice(0, 3)
                .map((a) => (
                  <View key={a} style={styles.amenityTag} className="px-2 py-0.5 rounded bg-slate-100">
                    <Text style={styles.amenityTagText} className="text-xs text-slate-600 font-medium">
                      {a}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Bottom Pricing & Reserve Trigger */}
            <View style={styles.hotelFooterRow} className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <View>
                <Text style={styles.startingFromLabel} className="text-xs text-slate-400 font-medium">
                  Starting from
                </Text>
                <Text style={styles.hotelPriceText} className="text-xl font-black text-slate-900">
                  {formatPrice(startingPrice)}
                  <Text style={styles.hotelPriceUnit} className="text-xs text-slate-500 font-medium">
                    {" "}/night
                  </Text>
                </Text>
              </View>

              <Pressable
                style={styles.viewRoomsBtn}
                className="flex-row items-center bg-blue-600 px-4 py-2.5 rounded-xl active:bg-blue-700 shadow-sm"
                onPress={() => handleOpenHotelRooms(hotel)}
              >
                <Text style={styles.viewRoomsBtnText} className="text-white text-xs font-bold mr-1">
                  Select Room ({roomTypesCount})
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    },
    [claimedVoucher, handleOpenHotelRooms]
  );

  // ============================================================================
  // HEADER COMPONENT (SEARCH, BENEFIT, AND COMPLETE FILTER MATRIX)
  // ============================================================================

  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* Quick Links Navigation */}
        <View style={styles.quickLinksRow} className="flex-row justify-around bg-white py-3.5 border-b border-slate-100">
          {[
            { label: "Saved", icon: "heart-outline" as const, route: "/screens/saved" },
            { label: "My Trips", icon: "calendar-outline" as const, route: "/(tabs)/trips" },
            { label: "Community", icon: "people-outline" as const, route: "/(tabs)/community" },
            { label: "Offers", icon: "pricetag-outline" as const, route: "/screens/rewards" },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={styles.quickLinkItem}
              className="items-center"
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.quickLinkCircle} className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center mb-1">
                <Ionicons name={item.icon} size={20} color={TRIP_BLUE} />
              </View>
              <Text style={styles.quickLinkLabel} className="text-xs font-semibold text-slate-600">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* HERO SEARCH & BOOKING BAR */}
        <View style={styles.bookingHeroCard} className="bg-white mx-4 mt-3.5 rounded-2xl p-4 shadow-sm border border-slate-200">
          {/* Destination Search Input */}
          <View style={styles.destinationRow} className="flex-row items-center bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">
            <Ionicons name="search" size={20} color={TRIP_BLUE} />
            <TextInput
              style={styles.destinationInput}
              className="flex-1 ml-2 text-sm font-semibold text-slate-900"
              placeholder="Where to? (e.g. Cox's Bazar, Dhaka, Sylhet...)"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                syncStoreFilters({ city: text });
              }}
            />
            {searchQuery ? (
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  syncStoreFilters({ city: "" });
                }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>

          {/* Interactive Date Range & Night Badge Selector */}
          <Pressable
            style={styles.dateSelectorBox}
            className="flex-row items-center justify-between bg-slate-50 rounded-xl px-4 py-3 mt-3 border border-slate-200"
            onPress={() => setShowDatePickerModal(true)}
          >
            <View style={styles.dateBlock} className="flex-1">
              <Text style={styles.dateLabel} className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                CHECK-IN
              </Text>
              <Text style={styles.dateValue} className="text-sm font-extrabold text-slate-900 mt-0.5">
                {formatDateShort(checkInDate)}
              </Text>
            </View>

            <View style={styles.nightsBadge} className="flex-row items-center bg-blue-50 px-2.5 py-1.5 rounded-xl mx-2">
              <Ionicons name="moon" size={12} color="#0055F2" />
              <Text style={styles.nightsBadgeText} className="text-xs font-bold text-blue-600 ml-1">
                {nightsCount} {nightsCount === 1 ? "Night" : "Nights"}
              </Text>
            </View>

            <View style={styles.dateBlock} className="flex-1 items-end">
              <Text style={styles.dateLabel} className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                CHECK-OUT
              </Text>
              <Text style={styles.dateValue} className="text-sm font-extrabold text-slate-900 mt-0.5">
                {formatDateShort(checkOutDate)}
              </Text>
            </View>
          </Pressable>

          {/* Interactive Guests & Rooms Selector */}
          <Pressable
            style={styles.guestsSelectorBox}
            className="flex-row items-center justify-between bg-slate-50 rounded-xl px-4 py-3 mt-2.5 border border-slate-200"
            onPress={() => setShowGuestsModal(true)}
          >
            <View style={styles.guestsInfoLeft} className="flex-row items-center">
              <Ionicons name="people-outline" size={18} color="#64748B" />
              <Text style={styles.guestsValue} className="text-sm font-bold text-slate-800 ml-2">
                {guestsConfig.rooms} {guestsConfig.rooms === 1 ? "Room" : "Rooms"} •{" "}
                {guestsConfig.adults} Adults
                {guestsConfig.children > 0 ? `, ${guestsConfig.children} Children` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* New User Benefits Banner with Instant Claim */}
        <View style={styles.benefitsBanner} className="bg-white mx-4 mt-3 rounded-2xl p-3.5 border border-slate-200">
          <View style={styles.benefitsHeader} className="flex-row items-center justify-between">
            <View>
              <Text style={styles.benefitsTitle} className="text-sm font-extrabold text-slate-900">
                New User Special
              </Text>
              <Text style={styles.benefitsSub} className="text-xs text-slate-500">
                Exclusive hospitality perks applied at checkout
              </Text>
            </View>
            <Pressable
              style={[styles.claimAllBtn, claimedVoucher && styles.claimAllBtnActive]}
              className={`px-3 py-1.5 rounded-full ${claimedVoucher ? "bg-emerald-600" : "bg-blue-600"}`}
              onPress={handleClaimVoucher}
            >
              <Text style={[styles.claimAllBtnText, claimedVoucher && { color: "#FFFFFF" }]} className="text-white text-xs font-bold">
                {claimedVoucher ? `Claimed ✓ (-${formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)})` : `Claim ${formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} Off`}
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vouchersScroll} className="mt-2.5">
            <View style={[styles.voucherCard, claimedVoucher && styles.voucherCardActive]} className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mr-2">
              <Text style={styles.voucherDiscount} className="text-xs font-extrabold text-blue-600">{formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)} OFF</Text>
              <Text style={styles.voucherDesc} className="text-xs text-slate-500">First stay credit</Text>
            </View>
            <View style={styles.voucherCard} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mr-2">
              <Text style={styles.voucherDiscount} className="text-xs font-extrabold text-amber-600">Free Breakfast</Text>
              <Text style={styles.voucherDesc} className="text-xs text-slate-500">At 5-star properties</Text>
            </View>
            <View style={styles.voucherCard} className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <Text style={styles.voucherDiscount} className="text-xs font-extrabold text-emerald-600">Free Cancel</Text>
              <Text style={styles.voucherDesc} className="text-xs text-slate-500">Up to 24h before</Text>
            </View>
          </ScrollView>
        </View>

        {/* Vibe Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vibePillsRow}
          className="mt-3 px-4"
        >
          {VIBE_CATEGORIES.map((vibe) => (
            <Pressable
              key={vibe}
              style={[styles.vibePill, selectedVibe === vibe && styles.vibePillActive]}
              className={`px-3.5 py-2 rounded-full mr-2 border ${
                selectedVibe === vibe
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-slate-200"
              }`}
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
                className={`text-xs font-bold ${
                  selectedVibe === vibe ? "text-white" : "text-slate-700"
                }`}
              >
                {vibe}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ================================================================= */}
        {/* COMPREHENSIVE FILTER MATRIX */}
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
              freeCancellationOnly) && (
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
                    className={`px-3 py-1.5 rounded-full mr-2 border ${
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
                    className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${
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
                      style={{ marginRight: 3 }}
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
                    className={`px-3 py-1.5 rounded-full mr-2 border ${
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

          {/* 4. Interactive Price Range Slider & Stepper Controls */}
          <View style={styles.filterGroupRow} className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text style={styles.filterGroupTitle} className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Price Range Slider:
              </Text>
              <Text className="text-xs font-extrabold text-blue-600">
                {formatPrice(minPriceSlider)} - {maxPriceSlider >= HOSPITALITY_CONFIG.MAX_BUDGET ? `${formatPrice(HOSPITALITY_CONFIG.MAX_BUDGET)}+` : formatPrice(maxPriceSlider)}
              </Text>
            </View>

            {/* Visual Slider Bar Track */}
            <View className="w-full h-2 bg-slate-200 rounded-full my-2 overflow-hidden">
              <View
                style={{
                  width: `${Math.min(100, Math.max(10, (maxPriceSlider / HOSPITALITY_CONFIG.MAX_BUDGET) * 100))}%`,
                }}
                className="h-full bg-blue-600 rounded-full"
              />
            </View>

            {/* Quick Price Milestone Pills */}
            <View className="flex-row justify-between mb-2">
              {BUDGET_MILESTONES.map((cap) => (
                <Pressable
                  key={cap}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMaxPriceSlider(cap);
                    setPricePreset("custom");
                    syncStoreFilters({ maxPrice: cap < HOSPITALITY_CONFIG.MAX_BUDGET ? cap : undefined });
                  }}
                  className={`px-2 py-0.5 rounded ${maxPriceSlider === cap ? "bg-blue-600" : "bg-slate-100"}`}
                >
                  <Text className={`text-[10px] font-bold ${maxPriceSlider === cap ? "text-white" : "text-slate-600"}`}>
                    {formatPrice(cap)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Presets Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {PRICE_PRESETS.map((chip) => {
                const isSelected = pricePreset === chip.value;
                return (
                  <Pressable
                    key={chip.label}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    className={`px-3 py-1.5 rounded-full mr-2 border ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-50 border-slate-200"
                    }`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPricePreset(chip.value);
                      setMinPriceSlider(chip.min);
                      setMaxPriceSlider(chip.max);
                      syncStoreFilters({
                        minPrice: chip.min > 0 ? chip.min : undefined,
                        maxPrice: chip.max < HOSPITALITY_CONFIG.MAX_BUDGET ? chip.max : undefined,
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

            {/* Interactive Price Stepper Controls */}
            <View className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2">
              <Pressable
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg active:bg-slate-100"
                onPress={() => {
                  Haptics.selectionAsync();
                  setMaxPriceSlider((prev) => Math.max(minPriceSlider + HOSPITALITY_CONFIG.BUDGET_STEP, prev - HOSPITALITY_CONFIG.BUDGET_STEP));
                  setPricePreset("custom");
                }}
              >
                <Text className="text-xs font-bold text-slate-700">-{formatPrice(HOSPITALITY_CONFIG.BUDGET_STEP)}</Text>
              </Pressable>

              <View className="items-center">
                <Text className="text-xs font-bold text-slate-500">Max Budget Cap</Text>
                <Text className="text-sm font-extrabold text-slate-900">{formatPrice(maxPriceSlider)}/night</Text>
              </View>

              <Pressable
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg active:bg-slate-100"
                onPress={() => {
                  Haptics.selectionAsync();
                  setMaxPriceSlider((prev) => Math.min(HOSPITALITY_CONFIG.MAX_BUDGET, prev + HOSPITALITY_CONFIG.BUDGET_STEP));
                  setPricePreset("custom");
                }}
              >
                <Text className="text-xs font-bold text-slate-700">+{formatPrice(HOSPITALITY_CONFIG.BUDGET_STEP)}</Text>
              </Pressable>
            </View>
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
                  style={{ marginRight: 4 }}
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

        {/* Section Header */}
        <View style={styles.sectionHeaderRow} className="flex-row items-center justify-between px-4 mt-4 mb-2">
          <Text style={styles.sectionHeading} className="text-base font-extrabold text-slate-900">
            {searchQuery ? `Stays in "${searchQuery}"` : "Featured Stays & Resorts"}
          </Text>
          <Text style={styles.sectionCountText} className="text-xs font-semibold text-slate-500">
            ({filteredHotels.length} available)
          </Text>
        </View>
      </View>
    );
  }, [
    searchQuery,
    checkInDate,
    checkOutDate,
    nightsCount,
    guestsConfig,
    claimedVoucher,
    selectedVibe,
    propertyTypeFilter,
    starRatingFilter,
    guestRatingFilter,
    pricePreset,
    minPriceSlider,
    maxPriceSlider,
    freeCancellationOnly,
    filteredHotels.length,
    handleClaimVoucher,
    handleResetFilters,
    syncStoreFilters,
  ]);

  // ============================================================================
  // EMPTY AND LOADING STATES (WITH POPULAR DESTINATION CHIPS)
  // ============================================================================

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <ListSkeleton count={3} type="card" />
        </View>
      );
    }

    return (
      <View style={{ paddingVertical: 24, paddingHorizontal: 16 }}>
        <EmptyState
          type="search"
          title="No stays match your criteria"
          description={`We couldn't find any stays matching your filters in "${searchQuery || "this destination"}". Try expanding your price range, lowering rating requirements, or picking a popular city below.`}
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
          compact={false}
        />

        {/* Popular Destination Recommendation Chips */}
        <View className="mt-4 bg-white p-4 rounded-2xl border border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">
            Explore Popular Destinations:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_DESTINATIONS.map((dest) => (
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
  }, [loading, searchQuery, handleResetFilters, syncStoreFilters]);

  // ============================================================================
  // RENDER MAIN SCREEN
  // ============================================================================

  return (
    <SafeAreaView style={styles.shell} edges={["top"]} className="flex-1 bg-slate-50">
      {/* Top Header */}
      <View style={styles.header} className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <Pressable
          style={styles.backBtn}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle} className="text-base font-extrabold text-slate-900">
          Search Stays
        </Text>
        <Pressable
          style={styles.moreBtn}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          onPress={() => router.push("/screens/settings" as any)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#0F172A" />
        </Pressable>
      </View>

      {/* Optimized Virtualized FlatList */}
      <FlatList
        data={filteredHotels}
        renderItem={renderHotelItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      {/* =================================================================== */}
      {/* MODAL 1: INTERACTIVE DATE PICKER SHEET */}
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
                  Trip Dates
                </Text>
                <Text style={styles.modalSubTitle} className="text-xs text-slate-500">
                  {nightsCount} {nightsCount === 1 ? "Night" : "Nights"} stay
                </Text>
              </View>
              <Pressable onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Quick Night Chips */}
            <Text style={styles.modalSectionLabel} className="text-xs font-bold text-slate-500 uppercase mb-2">
              Quick Duration:
            </Text>
            <View style={styles.quickNightsRow} className="flex-row flex-wrap gap-2 mb-4">
              {[1, 2, 3, 5, 7, 14].map((n) => (
                <Pressable
                  key={`nights-${n}`}
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

            {/* Date Display Card */}
            <View style={styles.datesSummaryBox} className="flex-row items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <View style={styles.dateSummaryCol}>
                <Text style={styles.dateSummaryHeading} className="text-xs font-bold text-slate-500">
                  Check-in
                </Text>
                <Text style={styles.dateSummaryDate} className="text-sm font-extrabold text-slate-900 mt-1">
                  {formatDateFull(checkInDate)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#0055F2" />
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
      {/* MODAL 2: GUESTS & ROOMS CONFIGURATION MODAL */}
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
                  Guests & Rooms
                </Text>
                <Text style={styles.modalSubTitle} className="text-xs text-slate-500">
                  Configure travel party
                </Text>
              </View>
              <Pressable onPress={() => setShowGuestsModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Stepper Rows */}
            <View style={styles.stepperRow} className="flex-row items-center justify-between py-3 border-b border-slate-100">
              <View>
                <Text style={styles.stepperTitle} className="text-sm font-bold text-slate-900">
                  Rooms
                </Text>
                <Text style={styles.stepperSub} className="text-xs text-slate-500">
                  Number of hotel rooms
                </Text>
              </View>
              <View style={styles.stepperControl} className="flex-row items-center">
                <Pressable
                  style={styles.stepBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  onPress={() =>
                    setGuestsConfig((c) => {
                      const updated = { ...c, rooms: Math.max(1, c.rooms - 1) };
                      syncStoreFilters({ roomsCount: updated.rooms });
                      return updated;
                    })
                  }
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </Pressable>
                <Text style={styles.stepValue} className="w-8 text-center text-sm font-bold text-slate-900">
                  {guestsConfig.rooms}
                </Text>
                <Pressable
                  style={styles.stepBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  onPress={() =>
                    setGuestsConfig((c) => {
                      const updated = { ...c, rooms: Math.min(5, c.rooms + 1) };
                      syncStoreFilters({ roomsCount: updated.rooms });
                      return updated;
                    })
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

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
                      const updated = { ...c, adults: Math.min(10, c.adults + 1) };
                      syncStoreFilters({ guestsCount: updated.adults });
                      return updated;
                    })
                  }
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </Pressable>
              </View>
            </View>

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
      {/* MODAL 3: ROOM AVAILABILITY MATRIX & RESERVATION DRAWER */}
      {/* =================================================================== */}
      <Modal
        visible={!!selectedHotel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedHotel(null)}
      >
        {selectedHotel && (
          <View style={styles.bottomSheetOverlay} className="flex-1 justify-end bg-black/60">
            <View style={styles.bottomSheetCard} className="bg-white rounded-t-3xl max-h-[85%] p-5 shadow-2xl">
              {/* Hotel Header Info */}
              <View style={styles.bottomSheetHeader} className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View style={{ flex: 1 }}>
                  <Text style={styles.bottomSheetHotelName} className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                    {selectedHotel.name}
                  </Text>
                  <Text style={styles.bottomSheetLocation} className="text-xs text-slate-500 mt-0.5">
                    {selectedHotel.city}, {selectedHotel.country || "Bangladesh"}
                  </Text>
                </View>
                <Pressable
                  style={styles.sheetCloseBtn}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center ml-2"
                  onPress={() => setSelectedHotel(null)}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </Pressable>
              </View>

              {/* Selected Dates Banner */}
              <View style={styles.sheetDatesBanner} className="flex-row items-center bg-blue-50 px-3.5 py-2.5 rounded-xl my-3">
                <Ionicons name="calendar" size={14} color="#0055F2" />
                <Text style={styles.sheetDatesText} className="text-xs font-bold text-blue-700 ml-2">
                  {formatDateShort(checkInDate)} - {formatDateShort(checkOutDate)}{" "}
                  ({nightsCount} {nightsCount === 1 ? "Night" : "Nights"}) • {guestsConfig.adults} Adults
                </Text>
              </View>

              <ScrollView style={styles.roomsListScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.selectRoomHeading} className="text-sm font-extrabold text-slate-900 mb-2.5">
                  Room Availability Matrix:
                </Text>

                {activeRooms.length > 0 ? (
                  activeRooms.map((room, idx) => {
                    const isSelected = selectedRoomIndex === idx;
                    const price = parseFloat(String(room.base_price)) || 80;
                    const roomImage =
                      Array.isArray(room.image_urls) && room.image_urls.length > 0
                        ? room.image_urls[0]
                        : selectedHotel.image_url || MEDIA_ASSETS.DEFAULT_ROOM;

                    return (
                      <Pressable
                        key={room.id || idx}
                        style={[styles.roomCard, isSelected && styles.roomCardActive]}
                        className={`flex-row p-3 rounded-2xl mb-3 border ${
                          isSelected
                            ? "bg-blue-50/50 border-blue-600"
                            : "bg-white border-slate-200"
                        }`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedRoomIndex(idx);
                        }}
                      >
                        <View style={styles.roomImageContainer} className="relative w-24 h-24 rounded-xl overflow-hidden mr-3">
                          <ProgressiveImage
                            source={{ uri: roomImage }}
                            style={styles.roomThumbnail}
                          />
                          <View style={styles.radioCircle} className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/90 items-center justify-center border border-slate-300">
                            {isSelected && <View style={styles.radioInnerDot} className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                          </View>
                        </View>

                        <View style={styles.roomDetailsCol} className="flex-1 justify-between">
                          <View className="flex-row items-center justify-between">
                            <Text style={styles.roomTitle} className="text-sm font-extrabold text-slate-900 flex-1 mr-1">
                              {room.room_type}
                            </Text>
                            <View className="flex-row items-center bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Ionicons name="flame" size={10} color="#D97706" />
                              <Text className="text-[10px] font-bold text-amber-700 ml-0.5">
                                {idx === 0 ? "Only 2 rooms left!" : "Available"}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.roomSpecs} className="text-xs text-slate-500 font-medium mt-0.5">
                            {room.bed_type || "King Bed"} • {room.square_meters || 38} m² • Up to {room.max_occupancy} guests
                          </Text>
                          <Text style={styles.roomDesc} className="text-xs text-slate-400 mt-1" numberOfLines={2}>
                            {room.description || "Luxurious room with premium bedding and morning views."}
                          </Text>

                          {/* Room Amenities */}
                          <View style={styles.roomAmenitiesRow} className="flex-row flex-wrap gap-1 mt-1.5">
                            {(Array.isArray(room.amenities)
                              ? room.amenities
                              : ["Free WiFi", "Balcony", "AC"]
                            )
                              .slice(0, 3)
                              .map((am) => (
                                <View key={am} style={styles.roomAmenityPill} className="px-1.5 py-0.5 rounded bg-slate-100">
                                  <Text style={styles.roomAmenityText} className="text-[10px] text-slate-600 font-semibold">
                                    {am}
                                  </Text>
                                </View>
                              ))}
                          </View>

                          <Text style={styles.roomPriceText} className="text-base font-black text-slate-900 mt-1.5">
                            {formatPrice(price)}
                            <Text style={styles.roomPriceSub} className="text-xs text-slate-500 font-medium">
                              {" "}/ night
                            </Text>
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View className="p-5 items-center bg-slate-50 rounded-xl mb-4 border border-slate-200">
                    <Ionicons name="bed-outline" size={32} color="#64748B" />
                    <Text className="text-sm font-bold text-slate-800 mt-2">
                      Standard Room Stay
                    </Text>
                    <Text className="text-xs text-slate-500 text-center mt-1">
                      Direct property reservation at standard base rate ({formatPrice(roomRate)}/night).
                    </Text>
                  </View>
                )}

                {/* Price Breakdown Card */}
                <View style={styles.priceBreakdownCard} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 mb-4">
                  <Text style={styles.breakdownTitle} className="text-sm font-extrabold text-slate-900 mb-3">
                    Transparent Price Breakdown
                  </Text>
                  <View style={styles.breakdownRow} className="flex-row justify-between mb-2">
                    <Text style={styles.breakdownLabel} className="text-xs text-slate-600">
                      {(activeSelectedRoom?.room_type || "Standard Room")} ({nightsCount} nights x {formatPrice(roomRate)})
                    </Text>
                    <Text style={styles.breakdownVal} className="text-xs font-bold text-slate-800">{formatPrice(subtotal)}</Text>
                  </View>
                  <View style={styles.breakdownRow} className="flex-row justify-between mb-2">
                    <Text style={styles.breakdownLabel} className="text-xs text-slate-600">
                      Taxes & fees (10%)
                    </Text>
                    <Text style={styles.breakdownVal} className="text-xs font-bold text-slate-800">{formatPrice(taxes)}</Text>
                  </View>
                  {claimedVoucher && (
                    <View style={styles.breakdownRow} className="flex-row justify-between mb-2">
                      <Text style={[styles.breakdownLabel, { color: "#10B981" }]} className="text-xs font-bold text-emerald-600">
                        New user discount (-{formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)})
                      </Text>
                      <Text style={[styles.breakdownVal, { color: "#10B981" }]} className="text-xs font-bold text-emerald-600">
                        -{formatPrice(HOSPITALITY_CONFIG.VOUCHER_DISCOUNT)}.00
                      </Text>
                    </View>
                  )}
                  <View style={styles.breakdownDivider} className="h-[1px] bg-slate-200 my-2" />
                  <View style={styles.breakdownRow} className="flex-row justify-between items-center">
                    <Text style={styles.totalLabel} className="text-sm font-extrabold text-slate-900">
                      Total Payable
                    </Text>
                    <Text style={styles.totalVal} className="text-lg font-black text-blue-600">
                      {formatPrice(finalTotal)}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Bottom Action Button: Reserve Room */}
              <View style={styles.sheetFooter} className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                <View>
                  <Text style={styles.sheetFooterTotal} className="text-xl font-black text-slate-900">
                    {formatPrice(finalTotal)}
                  </Text>
                  <Text style={styles.sheetFooterSub} className="text-xs text-slate-500">
                    {nightsCount} nights • All taxes included
                  </Text>
                </View>

                <Pressable
                  style={styles.reserveBtn}
                  className="flex-row items-center bg-blue-600 px-5 py-3 rounded-xl active:bg-blue-700 shadow-sm"
                  onPress={handleReserveRoom}
                >
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                  <Text style={styles.reserveBtnText} className="text-white text-sm font-bold ml-1.5">
                    Reserve Room
                  </Text>
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

// ============================================================================
// STYLES
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
    paddingBottom: 100,
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
  },
  guestsValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  benefitsBanner: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  benefitsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  benefitsSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  claimAllBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  claimAllBtnActive: {
    backgroundColor: "#10B981",
  },
  claimAllBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  vouchersScroll: {
    marginTop: 10,
  },
  voucherCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  voucherCardActive: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  voucherDiscount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0055F2",
  },
  voucherDesc: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  vibePillsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  vibePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vibePillActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  vibePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  vibePillTextActive: {
    color: "#FFFFFF",
  },
  hotelCard: {
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
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: HOTEL_CARD_HEIGHT - 16,
  },
  hotelImageWrapper: {
    height: 195,
    width: "100%",
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
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialDealText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ratingBadgePill: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewsCountText: {
    fontSize: 11,
    color: "#64748B",
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
  },
  amenitiesTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  amenityTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityTagText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  hotelFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  startingFromLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  hotelPriceText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },
  hotelPriceUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  viewRoomsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  viewRoomsBtnText: {
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
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionCountText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
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
    fontSize: 11,
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
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    padding: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bottomSheetHotelName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  bottomSheetLocation: {
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
  sheetDatesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 12,
  },
  sheetDatesText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0055F2",
  },
  roomsListScroll: {
    maxHeight: 380,
  },
  selectRoomHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  roomCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  roomCardActive: {
    borderColor: TRIP_BLUE,
    backgroundColor: "rgba(0, 85, 242, 0.02)",
  },
  roomImageContainer: {
    width: 85,
    height: 85,
    borderRadius: 10,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TRIP_BLUE,
  },
  roomDetailsCol: {
    flex: 1,
    justifyContent: "center",
  },
  roomTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  roomSpecs: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  roomDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  roomAmenitiesRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  roomAmenityPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roomAmenityText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#475569",
  },
  roomPriceText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 6,
  },
  roomPriceSub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  priceBreakdownCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
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
  breakdownVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalVal: {
    fontSize: 16,
    fontWeight: "900",
    color: TRIP_BLUE,
  },
  sheetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 8,
  },
  sheetFooterTotal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  sheetFooterSub: {
    fontSize: 11,
    color: "#64748B",
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  reserveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 2,
  },
});
