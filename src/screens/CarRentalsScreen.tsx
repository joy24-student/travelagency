import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { searchRepository } from "../services/repositories/search";
import { supabase } from "../utils/supabase";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const TRIP_ACCENT = "#FF7D00";
const ACCENT_GREEN = "#10B981";

// ============================================================================
// Types & Models
// ============================================================================

export type VehicleCategory =
  | "All"
  | "SUV"
  | "Economy"
  | "Electric / EV"
  | "Luxury"
  | "7-Seater Van";

export interface RentalVehicle {
  id: string;
  name: string;
  category: "SUV" | "Economy" | "Electric / EV" | "Luxury" | "7-Seater Van";
  badge: string;
  image: string;
  provider: string;
  rating: string;
  reviews: string;
  specs: {
    seats: number;
    gear: string;
    bags: number;
    ac: boolean;
  };
  features: string[];
  pricePerDay: number;
  totalPrice?: number;
  pickup_city?: string;
  is_live_db?: boolean;
}

export interface RentalLocation {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  type: "airport" | "downtown";
}

export const RENTAL_LOCATIONS: RentalLocation[] = [
  {
    id: "loc-dac",
    code: "DAC",
    name: "Hazrat Shahjalal International Airport (Terminal 1 & 2)",
    city: "Dhaka",
    country: "Bangladesh",
    type: "airport",
  },
  {
    id: "loc-dac-dt",
    code: "DAC-DT",
    name: "Dhaka Downtown (Gulshan & Banani Diplomatic Zone)",
    city: "Dhaka",
    country: "Bangladesh",
    type: "downtown",
  },
  {
    id: "loc-cxb",
    code: "CXB",
    name: "Cox's Bazar Airport (Arrival Concourse)",
    city: "Cox's Bazar",
    country: "Bangladesh",
    type: "airport",
  },
  {
    id: "loc-cxb-beach",
    code: "CXB-KL",
    name: "Cox's Bazar Kolatoli Beach Center",
    city: "Cox's Bazar",
    country: "Bangladesh",
    type: "downtown",
  },
  {
    id: "loc-dxb",
    code: "DXB",
    name: "Dubai International Airport (Terminal 3 Car Rental Concourse)",
    city: "Dubai",
    country: "United Arab Emirates",
    type: "airport",
  },
  {
    id: "loc-dxb-dt",
    code: "DXB-MR",
    name: "Dubai Marina & Downtown Hub",
    city: "Dubai",
    country: "United Arab Emirates",
    type: "downtown",
  },
  {
    id: "loc-bkk",
    code: "BKK",
    name: "Suvarnabhumi Airport Car Rental Center",
    city: "Bangkok",
    country: "Thailand",
    type: "airport",
  },
  {
    id: "loc-sin",
    code: "SIN",
    name: "Singapore Changi Airport (Terminal 2 Arrival Hall)",
    city: "Singapore",
    country: "Singapore",
    type: "airport",
  },
  {
    id: "loc-lhr",
    code: "LHR",
    name: "London Heathrow Airport (Terminals 2, 3 & 5 Hub)",
    city: "London",
    country: "United Kingdom",
    type: "airport",
  },
  {
    id: "loc-jfk",
    code: "JFK",
    name: "John F. Kennedy International Airport (Federal Circle Station)",
    city: "New York",
    country: "United States",
    type: "airport",
  },
];

const PERKS = [
  { icon: "shield-checkmark-outline" as const, text: "Zero Deposit" },
  { icon: "refresh-outline" as const, text: "Free 48h Cancel" },
  { icon: "card-outline" as const, text: "No Hidden Fees" },
  { icon: "headset-outline" as const, text: "24/7 Roadside Aid" },
];

