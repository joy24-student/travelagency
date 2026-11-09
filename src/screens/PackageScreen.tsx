import React, { useState, useEffect, useMemo, useRef } from "react";
import {
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../hooks/useAuth";
import { bookingRepository } from "../services/repositories/booking";
import { supabase } from "../utils/supabase";
import { AiPill, BottomNav } from "./Navigation";
import { TopBar } from "./TopBar";
import { screens, type UIScreen } from "../data/screens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#E5A93C";
const TRIP_PURPLE = "#7C3AED";
const TRIP_ACCENT = "#FF7D00";
const ACCENT_GREEN = "#10B981";

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
  category: "Flight + Hotel" | "Beach & Tropical" | "Luxury 5-Star" | "City Break" | "Nature & Hills" | "Honeymoon Special";
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

// ============================================================================
// Static Catalogs & Defaults
// ============================================================================

export const DEPARTURE_AIRPORTS: AirportOption[] = [
  { code: "DAC", city: "Dhaka", airport: "Hazrat Shahjalal Int'l (DAC)", country: "Bangladesh" },
  { code: "CGP", city: "Chittagong", airport: "Shah Amanat Int'l (CGP)", country: "Bangladesh" },
  { code: "ZYL", city: "Sylhet", airport: "Osmani Int'l (ZYL)", country: "Bangladesh" },
  { code: "BKK", city: "Bangkok", airport: "Suvarnabhumi Airport (BKK)", country: "Thailand" },
  { code: "SIN", city: "Singapore", airport: "Singapore Changi (SIN)", country: "Singapore" },
  { code: "DXB", city: "Dubai", airport: "Dubai Int'l Airport (DXB)", country: "United Arab Emirates" },
];

export const DESTINATION_CITIES = [
  { name: "All Destinations", country: "Global" },
  { name: "Cox's Bazar", country: "Bangladesh" },
  { name: "Bangkok", country: "Thailand" },
  { name: "Dubai", country: "United Arab Emirates" },
  { name: "Maldives", country: "Maldives" },
  { name: "Singapore", country: "Singapore" },
  { name: "Kashmir", country: "India" },
  { name: "Sreemangal", country: "Bangladesh" },
  { name: "Istanbul", country: "Turkey" },
];

export const CATEGORY_TABS = [
  "All Bundles",
  "Flight + Hotel",
  "Beach & Tropical",
  "Luxury 5-Star",
  "City Break",
  "Nature & Hills",
  "Honeymoon Special",
] as const;

export const DURATION_FILTERS = ["All", "3D/2N", "4D/3N", "5D/4N", "6D/5N", "7D/6N+"] as const;

function mapTourToPackage(t: any): VacationPackage {
  const priceNum = Number(t.price) || 199;
  const origPriceNum = Number(t.original_price) || Math.round(priceNum * 1.25);
  const city = t.destination_city || "Tropical Destination";
  const country = t.destination_country || "Bangladesh";
  const days = t.duration_days || 4;
  const image = (Array.isArray(t.image_urls) && t.image_urls[0]) || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800";
  const gallery = Array.isArray(t.image_urls) && t.image_urls.length > 0 ? t.image_urls : [image];

  return {
    id: t.id,
    name: t.title,
    slug: t.slug || t.id,
    destinationCity: city,
    destinationCountry: country,
    departureCity: "Dhaka",
    duration: t.duration_text || `${days} Days / ${Math.max(1, days - 1)} Nights`,
    durationDays: days,
    category: city.toLowerCase().includes("beach") || city.toLowerCase().includes("cox") || city.toLowerCase().includes("maldives")
      ? "Beach & Tropical"
      : (days >= 5 ? "Flight + Hotel" : "City Break"),
    badge: t.is_featured ? "VERIFIED BUNDLE" : "TOP RATED",
    rating: Number(t.rating) || 4.9,
    reviewsCount: Number(t.reviews_count) || 120,
    image,
    galleryImages: gallery,
    pricePerPerson: priceNum,
    originalPricePerPerson: origPriceNum,
    currency: t.currency || "USD",
    flight: {
      airline: "Biman Bangladesh / Partner Air",
      airlineLogo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100",
      flightNumber: `FL-${(t.slug || 'tour').slice(0, 4).toUpperCase()}`,
      route: `DAC ➔ ${city}`,
      departureAirport: "Hazrat Shahjalal Int'l (DAC)",
      arrivalAirport: `${city} Airport`,
      duration: "1h 45m",
      cabinClass: "Economy Class",
      baggageAllowance: "25kg Check-in + 7kg Cabin",
      aircraft: "Boeing 737-800",
      isDirect: true,
    },
    hotel: {
      name: `${city} Luxury Partner Hotel & Spa`,
      stars: 5,
      address: `${city}, ${country}`,
      roomType: "Deluxe Ocean / City View Room",
      bedSetup: "1 King Bed or 2 Twin Beds",
      amenities: ["Free High-speed Wi-Fi", "Daily Buffet Breakfast", "Infinity Swimming Pool", "Fitness & Wellness", "Airport Shuttle"],
      image,
      checkInTime: "14:00",
      checkOutTime: "12:00",
    },
    inclusions: Array.isArray(t.included_services) && t.included_services.length > 0
      ? t.included_services
      : ["Return Economy Airfare with taxes", "5-Star Hotel Accommodations", "Daily Breakfast Buffet", "Airport Pick & Drop", "Guided City Highlights Tour"],
    exclusions: Array.isArray(t.not_included) && t.not_included.length > 0
      ? t.not_included
      : ["Personal expenses & tips", "Travel insurance", "Visa fees"],
    meals: ["Daily Breakfast Buffet", "Welcome Dinner"],
    itinerary: [
      {
        dayNumber: 1,
        title: `Arrival in ${city} & Hotel Check-in`,
        summary: `Arrive at ${city} airport, private transfer to hotel, and leisure evening.`,
        morning: "Airport pickup & scenic transit",
        afternoon: "Hotel check-in & relax",
        evening: "Welcome dinner at rooftop restaurant",
        mealsIncluded: "Dinner",
      },
      {
        dayNumber: 2,
        title: `${city} Guided Tour & Highlights`,
        summary: "Explore the most famous cultural spots and scenic attractions.",
        morning: "Guided city landmarks sightseeing",
        afternoon: "Local culinary tasting & artisan markets",
        evening: "Sunset viewpoint visit",
        mealsIncluded: "Breakfast, Lunch",
      },
      {
        dayNumber: 3,
        title: "Free Day for Shopping & Leisure",
        summary: "Enjoy resort amenities or optional adventure excursions.",
        morning: "Buffet breakfast",
        afternoon: "Optional beach / adventure activity",
        evening: "Evening leisure & night market",
        mealsIncluded: "Breakfast",
      },
      {
        dayNumber: 4,
        title: "Departure & Farewell",
        summary: "Breakfast, souvenir shopping, and transfer to airport for return flight.",
        morning: "Breakfast & souvenir shopping",
        afternoon: "Hotel check-out & airport transfer",
        evening: "Return flight to Dhaka",
        mealsIncluded: "Breakfast",
      },
    ],
    addons: [
      { id: "addon-ins", name: "Comprehensive Travel Insurance", description: "Medical & trip disruption coverage", pricePerPerson: 25, icon: "shield-checkmark-outline" },
      { id: "addon-sim", name: "Unlimited 5G Tourist eSIM", description: "10GB daily high-speed data", pricePerPerson: 15, icon: "wifi-outline" },
      { id: "addon-seat", name: "Premium Extra Legroom Seats", description: "Front rows with priority boarding", pricePerPerson: 35, icon: "airplane-outline" },
    ],
    cancellationPolicy: "Free cancellation up to 7 days before departure. 50% refund between 7-3 days.",
    seatsLeft: t.max_participants ? Math.max(2, t.max_participants - 12) : 6,
    provider: t.guide_name ? `${t.guide_name} Tours` : "Verified Travel Partner",
  };
}



// ============================================================================
// Main PackageScreen Component
// ============================================================================

export function PackageScreen({ screen }: { screen?: UIScreen } = {}) {
  const activeScreen = screen ?? screens.find((s) => s.slug === "packages") ?? screens[0];
  const { user } = useAuth();

  // Core package state
  const [packages, setPackages] = useState<VacationPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [originAirport, setOriginAirport] = useState<AirportOption>(DEPARTURE_AIRPORTS[0]);
  const [selectedDestination, setSelectedDestination] = useState<string>("All Destinations");
  const [activeCategory, setActiveCategory] = useState<string>("All Bundles");
  const [activeDuration, setActiveDuration] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Travelers state
  const [travelers, setTravelers] = useState({
    adults: 2,
    children: 0,
    rooms: 1,
  });

  // Modals state
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [showTravelersModal, setShowTravelersModal] = useState(false);
  const [airportSearchText, setAirportSearchText] = useState("");
  const [destSearchText, setDestSearchText] = useState("");

  // Drawer / Details modal state
  const [selectedPackage, setSelectedPackage] = useState<VacationPackage | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"Overview" | "Flights" | "Hotel" | "Itinerary" | "Policy">("Overview");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [wishlist, setWishlist] = useState<string[]>(["pkg-cxb-luxury"]);
  const [isBooking, setIsBooking] = useState(false);

  // Animation values for drawer
  const drawerSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const drawerBackdropAnim = useRef(new Animated.Value(0)).current;

  // --------------------------------------------------------------------------
  // Supabase Data Fetching & Real-Time Channel
  // --------------------------------------------------------------------------

  const fetchPackagesFromSupabase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: VacationPackage[] = data.map(mapTourToPackage);
        setPackages(mapped);
      } else {
        setPackages([]);
      }
    } catch (err) {
      console.warn("Error fetching Supabase tour packages:", err);
      setPackages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPackagesFromSupabase();

    // Subscribe to Postgres changes on tours table for live sync
    const channel = supabase
      .channel("packages-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
        fetchPackagesFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchPackagesFromSupabase();
  };

  // --------------------------------------------------------------------------
  // Drawer Animation Controls
  // --------------------------------------------------------------------------

  const openDrawer = (pkg: VacationPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPackage(pkg);
    setActiveDetailTab("Overview");
    setSelectedAddonIds([]);
    setExpandedDay(1);

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
  // Interactive Filters & Calculations
  // --------------------------------------------------------------------------

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Destination filter
      if (selectedDestination !== "All Destinations") {
        if (!pkg.destinationCity.toLowerCase().includes(selectedDestination.toLowerCase())) {
          return false;
        }
      }

      // Category tab filter
      if (activeCategory !== "All Bundles") {
        if (pkg.category !== activeCategory) {
          // If searching Flight + Hotel, accept both Flight + Hotel and Beach & Tropical with flights
          if (activeCategory === "Flight + Hotel" && !pkg.flight) return false;
          else if (activeCategory !== "Flight + Hotel") return false;
        }
      }

      // Duration filter
      if (activeDuration !== "All") {
        if (activeDuration === "7D/6N+" && pkg.durationDays < 7) return false;
        if (activeDuration !== "7D/6N+" && !pkg.duration.includes(activeDuration)) return false;
      }

      // Search query filter
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

  // Wishlist toggle
  const toggleWishlist = (id: string) => {
    Haptics.selectionAsync();
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Addon toggle
  const toggleAddon = (addonId: string) => {
    Haptics.selectionAsync();
    setSelectedAddonIds((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
  };

  // Dynamic Total Price Calculation
  const calculatePackageTotal = (pkg: VacationPackage) => {
    const adultRate = pkg.pricePerPerson * travelers.adults;
    const childRate = pkg.pricePerPerson * 0.7 * travelers.children;
    const baseTotal = adultRate + childRate;

    // Addons cost
    let addonsTotal = 0;
    if (selectedAddonIds.length > 0) {
      pkg.addons.forEach((addon) => {
        if (selectedAddonIds.includes(addon.id)) {
          addonsTotal += addon.pricePerPerson * (travelers.adults + travelers.children);
        }
      });
    }

    return Math.round(baseTotal + addonsTotal);
  };

  // --------------------------------------------------------------------------
  // Instant Reservation & Payment Route Trigger
  // --------------------------------------------------------------------------

  const handleBookNow = async (pkg: VacationPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsBooking(true);

    try {
      const ref = `PKG-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmount = calculatePackageTotal(pkg);
      const totalTravelers = travelers.adults + travelers.children;

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
            number_of_guests: totalTravelers,
            total_price: totalAmount,
            final_price: totalAmount,
            currency: pkg.currency || "USD",
            notes: `Flight: ${pkg.flight.airline} (${pkg.flight.route}) | Hotel: ${pkg.hotel.name} (${pkg.hotel.roomType}) | Addons: ${selectedAddonIds.join(", ") || "None"}`,
          });
          if (newBooking?.id) bookingId = newBooking.id;
        } catch (dbErr) {
          console.warn("Could not insert pending package booking into Supabase:", dbErr);
        }
      }

      // Close drawer cleanly
      closeDrawer();

      // Route to payments screen with prefilled package parameters
      router.push({
        pathname: "/screens/payments" as any,
        params: {
          amount: totalAmount.toString(),
          reference: ref,
          productType: "package",
          packageTitle: pkg.name,
          packageId: pkg.id,
          flightInfo: `${pkg.flight.airline} · ${pkg.flight.route}`,
          hotelName: `${pkg.hotel.name} (${pkg.hotel.stars}★ ${pkg.hotel.roomType})`,
          destination: `${pkg.destinationCity}, ${pkg.destinationCountry}`,
          duration: pkg.duration,
          travelers: `${totalTravelers}`,
          roomCount: `${travelers.rooms}`,
          bookingId,
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
        message: `🌴 Check out this Flight + Hotel Bundle: "${pkg.name}" for only $${pkg.pricePerPerson}/person on Trip.com!\nIncludes ${pkg.flight.airline} flights & 5-Star ${pkg.hotel.name}.`,
        title: pkg.name,
      });
    } catch (e) {
      // Ignored
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <TopBar screen={activeScreen} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TRIP_PURPLE, TRIP_BLUE]} />}
      >
        {/* Hero Banner with Search Controls */}
        <LinearGradient colors={["#581C87", "#7C3AED", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadgePill}>
              <Ionicons name="sparkles" size={12} color="#FACC15" />
              <Text style={styles.heroBadgeText}>FLIGHT + HOTEL PACKAGES</Text>
            </View>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE UP TO 30%</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Curated Escapes & Luxury Bundles</Text>
          <Text style={styles.heroSubtitle}>Flights, 5-Star Resorts, Airport Transfers & Guided Excursions all in one tap.</Text>

          {/* Search Box Card */}
          <View style={styles.searchBox}>
            {/* Origin & Destination Row */}
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

            {/* Travelers & Duration Row */}
            <View style={styles.searchRow}>
              {/* Travelers Stepper Opener */}
              <Pressable
                style={styles.searchFieldCol}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowTravelersModal(true);
                }}
              >
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="people-outline" size={13} color="#6B7280" />
                  <Text style={styles.fieldLabel}>TRAVELERS & ROOMS</Text>
                </View>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {travelers.adults} Adults{travelers.children > 0 ? `, ${travelers.children} Child` : ""} · {travelers.rooms} Rm
                </Text>
              </Pressable>

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
                  {DURATION_FILTERS.map((dur) => (
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

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORY_TABS.map((cat) => (
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

        {/* Results Counter & Search Filter Bar */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            Showing <Text style={{ fontWeight: "800", color: "#111827" }}>{filteredPackages.length}</Text> vacation packages
          </Text>
          <View style={styles.searchPillInput}>
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

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={TRIP_PURPLE} />
            <Text style={styles.loadingText}>Loading vacation packages from Supabase...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredPackages.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="airplane-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Packages Found</Text>
            <Text style={styles.emptySubtitle}>Try changing your destination, category tab, or duration filter.</Text>
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                setSelectedDestination("All Destinations");
                setActiveCategory("All Bundles");
                setActiveDuration("All");
                setSearchQuery("");
              }}
            >
              <Text style={styles.resetBtnText}>Reset All Filters</Text>
            </Pressable>
          </View>
        )}

        {/* Packages List */}
        {!loading &&
          filteredPackages.map((pkg) => {
            const isFav = wishlist.includes(pkg.id);
            const totalForTravelers = calculatePackageTotal(pkg);

            return (
              <Pressable key={pkg.id} style={styles.card} onPress={() => openDrawer(pkg)}>
                {/* Image Container with Badges & Wishlist */}
                <View style={styles.cardImageWrapper}>
                  <Image source={{ uri: pkg.image }} style={styles.cardImage} />
                  <LinearGradient colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />

                  {/* Top Badges */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.badgePill}>
                      <Text style={styles.badgeText}>{pkg.badge}</Text>
                    </View>
                    <Pressable
                      style={styles.cardHeartBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleWishlist(pkg.id);
                      }}
                    >
                      <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? "#EF4444" : "#FFFFFF"} />
                    </Pressable>
                  </View>

                  {/* Bottom Image Overlay Details */}
                  <View style={styles.cardImageBottom}>
                    <Text style={styles.cardTitle}>{pkg.name}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingText}>{pkg.rating}</Text>
                      </View>
                      <Text style={styles.reviewCountText}>({pkg.reviewsCount} reviews)</Text>
                      <Text style={styles.durationBullet}>·</Text>
                      <Text style={styles.durationText}>{pkg.duration}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Content Details */}
                <View style={styles.cardBody}>
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

                  {/* Inclusions Highlights */}
                  <View style={styles.highlightsContainer}>
                    {pkg.inclusions.slice(0, 3).map((inc, i) => (
                      <View key={i} style={styles.highlightItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.highlightText} numberOfLines={1}>
                          {inc}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Seats Left & Free Cancellation Notice */}
                  <View style={styles.perksRow}>
                    <View style={styles.seatsLeftBadge}>
                      <Ionicons name="people-outline" size={12} color="#DC2626" />
                      <Text style={styles.seatsLeftText}>Only {pkg.seatsLeft} slots left</Text>
                    </View>
                    <View style={styles.freeCancelBadge}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#059669" />
                      <Text style={styles.freeCancelText}>Free Cancellation</Text>
                    </View>
                  </View>

                  {/* Price & CTA Row */}
                  <View style={styles.cardFooter}>
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.origPriceText}>${pkg.originalPricePerPerson}</Text>
                        <Text style={styles.currentPriceText}>${pkg.pricePerPerson}</Text>
                        <Text style={styles.perPersonSub}>/ person</Text>
                      </View>
                      <Text style={styles.totalSumText}>
                        Total: <Text style={{ fontWeight: "700", color: "#111827" }}>${totalForTravelers}</Text> for {travelers.adults + travelers.children} guests
                      </Text>
                    </View>

                    <Pressable style={styles.viewDetailBtn} onPress={() => openDrawer(pkg)}>
                      <Text style={styles.viewDetailBtnText}>View Details</Text>
                      <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
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
              {/* Drawer Drag Bar & Header */}
              <View style={styles.drawerHandleBar} />
              <View style={styles.drawerHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
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
                {(["Overview", "Flights", "Hotel", "Itinerary", "Policy"] as const).map((tabKey) => (
                  <Pressable
                    key={tabKey}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveDetailTab(tabKey);
                    }}
                    style={[styles.drawerTabItem, activeDetailTab === tabKey && styles.drawerTabItemActive]}
                  >
                    <Text style={[styles.drawerTabItemText, activeDetailTab === tabKey && styles.drawerTabItemTextActive]}>{tabKey}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Drawer Tab Content */}
              <ScrollView style={styles.drawerScrollBody} showsVerticalScrollIndicator={false}>
                {/* 1. OVERVIEW TAB */}
                {activeDetailTab === "Overview" && (
                  <View style={styles.tabContent}>
                    {/* Big Hero Image */}
                    <Image source={{ uri: selectedPackage.image }} style={styles.drawerHeroImage} />

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

                    {/* What's Included Checklist */}
                    <Text style={styles.drawerSectionTitle}>Package Highlights & Inclusions</Text>
                    <View style={styles.inclusionsCard}>
                      {selectedPackage.inclusions.map((item, idx) => (
                        <View key={idx} style={styles.checkItemRow}>
                          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                          <Text style={styles.checkItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Add-ons Selector */}
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
                              <Text style={styles.addonPrice}>+${addon.pricePerPerson} / traveler</Text>
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

                {/* 2. FLIGHTS TAB */}
                {activeDetailTab === "Flights" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.drawerSectionTitle}>Flight Schedule & Allowance</Text>

                    <View style={styles.flightDetailCard}>
                      <View style={styles.flightCardHeader}>
                        <View style={styles.airlineBadge}>
                          <Ionicons name="airplane" size={16} color="#2563EB" />
                          <Text style={styles.airlineBadgeText}>{selectedPackage.flight.airline}</Text>
                        </View>
                        <Text style={styles.flightNumberText}>{selectedPackage.flight.flightNumber}</Text>
                      </View>

                      {/* Route Schematic */}
                      <View style={styles.routeSchematic}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={styles.airportCodeText}>{originAirport.code}</Text>
                          <Text style={styles.airportCitySub}>{originAirport.city}</Text>
                        </View>
                        <View style={styles.flightLineCenter}>
                          <Ionicons name="airplane" size={16} color="#2563EB" />
                          <View style={styles.dashedFlightLine} />
                          <Text style={styles.flightDurationLabel}>{selectedPackage.flight.duration} Nonstop</Text>
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
                          <Text style={styles.specSubHeading}>In-flight Perks</Text>
                          <Text style={styles.specSubVal}>Hot Meal & Refreshments</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.noticeBox}>
                      <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
                      <Text style={styles.noticeBoxText}>
                        Return flight from {selectedPackage.destinationCity} to {originAirport.city} is automatically booked on the same carrier on Day {selectedPackage.durationDays}.
                      </Text>
                    </View>
                  </View>
                )}

                {/* 3. HOTEL TAB */}
                {activeDetailTab === "Hotel" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.drawerSectionTitle}>Resort & Accommodation</Text>

                    <Image source={{ uri: selectedPackage.hotel.image }} style={styles.hotelPreviewImg} />

                    <View style={styles.hotelDetailsCard}>
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
                        <Text style={styles.roomTypePillText}>{selectedPackage.hotel.roomType} · {selectedPackage.hotel.bedSetup}</Text>
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

                {/* 4. ITINERARY TAB */}
                {activeDetailTab === "Itinerary" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.drawerSectionTitle}>Day-by-Day Journey</Text>

                    {selectedPackage.itinerary.map((day) => {
                      const isExpanded = expandedDay === day.dayNumber;
                      return (
                        <View key={day.dayNumber} style={styles.itineraryCard}>
                          <Pressable
                            style={styles.itineraryHeader}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setExpandedDay(isExpanded ? null : day.dayNumber);
                            }}
                          >
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
                            <View style={styles.itineraryBody}>
                              {day.morning && (
                                <View style={styles.timelineEvent}>
                                  <View style={styles.timeTag}>
                                    <Ionicons name="sunny-outline" size={12} color="#F59E0B" />
                                    <Text style={styles.timeTagText}>Morning</Text>
                                  </View>
                                  <Text style={styles.eventText}>{day.morning}</Text>
                                </View>
                              )}
                              {day.afternoon && (
                                <View style={styles.timelineEvent}>
                                  <View style={styles.timeTag}>
                                    <Ionicons name="partly-sunny-outline" size={12} color="#2563EB" />
                                    <Text style={styles.timeTagText}>Afternoon</Text>
                                  </View>
                                  <Text style={styles.eventText}>{day.afternoon}</Text>
                                </View>
                              )}
                              {day.evening && (
                                <View style={styles.timelineEvent}>
                                  <View style={styles.timeTag}>
                                    <Ionicons name="moon-outline" size={12} color="#7C3AED" />
                                    <Text style={styles.timeTagText}>Evening</Text>
                                  </View>
                                  <Text style={styles.eventText}>{day.evening}</Text>
                                </View>
                              )}
                              <View style={styles.mealsBadge}>
                                <Ionicons name="restaurant-outline" size={12} color="#059669" />
                                <Text style={styles.mealsBadgeText}>Meals: {day.mealsIncluded}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 5. POLICY TAB */}
                {activeDetailTab === "Policy" && (
                  <View style={styles.tabContent}>
                    <Text style={styles.drawerSectionTitle}>Cancellation & Travel Terms</Text>

                    <View style={styles.policyCard}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                        <Text style={styles.policyCardHeading}>Free Cancellation Guarantee</Text>
                      </View>
                      <Text style={styles.policyCardBody}>{selectedPackage.cancellationPolicy}</Text>
                    </View>

                    <Text style={[styles.drawerSectionTitle, { marginTop: 14 }]}>What's Excluded</Text>
                    <View style={styles.exclusionsCard}>
                      {selectedPackage.exclusions.map((exc, ei) => (
                        <View key={ei} style={styles.exclusionRow}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                          <Text style={styles.exclusionText}>{exc}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ height: 120 }} />
              </ScrollView>

              {/* Drawer Bottom Action Bar */}
              <View style={styles.drawerFooterBar}>
                <View>
                  <Text style={styles.footerTotalLabel}>Total for {travelers.adults + travelers.children} Guests:</Text>
                  <Text style={styles.footerTotalAmount}>
                    ${calculatePackageTotal(selectedPackage)} <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "normal" }}>({selectedPackage.currency})</Text>
                  </Text>
                </View>

                <Pressable
                  style={[styles.bookNowBtn, isBooking && { opacity: 0.7 }]}
                  disabled={isBooking}
                  onPress={() => handleBookNow(selectedPackage)}
                >
                  {isBooking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.bookNowBtnText}>Reserve Package</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* ORIGIN DEPARTURE AIRPORT MODAL                                       */}
      {/* ==================================================================== */}
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
              {DEPARTURE_AIRPORTS.filter((a) => a.city.toLowerCase().includes(airportSearchText.toLowerCase()) || a.code.toLowerCase().includes(airportSearchText.toLowerCase())).map((airport) => (
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
                  <View style={{ flex: 1, paddingLeft: 12 }}>
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

      {/* ==================================================================== */}
      {/* DESTINATION SELECTION MODAL                                          */}
      {/* ==================================================================== */}
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
              {DESTINATION_CITIES.filter((d) => d.name.toLowerCase().includes(destSearchText.toLowerCase())).map((dest) => (
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
                  <View style={{ flex: 1, paddingLeft: 12 }}>
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

      {/* ==================================================================== */}
      {/* TRAVELERS & ROOMS COUNTER MODAL                                      */}
      {/* ==================================================================== */}
      <Modal visible={showTravelersModal} transparent animationType="slide" onRequestClose={() => setShowTravelersModal(false)}>
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Travelers & Rooms</Text>
              <Pressable onPress={() => setShowTravelersModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            {/* Adults Counter */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperLabel}>Adults</Text>
                <Text style={styles.stepperSub}>Ages 12 and above</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  style={[styles.stepperBtn, travelers.adults <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => {
                    if (travelers.adults > 1) {
                      Haptics.selectionAsync();
                      setTravelers((p) => ({ ...p, adults: p.adults - 1 }));
                    }
                  }}
                >
                  <Ionicons name="remove" size={18} color={travelers.adults <= 1 ? "#D1D5DB" : "#111827"} />
                </Pressable>
                <Text style={styles.stepperValue}>{travelers.adults}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTravelers((p) => ({ ...p, adults: p.adults + 1 }));
                  }}
                >
                  <Ionicons name="add" size={18} color="#111827" />
                </Pressable>
              </View>
            </View>

            {/* Children Counter */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperLabel}>Children</Text>
                <Text style={styles.stepperSub}>Ages 2 to 11 (30% discount)</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  style={[styles.stepperBtn, travelers.children <= 0 && styles.stepperBtnDisabled]}
                  onPress={() => {
                    if (travelers.children > 0) {
                      Haptics.selectionAsync();
                      setTravelers((p) => ({ ...p, children: p.children - 1 }));
                    }
                  }}
                >
                  <Ionicons name="remove" size={18} color={travelers.children <= 0 ? "#D1D5DB" : "#111827"} />
                </Pressable>
                <Text style={styles.stepperValue}>{travelers.children}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTravelers((p) => ({ ...p, children: p.children + 1 }));
                  }}
                >
                  <Ionicons name="add" size={18} color="#111827" />
                </Pressable>
              </View>
            </View>

            {/* Rooms Counter */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperLabel}>Rooms</Text>
                <Text style={styles.stepperSub}>Hotel accommodation units</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  style={[styles.stepperBtn, travelers.rooms <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => {
                    if (travelers.rooms > 1) {
                      Haptics.selectionAsync();
                      setTravelers((p) => ({ ...p, rooms: p.rooms - 1 }));
                    }
                  }}
                >
                  <Ionicons name="remove" size={18} color={travelers.rooms <= 1 ? "#D1D5DB" : "#111827"} />
                </Pressable>
                <Text style={styles.stepperValue}>{travelers.rooms}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTravelers((p) => ({ ...p, rooms: p.rooms + 1 }));
                  }}
                >
                  <Ionicons name="add" size={18} color="#111827" />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowTravelersModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply Travelers</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AiPill color={TRIP_PURPLE} />
      <BottomNav active="Home" color={TRIP_PURPLE} />
    </SafeAreaView>
  );
}

// ============================================================================
// Stylesheet
// ============================================================================

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 22,
    padding: 18,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
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
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
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
    fontSize: 11,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchFieldCol: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  searchDividerVertical: {
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchDividerHorizontal: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  miniDurationPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniDurationPillActive: {
    backgroundColor: TRIP_PURPLE,
  },
  miniDurationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  miniDurationTextActive: {
    color: "#FFFFFF",
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  categoryTab: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryTabActive: {
    backgroundColor: TRIP_PURPLE,
    borderColor: TRIP_PURPLE,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  resultsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsCountText: {
    fontSize: 13,
    color: "#6B7280",
  },
  searchPillInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: 170,
    gap: 6,
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
    padding: 0,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImageWrapper: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardTopRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgePill: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FACC15",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardHeartBtn: {
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageBottom: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },
  reviewCountText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
  },
  durationBullet: {
    color: "rgba(255,255,255,0.7)",
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
  },
  dualPillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  flightPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  flightPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  hotelPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hotelPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6D28D9",
  },
  highlightsContainer: {
    gap: 5,
    marginBottom: 10,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  highlightText: {
    fontSize: 12,
    color: "#4B5563",
  },
  perksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  seatsLeftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seatsLeftText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  freeCancelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freeCancelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  origPriceText: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  currentPriceText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },
  perPersonSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  totalSumText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  viewDetailBtn: {
    backgroundColor: TRIP_PURPLE,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  viewDetailBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: TRIP_PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Modal / Drawer Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: SCREEN_HEIGHT * 0.88,
    overflow: "hidden",
  },
  drawerHandleBar: {
    width: 44,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  drawerHeaderTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  drawerHeaderSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  drawerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 8,
  },
  drawerTabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  drawerTabItemActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: TRIP_PURPLE,
  },
  drawerTabItemText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  drawerTabItemTextActive: {
    color: TRIP_PURPLE,
    fontWeight: "900",
  },
  drawerScrollBody: {
    flex: 1,
    paddingHorizontal: 18,
  },
  tabContent: {
    paddingTop: 16,
  },
  drawerHeroImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 14,
  },
  overviewQuickSpecs: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  specBox: {
    flex: 1,
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
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  drawerSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  inclusionsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 18,
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkItemText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  addonsList: {
    gap: 10,
    marginBottom: 16,
  },
  addonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
  },
  addonCardSelected: {
    borderColor: TRIP_PURPLE,
    backgroundColor: "#FAF5FF",
  },
  addonIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addonTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  addonDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  addonPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_PURPLE,
    marginTop: 4,
  },
  addonCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  addonCheckboxChecked: {
    backgroundColor: TRIP_PURPLE,
    borderColor: TRIP_PURPLE,
  },
  flightDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },
  flightCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  airlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  airlineBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  flightNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  routeSchematic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 14,
  },
  airportCodeText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  airportCitySub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  flightLineCenter: {
    flex: 1,
    alignItems: "center",
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
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  flightSpecsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  flightSpecItem: {
    width: "50%",
  },
  specSubHeading: {
    fontSize: 11,
    color: "#6B7280",
  },
  specSubVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
  },
  noticeBoxText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 17,
  },
  hotelPreviewImg: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    marginBottom: 12,
  },
  hotelDetailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },
  hotelNameTitle: {
    fontSize: 16,
    fontWeight: "900",
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
    marginTop: 4,
    marginBottom: 10,
  },
  roomTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  roomTypePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6D28D9",
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  itineraryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    overflow: "hidden",
  },
  itineraryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  dayBadge: {
    backgroundColor: TRIP_PURPLE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  dayTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  daySummaryText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  itineraryBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
    gap: 10,
  },
  timelineEvent: {
    gap: 3,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4B5563",
  },
  eventText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 17,
  },
  mealsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  mealsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  policyCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 14,
  },
  policyCardHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
  },
  policyCardBody: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 18,
  },
  exclusionsCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  exclusionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exclusionText: {
    fontSize: 12,
    color: "#991B1B",
    flex: 1,
  },
  drawerFooterBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerTotalLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  footerTotalAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: TRIP_PURPLE,
  },
  bookNowBtn: {
    backgroundColor: TRIP_PURPLE,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    backgroundColor: "#FAF5FF",
  },
  airportCodeBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  airportCodeBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1D4ED8",
  },
  pickerItemCity: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  pickerItemAirport: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  stepperSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },
  applyBtn: {
    backgroundColor: TRIP_PURPLE,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