export function CarRentalsScreen() {
  const { user } = useAuth();

  // Location States
  const [dropoffType, setDropoffType] = useState<"same" | "diff">("same");
  const [pickupLocation, setPickupLocation] = useState<RentalLocation>(RENTAL_LOCATIONS[0]);
  const [dropoffLocation, setDropoffLocation] = useState<RentalLocation>(RENTAL_LOCATIONS[2]);

  // Rental Period & Calculator States
  const [rentalDays, setRentalDays] = useState(3);
  const [pickupDateText, setPickupDateText] = useState("Thu, Oct 15");
  const [pickupTimeText, setPickupTimeText] = useState("10:00 AM");
  const [dropoffDateText, setDropoffDateText] = useState("Sun, Oct 18");
  const [dropoffTimeText, setDropoffTimeText] = useState("10:00 AM");

  // Driver Age State
  const [driverAgeValid, setDriverAgeValid] = useState(true);
  const [youngDriverFee, setYoungDriverFee] = useState(false);

  // Category & Fleet Filter States
  const [activeChip, setActiveChip] = useState<VehicleCategory>("All");
  const [dbVehicles, setDbVehicles] = useState<RentalVehicle[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);

  // Modals & Drawer States
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalMode, setLocationModalMode] = useState<"pickup" | "dropoff">("pickup");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedVehicleForDrawer, setSelectedVehicleForDrawer] = useState<RentalVehicle | null>(null);
  const [showSpecsDrawer, setShowSpecsDrawer] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  // Animations
  const drawerAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const filterChips: VehicleCategory[] = [
    "All",
    "SUV",
    "Economy",
    "Electric / EV",
    "Luxury",
    "7-Seater Van",
  ];

  // 1. Fetch Fleet from Supabase with Real-time Querying
  const fetchCarRentals = async () => {
    try {
      setLoadingCars(true);
      const data = await searchRepository.searchCarRentals({
        category: activeChip === "All" ? undefined : activeChip,
        pickupCity: pickupLocation.city,
      });

      if (data && data.length > 0) {
        const mapped: RentalVehicle[] = data.map((item: any) => ({
          id: item.id,
          name: item.vehicle_name,
          category: item.category as any,
          badge: item.badge || item.category,
          image: item.image_url || "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600",
          provider: item.provider,
          rating: (item.rating || 4.8).toString(),
          reviews: (item.reviews_count || 1200).toLocaleString(),
          specs: {
            seats: item.seats || 5,
            gear: item.gear_type || "Automatic",
            bags: item.bags_capacity || 2,
            ac: item.has_ac ?? true,
          },
          features: item.features || ["Zero Deposit", "Free Cancellation", "Unlimited Mileage"],
          pricePerDay: Number(item.price_per_day),
          pickup_city: item.pickup_city || pickupLocation.city,
          is_live_db: true,
        }));
        setDbVehicles(mapped);
      } else {
        // If city filter returned 0, query all available fleet from Supabase
        const allData = await searchRepository.searchCarRentals({
          category: activeChip === "All" ? undefined : activeChip,
        });
        if (allData && allData.length > 0) {
          const mapped: RentalVehicle[] = allData.map((item: any) => ({
            id: item.id,
            name: item.vehicle_name,
            category: item.category as any,
            badge: item.badge || item.category,
            image: item.image_url || "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600",
            provider: item.provider,
            rating: (item.rating || 4.8).toString(),
            reviews: (item.reviews_count || 1200).toLocaleString(),
            specs: {
              seats: item.seats || 5,
              gear: item.gear_type || "Automatic",
              bags: item.bags_capacity || 2,
              ac: item.has_ac ?? true,
            },
            features: item.features || ["Zero Deposit", "Free Cancellation", "Unlimited Mileage"],
            pricePerDay: Number(item.price_per_day),
            pickup_city: item.pickup_city || "All Fleet",
            is_live_db: true,
          }));
          setDbVehicles(mapped);
        } else {
          setDbVehicles([]);
        }
      }
    } catch (err) {
      console.log("Error querying Supabase car rentals:", err);
      setDbVehicles([]);
    } finally {
      setLoadingCars(false);
    }
  };

  useEffect(() => {
    fetchCarRentals();
  }, [activeChip, pickupLocation.city]);

  // Real-time Supabase Subscription on car_rentals table
  useEffect(() => {
    const channel = supabase
      .channel("car-rentals-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "car_rentals" },
        () => {
          fetchCarRentals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChip, pickupLocation.city]);

  // Drawer Animation Effects
  useEffect(() => {
    if (showSpecsDrawer) {
      Animated.parallel([
        Animated.spring(drawerAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSpecsDrawer]);

  const openSpecsDrawer = (vehicle: RentalVehicle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVehicleForDrawer(vehicle);
    setShowSpecsDrawer(true);
  };

  const closeSpecsDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSpecsDrawer(false);
  };

  // Location Handlers
  const openLocationModal = (mode: "pickup" | "dropoff") => {
    Haptics.selectionAsync();
    setLocationModalMode(mode);
    setLocationSearchQuery("");
    setShowLocationModal(true);
  };

  const handleSelectLocation = (loc: RentalLocation) => {
    Haptics.selectionAsync();
    if (locationModalMode === "pickup") {
      setPickupLocation(loc);
      if (dropoffType === "same") {
        setDropoffLocation(loc);
      }
    } else {
      setDropoffLocation(loc);
    }
    setShowLocationModal(false);
  };

  const handleSwapLocations = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevPickup = pickupLocation;
    setPickupLocation(dropoffLocation);
    setDropoffLocation(prevPickup);
  };

  // Price Calculation Helper
  const calculateVehiclePricing = (vehicle: RentalVehicle) => {
    const baseDaily = vehicle.pricePerDay;
    const baseTotal = baseDaily * rentalDays;
    const driverSurcharge = youngDriverFee ? rentalDays * 12 : 0;
    const taxes = Math.round((baseTotal + driverSurcharge) * 0.1);
    const finalTotal = baseTotal + driverSurcharge + taxes;
    return {
      baseDaily,
      baseTotal,
      driverSurcharge,
      taxes,
      finalTotal,
    };
  };

  // 5. Select Vehicle & Create Pending Booking -> Route to /screens/payments
  const handleBookVehicle = async (vehicle: RentalVehicle) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBookingInProgress(vehicle.id);

    try {
      const pricing = calculateVehiclePricing(vehicle);
      const effectiveDropoff = dropoffType === "same" ? pickupLocation : dropoffLocation;
      let bookingId = `draft-${Date.now()}`;
      let bookingRef = `BK-CAR-${Date.now().toString(36).toUpperCase()}`;

      // If user is authenticated in Supabase, create real pending booking in 'bookings' table
      if (user?.id) {
        try {
          const createdBooking = await bookingRepository.createBooking(user.id, {
            product_type: "car",
            status: "payment_pending",
            flow_step: "payment",
            origin_city: pickupLocation.city,
            destination_city: effectiveDropoff.city,
            destination_country: pickupLocation.country,
            start_date: new Date().toISOString().split("T")[0],
            end_date: new Date(Date.now() + rentalDays * 86400000).toISOString().split("T")[0],
            number_of_guests: vehicle.specs.seats,
            total_price: pricing.baseTotal,
            tax_amount: pricing.taxes,
            service_fee: pricing.driverSurcharge,
            final_price: pricing.finalTotal,
            currency: "USD",
            notes: `Car Rental: ${vehicle.name} (${vehicle.provider}) for ${rentalDays} day(s) from ${pickupLocation.code}`,
            booking_reference: bookingRef,
            cancellation_policy: {
              policy: "Free cancellation up to 48 hours before pick-up",
              coverage: "Full CDW & Theft Protection included",
            },
          });
          if (createdBooking?.id) {
            bookingId = createdBooking.id;
            bookingRef = createdBooking.booking_reference || bookingRef;
          }
        } catch (dbErr) {
          console.log("Local pending car booking created:", dbErr);
        }
      }

      if (showSpecsDrawer) {
        setShowSpecsDrawer(false);
      }

      // Route to /screens/payments with selected vehicle parameters
      router.push({
        pathname: "/screens/payments" as any,
        params: {
          bookingId: bookingId,
          reference: bookingRef,
          amount: pricing.finalTotal.toString(),
          currency: "USD",
          vehicleName: vehicle.name,
          provider: vehicle.provider,
          category: vehicle.category,
          pickupCity: pickupLocation.city,
          dropoffCity: effectiveDropoff.city,
          rentalDays: rentalDays.toString(),
          productType: "car",
        },
      });
    } catch (err: any) {
      console.error("Car rental booking error:", err);
    } finally {
      setBookingInProgress(null);
    }
  };

  // Filtered Locations for Modal Search
  const filteredLocations = useMemo(() => {
    const q = locationSearchQuery.trim().toLowerCase();
    if (!q) return RENTAL_LOCATIONS;
    return RENTAL_LOCATIONS.filter(
      (loc) =>
        loc.code.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.country.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q)
    );
  }, [locationSearchQuery]);
  const vehiclesToDisplay = dbVehicles;

  return (
    <SafeAreaView style={styles.shell}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200" }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(0,18,60,0.85)", "rgba(0,35,115,0.55)", "rgba(245,247,250,1)"]}
            style={styles.heroOverlay}
          >
            {/* Top Bar inside hero */}
            <View style={styles.topBarRow}>
              <Pressable
                style={styles.circleBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.canGoBack() ? router.back() : router.replace("/");
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={styles.brandBadge}>
                <Ionicons name="car-sport" size={16} color="#FFFFFF" />
                <Text style={styles.brandBadgeText}>Car Rental Global Fleet</Text>
              </View>

              <Pressable
                style={styles.goldBadge}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/screens/rewards" as any);
                }}
              >
                <Text style={styles.goldBadgeText}>T</Text>
              </Pressable>
            </View>

            {/* Headline */}
            <View style={styles.heroTitleBox}>
              <Text style={styles.heroMainTitle}>Rent a Car with{"\n"}Complete Confidence</Text>
              <Text style={styles.heroSubTitle}>
                Zero deposit, unlimited mileage & free cancellation on top rental brands
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Elevated Booking Search Card */}
        <View style={styles.bookingCard}>
          {/* Drop-off Location Toggle (Same vs Different) */}
          <View style={styles.dropoffTabs}>
            <Pressable
              style={[styles.dropoffTab, dropoffType === "same" && styles.dropoffTabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setDropoffType("same");
                setDropoffLocation(pickupLocation);
              }}
            >
              <Text style={[styles.dropoffTabText, dropoffType === "same" && styles.dropoffTabTextActive]}>
                Return to same location
              </Text>
            </Pressable>
            <Pressable
              style={[styles.dropoffTab, dropoffType === "diff" && styles.dropoffTabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setDropoffType("diff");
              }}
            >
              <Text style={[styles.dropoffTabText, dropoffType === "diff" && styles.dropoffTabTextActive]}>
                Return to different location
              </Text>
            </Pressable>
          </View>

          {/* Pick-up Location Field */}
          <Pressable style={styles.inputFieldGroup} onPress={() => openLocationModal("pickup")}>
            <View style={styles.inputIconCircle}>
              <Ionicons name="location" size={18} color={TRIP_BLUE} />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputFieldLabel}>Pick-up Location</Text>
              <View style={styles.locationTitleRow}>
                <Text style={styles.inputTextBold}>{pickupLocation.city}</Text>
                <View style={styles.locationCodeBadge}>
                  <Text style={styles.locationCodeText}>{pickupLocation.code}</Text>
                </View>
              </View>
              <Text style={styles.inputSubText} numberOfLines={1}>
                {pickupLocation.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          {/* Different Drop-off Field if active */}
          {dropoffType === "diff" && (
            <>
              <View style={styles.locationDividerRow}>
                <View style={styles.locDividerLine} />
                <Pressable style={styles.swapLocationsBtn} onPress={handleSwapLocations}>
                  <Ionicons name="swap-vertical" size={16} color={TRIP_BLUE} />
                </Pressable>
                <View style={styles.locDividerLine} />
              </View>

              <Pressable style={styles.inputFieldGroup} onPress={() => openLocationModal("dropoff")}>
                <View style={[styles.inputIconCircle, { backgroundColor: "#FFF7ED" }]}>
                  <Ionicons name="flag" size={18} color="#EA580C" />
                </View>
                <View style={styles.inputContent}>
                  <Text style={styles.inputFieldLabel}>Drop-off Location</Text>
                  <View style={styles.locationTitleRow}>
                    <Text style={styles.inputTextBold}>{dropoffLocation.city}</Text>
                    <View style={[styles.locationCodeBadge, { backgroundColor: "#FFEDD5" }]}>
                      <Text style={[styles.locationCodeText, { color: "#C2410C" }]}>{dropoffLocation.code}</Text>
                    </View>
                  </View>
                  <Text style={styles.inputSubText} numberOfLines={1}>
                    {dropoffLocation.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </>
          )}

          {/* Date & Time Selection Row (Period Calculator Trigger) */}
          <Pressable style={styles.dateTimeGrid} onPress={() => setShowPeriodModal(true)}>
            <View style={styles.dateTimeBox}>
              <Text style={styles.dateTimeLabel}>Pick-up</Text>
              <Text style={styles.dateTimeValue}>{pickupDateText}</Text>
              <Text style={styles.dateTimeSub}>{pickupTimeText}</Text>
            </View>

            <View style={styles.durationPill}>
              <Ionicons name="time-outline" size={12} color={TRIP_BLUE} />
              <Text style={styles.durationPillText}>{rentalDays} Days</Text>
            </View>

            <View style={[styles.dateTimeBox, { alignItems: "flex-end" }]}>
              <Text style={styles.dateTimeLabel}>Drop-off</Text>
              <Text style={styles.dateTimeValue}>{dropoffDateText}</Text>
              <Text style={styles.dateTimeSub}>{dropoffTimeText}</Text>
            </View>
          </Pressable>

          {/* Driver Age Toggle Row */}
          <View style={styles.driverAgeRow}>
            <View style={styles.driverAgeLeft}>
              <Ionicons name="person-circle-outline" size={22} color="#4B5563" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.driverAgeText}>Driver aged 25 - 70</Text>
                <Text style={styles.driverAgeSubText}>
                  {driverAgeValid ? "Standard rate · No young driver fee" : "Ages 21-24 (+ $12/day fee applies)"}
                </Text>
              </View>
            </View>
            <Switch
              value={driverAgeValid}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDriverAgeValid(val);
                setYoungDriverFee(!val);
              }}
              trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
              thumbColor={driverAgeValid ? TRIP_BLUE : "#F3F4F6"}
            />
          </View>

          {/* Search Button */}
          <Pressable
            style={styles.searchSubmitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              fetchCarRentals();
            }}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.searchSubmitBtnText}>Search Available Fleet</Text>
          </Pressable>
        </View>

        {/* Benefits & Trust Badges Strip */}
        <View style={styles.perksStrip}>
          {PERKS.map((perk, i) => (
            <View key={i} style={styles.perkItem}>
              <Ionicons name={perk.icon} size={16} color={TRIP_BLUE} />
              <Text style={styles.perkText}>{perk.text}</Text>
            </View>
          ))}
        </View>

        {/* Category Filter Chips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fleet Categories</Text>
          <Text style={styles.sectionCount}>{vehiclesToDisplay.length} available</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          {filterChips.map((chip) => {
            const isSelected = activeChip === chip;
            return (
              <Pressable
                key={chip}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveChip(chip);
                }}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Fleet Listings */}
        <View style={styles.fleetList}>
          {loadingCars ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={TRIP_BLUE} />
              <Text style={styles.loadingText}>Loading fleet from Supabase...</Text>
            </View>
          ) : vehiclesToDisplay.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
              <Ionicons name="car-outline" size={48} color="#CBD5E1" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#475569", marginTop: 12 }}>No vehicles found</Text>
              <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 4 }}>Try selecting a different car category or pickup city.</Text>
            </View>
          ) : (
            vehiclesToDisplay.map((vehicle: RentalVehicle) => {
              const pricing = calculateVehiclePricing(vehicle);
              const isBookingThis = bookingInProgress === vehicle.id;

              return (
                <Pressable
                  key={vehicle.id}
                  style={styles.carCard}
                  onPress={() => openSpecsDrawer(vehicle)}
                >
                  <View style={styles.carTopRow}>
                    <View style={styles.carBadgeTag}>
                      <Text style={styles.carBadgeText}>{vehicle.badge}</Text>
                    </View>
                    <View style={styles.providerBadge}>
                      <Text style={styles.providerText}>{vehicle.provider}</Text>
                    </View>
                  </View>

                  <View style={styles.carContentRow}>
                    <View style={styles.carInfoCol}>
                      <Text style={styles.carName}>{vehicle.name}</Text>

                      <View style={styles.carRatingRow}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.ratingNumber}>{vehicle.rating}</Text>
                        <Text style={styles.reviewCount}>({vehicle.reviews})</Text>
                      </View>

                      {/* Vehicle Specs Badges */}
                      <View style={styles.specsRow}>
                        <View style={styles.specBadge}>
                          <Ionicons name="person-outline" size={12} color="#6B7280" />
                          <Text style={styles.specText}>{vehicle.specs.seats}</Text>
                        </View>
                        <View style={styles.specBadge}>
                          <Ionicons name="hardware-chip-outline" size={12} color="#6B7280" />
                          <Text style={styles.specText}>{vehicle.specs.gear}</Text>
                        </View>
                        <View style={styles.specBadge}>
                          <Ionicons name="briefcase-outline" size={12} color="#6B7280" />
                          <Text style={styles.specText}>{vehicle.specs.bags}</Text>
                        </View>
                      </View>
                    </View>

                    <Image source={{ uri: vehicle.image }} style={styles.carImage} resizeMode="cover" />
                  </View>

                  {/* Highlights */}
                  <View style={styles.featuresRow}>
                    {vehicle.features.map((feat: string, idx: number) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={styles.featureText}>{feat}</Text>
                      </View>
                    ))}
                    {vehicle.is_live_db && (
                      <View style={[styles.featureItem, { backgroundColor: "#ECFDF5" }]}>
                        <Ionicons name="cloud-done" size={13} color={ACCENT_GREEN} />
                        <Text style={[styles.featureText, { color: ACCENT_GREEN }]}>Verified DB</Text>
                      </View>
                    )}
                  </View>

                  {/* Price & Action Buttons */}
                  <View style={styles.cardBottomRow}>
                    <View>
                      <View style={styles.priceLine}>
                        <Text style={styles.priceDaily}>${vehicle.pricePerDay}</Text>
                        <Text style={styles.priceUnit}> / day</Text>
                      </View>
                      <Text style={styles.totalPriceText}>
                        Total: ${pricing.finalTotal} for {rentalDays} days
                      </Text>
                    </View>

                    <View style={styles.actionBtnGroup}>
                      <Pressable style={styles.viewSpecsBtn} onPress={() => openSpecsDrawer(vehicle)}>
                        <Text style={styles.viewSpecsBtnText}>Specs</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.bookBtn, isBookingThis && { opacity: 0.7 }]}
                        disabled={isBookingThis}
                        onPress={() => handleBookVehicle(vehicle)}
                      >
                        {isBookingThis ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Text style={styles.bookBtnText}>Book Now</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating AI Pill & Bottom Nav */}
      <AiPill color={TRIP_BLUE} />
      <BottomNav active="Home" color={TRIP_BLUE} />

      {/* =========================================================================
          2. Interactive Pick-up & Drop-off Location Modal
         ========================================================================= */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <SafeAreaView style={styles.modalShell}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowLocationModal(false);
              }}
            >
              <Ionicons name="close" size={22} color="#1F2937" />
            </Pressable>
            <Text style={styles.modalTitle}>
              Select {locationModalMode === "pickup" ? "Pick-up" : "Drop-off"} Location
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search airport code (DAC, CXB, DXB...) or city"
              placeholderTextColor="#9CA3AF"
              value={locationSearchQuery}
              onChangeText={setLocationSearchQuery}
              autoCapitalize="words"
            />
            {locationSearchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLocationSearchQuery("");
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Quick Hub Filter Chips */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsSectionLabel}>Top Rental Hubs:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {["DAC", "CXB", "DXB", "BKK", "SIN", "LHR", "JFK"].map((code) => {
                const target = RENTAL_LOCATIONS.find((l) => l.code === code);
                const isSelected =
                  (locationModalMode === "pickup" ? pickupLocation.code : dropoffLocation.code) === code;

                return (
                  <Pressable
                    key={code}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => {
                      if (target) handleSelectLocation(target);
                    }}
                  >
                    <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>{code}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Locations List */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.locationList}>
            {filteredLocations.map((loc) => {
              const isSelected =
                (locationModalMode === "pickup" ? pickupLocation.id : dropoffLocation.id) === loc.id;

              return (
                <Pressable
                  key={loc.id}
                  style={[styles.locationItemRow, isSelected && styles.locationItemRowActive]}
                  onPress={() => handleSelectLocation(loc)}
                >
                  <View style={[styles.locIconCircle, isSelected && styles.locIconCircleActive]}>
                    <Ionicons
                      name={loc.type === "airport" ? "airplane-outline" : "business-outline"}
                      size={20}
                      color={isSelected ? "#FFFFFF" : TRIP_BLUE}
                    />
                  </View>

                  <View style={styles.locDetailsCol}>
                    <View style={styles.locTitleRow}>
                      <Text style={styles.locCityText}>{loc.city}</Text>
                      <View style={styles.locCodeBadge}>
                        <Text style={styles.locCodeText}>{loc.code}</Text>
                      </View>
                    </View>
                    <Text style={styles.locFullNameText} numberOfLines={1}>
                      {loc.name}
                    </Text>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={TRIP_BLUE} style={{ marginLeft: 8 }} />
                  )}
                </Pressable>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          3. Interactive Rental Period Calculator Modal
         ========================================================================= */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowPeriodModal(false)} />
          <View style={styles.periodSheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetHeaderTitle}>Rental Period Calculator</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPeriodModal(false);
                }}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            {/* Quick Duration Presets */}
            <Text style={styles.sheetSectionTitle}>Quick Rental Duration</Text>
            <View style={styles.durationPresetsGrid}>
              {[
                { days: 1, label: "1 Day (24 hrs)" },
                { days: 3, label: "3 Days (Weekend)" },
                { days: 5, label: "5 Days (Workweek)" },
                { days: 7, label: "7 Days (Save 10%)" },
                { days: 14, label: "14 Days (Extended)" },
              ].map((preset) => {
                const isSelected = rentalDays === preset.days;
                return (
                  <Pressable
                    key={preset.days}
                    style={[styles.presetCard, isSelected && styles.presetCardActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRentalDays(preset.days);
                    }}
                  >
                    <Text style={[styles.presetDaysNumber, isSelected && styles.presetDaysNumberActive]}>
                      {preset.days} {preset.days === 1 ? "Day" : "Days"}
                    </Text>
                    <Text style={styles.presetLabelText}>{preset.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pick-up / Drop-off Time Selectors */}
            <Text style={[styles.sheetSectionTitle, { marginTop: 18 }]}>Preferred Time Slots</Text>
            <View style={styles.timeSlotsRow}>
              {["08:00 AM", "10:00 AM", "01:00 PM", "05:00 PM"].map((t) => (
                <Pressable
                  key={t}
                  style={[styles.timeSlotBtn, pickupTimeText === t && styles.timeSlotBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPickupTimeText(t);
                    setDropoffTimeText(t);
                  }}
                >
                  <Text style={[styles.timeSlotBtnText, pickupTimeText === t && styles.timeSlotBtnTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Footer Apply */}
            <View style={styles.sheetFooter}>
              <View>
                <Text style={styles.sheetSummaryLabel}>Total Duration</Text>
                <Text style={styles.sheetSummaryVal}>{rentalDays} Days Selected</Text>
              </View>
              <Pressable
                style={styles.applyBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowPeriodModal(false);
                }}
              >
                <Text style={styles.applyBtnText}>Update Pricing</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          4. Expandable Vehicle Specs & Policy Drawer
         ========================================================================= */}
      <Modal
        visible={showSpecsDrawer}
        transparent={true}
        animationType="none"
        onRequestClose={closeSpecsDrawer}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSpecsDrawer} />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawerSheet,
              {
                transform: [{ translateY: drawerAnim }],
              },
            ]}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.sheetHandle} />

              {selectedVehicleForDrawer && (
                <>
                  {/* Drawer Header */}
                  <View style={styles.drawerHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.drawerCarTitle}>{selectedVehicleForDrawer.name}</Text>
                      <Text style={styles.drawerCarCategory}>
                        {selectedVehicleForDrawer.category} · Provided by {selectedVehicleForDrawer.provider}
                      </Text>
                    </View>
                    <Pressable style={styles.drawerCloseCircle} onPress={closeSpecsDrawer}>
                      <Ionicons name="close" size={20} color="#374151" />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerScroll}>
                    {/* Vehicle Hero Image */}
                    <Image
                      source={{ uri: selectedVehicleForDrawer.image }}
                      style={styles.drawerHeroImage}
                      resizeMode="cover"
                    />

                    {/* Specs Grid */}
                    <View style={styles.drawerSectionBox}>
                      <Text style={styles.drawerBoxTitle}>Vehicle Specifications</Text>
                      <View style={styles.specsGrid}>
                        <View style={styles.specBox}>
                          <Ionicons name="people-outline" size={20} color={TRIP_BLUE} />
                          <Text style={styles.specBoxVal}>{selectedVehicleForDrawer.specs.seats} Seats</Text>
                          <Text style={styles.specBoxLabel}>Adult capacity</Text>
                        </View>
                        <View style={styles.specBox}>
                          <Ionicons name="hardware-chip-outline" size={20} color={TRIP_BLUE} />
                          <Text style={styles.specBoxVal}>{selectedVehicleForDrawer.specs.gear}</Text>
                          <Text style={styles.specBoxLabel}>Transmission</Text>
                        </View>
                        <View style={styles.specBox}>
                          <Ionicons name="briefcase-outline" size={20} color={TRIP_BLUE} />
                          <Text style={styles.specBoxVal}>{selectedVehicleForDrawer.specs.bags} Bags</Text>
                          <Text style={styles.specBoxLabel}>Luggage capacity</Text>
                        </View>
                        <View style={styles.specBox}>
                          <Ionicons name="snow-outline" size={20} color={TRIP_BLUE} />
                          <Text style={styles.specBoxVal}>Dual AC</Text>
                          <Text style={styles.specBoxLabel}>Climate control</Text>
                        </View>
                      </View>
                    </View>

                    {/* Protection & Insurance Box */}
                    <View style={styles.drawerSectionBox}>
                      <View style={styles.sectionTitleRow}>
                        <Ionicons name="shield-checkmark" size={18} color={ACCENT_GREEN} />
                        <Text style={styles.drawerBoxTitle}>Protection & Insurance Included</Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="checkmark-done" size={16} color={ACCENT_GREEN} />
                        <Text style={styles.policyText}>
                          Collision Damage Waiver (CDW) with zero excess option available at pickup.
                        </Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="checkmark-done" size={16} color={ACCENT_GREEN} />
                        <Text style={styles.policyText}>
                          Theft Protection (TP) and third-party liability insurance up to $1M.
                        </Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="checkmark-done" size={16} color={ACCENT_GREEN} />
                        <Text style={styles.policyText}>
                          24/7 Roadside breakdown assistance and vehicle replacement coverage.
                        </Text>
                      </View>
                    </View>

                    {/* Policies & Fuel Rules */}
                    <View style={styles.drawerSectionBox}>
                      <Text style={styles.drawerBoxTitle}>Rental Rules & Policies</Text>
                      <View style={styles.ruleItem}>
                        <Ionicons name="speedometer-outline" size={16} color="#4B5563" />
                        <Text style={styles.ruleItemText}>Unlimited Mileage: Drive as far as you wish.</Text>
                      </View>
                      <View style={styles.ruleItem}>
                        <Ionicons name="water-outline" size={16} color="#4B5563" />
                        <Text style={styles.ruleItemText}>
                          Full-to-Full Fuel Policy: Return with the same level of fuel to avoid charges.
                        </Text>
                      </View>
                      <View style={styles.ruleItem}>
                        <Ionicons name="refresh-outline" size={16} color="#4B5563" />
                        <Text style={styles.ruleItemText}>
                          Free Cancellation up to 48 hours prior to scheduled pick-up time.
                        </Text>
                      </View>
                    </View>

                    {/* Pricing Breakdown Card */}
                    {(() => {
                      const pricing = calculateVehiclePricing(selectedVehicleForDrawer);
                      return (
                        <View style={styles.drawerFareCard}>
                          <Text style={styles.fareCardTitle}>Price Breakdown ({rentalDays} Days)</Text>
                          <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>
                              Base Rate (${pricing.baseDaily}/day x {rentalDays} days)
                            </Text>
                            <Text style={styles.fareVal}>${pricing.baseTotal}</Text>
                          </View>
                          {pricing.driverSurcharge > 0 && (
                            <View style={styles.fareRow}>
                              <Text style={styles.fareLabel}>Young Driver Surcharge</Text>
                              <Text style={styles.fareVal}>${pricing.driverSurcharge}</Text>
                            </View>
                          )}
                          <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>Taxes & Airport Concession (10%)</Text>
                            <Text style={styles.fareVal}>${pricing.taxes}</Text>
                          </View>
                          <View style={styles.fareDivider} />
                          <View style={styles.fareRow}>
                            <Text style={styles.fareTotalLabel}>Total Amount Due (USD)</Text>
                            <Text style={styles.fareTotalVal}>${pricing.finalTotal}</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </ScrollView>

                  {/* Drawer Footer CTA */}
                  <View style={styles.drawerFooterBar}>
                    {(() => {
                      const pricing = calculateVehiclePricing(selectedVehicleForDrawer);
                      const isSelected = bookingInProgress === selectedVehicleForDrawer.id;
                      return (
                        <>
                          <View>
                            <Text style={styles.footerPriceLabel}>Total for {rentalDays} Days</Text>
                            <Text style={styles.footerPriceValue}>${pricing.finalTotal} USD</Text>
                          </View>
                          <Pressable
                            style={[styles.reserveCTAButton, isSelected && { opacity: 0.7 }]}
                            disabled={isSelected}
                            onPress={() => handleBookVehicle(selectedVehicleForDrawer)}
                          >
                            {isSelected ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Text style={styles.reserveCTAButtonText}>Select & Reserve Vehicle</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                              </>
                            )}
                          </Pressable>
                        </>
                      );
                    })()}
                  </View>
                </>
              )}
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// Stylesheet
// ============================================================================

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    height: 230,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  brandBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  goldBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TRIP_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  goldBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  heroTitleBox: {
    marginTop: 18,
  },
  heroMainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 28,
  },
  heroSubTitle: {
    fontSize: 12,
    color: "#E2E8F0",
    marginTop: 4,
    lineHeight: 16,
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -38,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  dropoffTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
    marginBottom: 10,
    gap: 8,
  },
  dropoffTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dropoffTabActive: {
    backgroundColor: "#EFF6FF",
  },
  dropoffTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  dropoffTabTextActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  inputFieldGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 4,
  },
  inputIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  inputContent: {
    flex: 1,
  },
  inputFieldLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  inputTextBold: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  locationCodeBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  inputSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  locationDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  locDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  swapLocationsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  dateTimeGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateTimeBox: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  dateTimeSub: {
    fontSize: 11,
    color: TRIP_BLUE,
    fontWeight: "700",
    marginTop: 1,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  driverAgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  driverAgeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  driverAgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F2937",
  },
  driverAgeSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  searchSubmitBtn: {
    backgroundColor: TRIP_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  perksStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  perkItem: {
    alignItems: "center",
    gap: 4,
  },
  perkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sectionCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  filterChipRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  fleetList: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: 14,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  carCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  carTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  carBadgeTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  carBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  providerBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },
  carContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  carInfoCol: {
    flex: 1,
    paddingRight: 10,
  },
  carName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  carRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
  },
  reviewCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  specBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  specText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  carImage: {
    width: 120,
    height: 80,
    borderRadius: 10,
  },
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginTop: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featureText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  priceLine: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceDaily: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  priceUnit: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  totalPriceText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 2,
  },
  actionBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewSpecsBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  viewSpecsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  bookBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Modal Common Styles
  modalShell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  chipsSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chipsSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
  },
  chipBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipBtnActive: {
    backgroundColor: TRIP_BLUE,
  },
  chipBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  chipBtnTextActive: {
    color: "#FFFFFF",
  },
  locationList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  locationItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  locationItemRowActive: {
    backgroundColor: "#EFF6FF",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  locIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  locIconCircleActive: {
    backgroundColor: TRIP_BLUE,
  },
  locDetailsCol: {
    flex: 1,
  },
  locTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locCityText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  locCodeBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  locFullNameText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Period Calculator Sheet Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  periodSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetHeaderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  durationPresetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  presetCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: TRIP_BLUE,
  },
  presetDaysNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1F2937",
  },
  presetDaysNumberActive: {
    color: TRIP_BLUE,
  },
  presetLabelText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  timeSlotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  timeSlotBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  timeSlotBtnActive: {
    backgroundColor: TRIP_BLUE,
  },
  timeSlotBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  timeSlotBtnTextActive: {
    color: "#FFFFFF",
  },
  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  sheetSummaryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  sheetSummaryVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // Specs Drawer Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawerSheet: {
    height: SCREEN_HEIGHT * 0.88,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  drawerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  drawerCarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  drawerCarCategory: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },
  drawerCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerScroll: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  drawerHeroImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    marginBottom: 16,
  },
  drawerSectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  drawerBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  specsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  specBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  specBoxVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 4,
  },
  specBoxLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginVertical: 4,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  ruleItemText: {
    fontSize: 12,
    color: "#475569",
  },
  drawerFareCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  fareCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 10,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  fareLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  fareVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  fareDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 8,
  },
  fareTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  fareTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: TRIP_BLUE,
  },
  drawerFooterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  footerPriceLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  footerPriceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  reserveCTAButton: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  reserveCTAButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
