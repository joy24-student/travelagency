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
const TRIP_BLUE = "#287dfa";
const ACCENT_ORANGE = "#ff7d00";
const ACCENT_GREEN = "#10b981";

// ============================================================================
// Types & Catalogs
// ============================================================================

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode?: string;
  id?: string;
}

export type CabinClassType = "Economy" | "Premium Economy" | "Business" | "First";

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightItem {
  id: string;
  flight_number: string;
  airline_id?: string;
  departure_airport_id?: string;
  arrival_airport_id?: string;
  departure_time: string;
  arrival_time: string;
  flight_duration: number; // in minutes
  stops: number;
  aircraft_type: string;
  cabin_class: CabinClassType;
  base_price: number;
  currency: string;
  total_seats: number;
  available_seats: number;
  baggage_allowance?: string;
  amenities?: string[];
  layover_info?: string;
  cancellation_policy?: string;
  is_live_db?: boolean;
  departure_airport?: {
    id?: string;
    iata_code: string;
    name: string;
    city: string;
    country?: string;
  };
  arrival_airport?: {
    id?: string;
    iata_code: string;
    name: string;
    city: string;
    country?: string;
  };
  airline?: {
    id?: string;
    name: string;
    iata_code?: string;
    logo_url?: string;
  };
}

// Key international hub airports required for selector & search filtering
export const POPULAR_AIRPORTS: Airport[] = [
  {
    code: "DAC",
    name: "Hazrat Shahjalal International Airport",
    city: "Dhaka",
    country: "Bangladesh",
    countryCode: "BD",
  },
  {
    code: "BKK",
    name: "Suvarnabhumi Airport",
    city: "Bangkok",
    country: "Thailand",
    countryCode: "TH",
  },
  {
    code: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
  },
  {
    code: "SIN",
    name: "Singapore Changi Airport",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
  },
  {
    code: "LHR",
    name: "London Heathrow Airport",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
  },
  {
    code: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "PVG",
    name: "Shanghai Pudong International Airport",
    city: "Shanghai",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "PEK",
    name: "Beijing Capital International Airport",
    city: "Beijing",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "HND",
    name: "Tokyo Haneda Airport",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
  },
  {
    code: "CXB",
    name: "Cox's Bazar Airport",
    city: "Cox's Bazar",
    country: "Bangladesh",
    countryCode: "BD",
  },
  {
    code: "KUL",
    name: "Kuala Lumpur International Airport",
    city: "Kuala Lumpur",
    country: "Malaysia",
    countryCode: "MY",
  },
  {
    code: "DOH",
    name: "Hamad International Airport",
    city: "Doha",
    country: "Qatar",
    countryCode: "QA",
  },
];

export const CABIN_CLASSES: {
  id: CabinClassType;
  title: string;
  subtitle: string;
  multiplier: number;
  badge: string;
}[] = [
  {
    id: "Economy",
    title: "Economy",
    subtitle: "Standard comfort & best value fare",
    multiplier: 1.0,
    badge: "Best Value",
  },
  {
    id: "Premium Economy",
    title: "Premium Economy",
    subtitle: "Extra 7\" legroom & priority boarding",
    multiplier: 1.45,
    badge: "Extra Comfort",
  },
  {
    id: "Business",
    title: "Business",
    subtitle: "180° Lie-flat bed, lounge & fine dining",
    multiplier: 2.3,
    badge: "Popular VIP",
  },
  {
    id: "First",
    title: "First",
    subtitle: "Private luxury suite & chauffeur service",
    multiplier: 3.8,
    badge: "Ultimate Luxury",
  },
];

export function FlightsScreen() {
  const { user } = useAuth();

  // Tab & Route States
  const [activeTab, setActiveTab] = useState<"One-way" | "Round-trip" | "Multi-city">("One-way");
  const [originAirport, setOriginAirport] = useState<Airport>(POPULAR_AIRPORTS[0]); // DAC
  const [destAirport, setDestAirport] = useState<Airport>(POPULAR_AIRPORTS[1]); // BKK
  const [selectedDate, setSelectedDate] = useState("Tue, Jun 16, 2026");
  const [returnDate, setReturnDate] = useState("Sun, Jun 21, 2026");

  // Passenger & Class States
  const [passengers, setPassengers] = useState<PassengerCounts>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [cabinClass, setCabinClass] = useState<CabinClassType>("Economy");
  const [bundleHotel, setBundleHotel] = useState(false);

  // Flight Data & Real-time Query States
  const [liveFlights, setLiveFlights] = useState<FlightItem[]>([]);
  const [liveInspirations, setLiveInspirations] = useState<{ from: string; to: string; price: string; time: string; carrier: string }[]>([]);
  const [allDbAirports, setAllDbAirports] = useState<Airport[]>(POPULAR_AIRPORTS);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Drawer States
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [airportModalMode, setAirportModalMode] = useState<"departure" | "arrival">("departure");
  const [airportSearchQuery, setAirportSearchQuery] = useState("");

  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [tempPassengers, setTempPassengers] = useState<PassengerCounts>({ ...passengers });
  const [tempCabinClass, setTempCabinClass] = useState<CabinClassType>(cabinClass);

  const [selectedFlightForDetails, setSelectedFlightForDetails] = useState<FlightItem | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  // Animation values
  const drawerAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // 1. Fetch DB Airports & Route Inspirations on Mount
  useEffect(() => {
    async function loadAirportsAndRoutes() {
      try {
        const { data, error } = await supabase.from("airports").select("*");
        if (data && data.length > 0) {
          const merged: Airport[] = [...POPULAR_AIRPORTS];
          data.forEach((dbA: any) => {
            const exists = merged.some((a) => a.code.toUpperCase() === dbA.iata_code?.toUpperCase());
            if (!exists && dbA.iata_code) {
              merged.push({
                id: dbA.id,
                code: dbA.iata_code,
                name: dbA.name || `${dbA.city} International`,
                city: dbA.city || dbA.iata_code,
                country: dbA.country || "",
                countryCode: dbA.country_code || "",
              });
            }
          });
          setAllDbAirports(merged);
        }

        // Fetch verified flight route inspirations from Supabase flights inventory
        const { data: routeData } = await supabase.from("flights").select(`
          base_price,
          flight_duration,
          departure_airport:departure_airport_id (iata_code),
          arrival_airport:arrival_airport_id (iata_code),
          airline:airline_id (name)
        `).limit(6);

        if (routeData && routeData.length > 0) {
          const liveRoutes = routeData.map((r: any) => ({
            from: r.departure_airport?.iata_code || "DAC",
            to: r.arrival_airport?.iata_code || "CXB",
            price: `$${r.base_price}`,
            time: `${Math.floor((r.flight_duration || 60) / 60)}h ${(r.flight_duration || 60) % 60}m`,
            carrier: r.airline?.name || "Airline",
          }));
          setLiveInspirations(liveRoutes);
        }
      } catch (err) {
        console.log("Using standard airport catalog:", err);
      }
    }
    loadAirportsAndRoutes();
  }, []);

  // 2. Fetch Flights from Supabase & Route Querying
  const fetchLiveFlights = async () => {
    setLoading(true);
    try {
      // Query Supabase flights table
      const dbData = await searchRepository.searchFlights({
        departureAirportCode: originAirport.code,
        arrivalAirportCode: destAirport.code,
        cabinClass: cabinClass,
      });

      let results: FlightItem[] = [];

      if (dbData && dbData.length > 0) {
        results = dbData.map((fl: any) => ({
          id: fl.id,
          flight_number: fl.flight_number,
          departure_time: fl.departure_time ? new Date(fl.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "09:00 AM",
          arrival_time: fl.arrival_time ? new Date(fl.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "02:30 PM",
          flight_duration: fl.flight_duration || 180,
          stops: fl.stops || 0,
          aircraft_type: fl.aircraft_type || "Boeing 787 Dreamliner",
          cabin_class: (fl.cabin_class as CabinClassType) || cabinClass,
          base_price: Number(fl.base_price) || 280,
          currency: fl.currency || "USD",
          total_seats: fl.total_seats || 200,
          available_seats: fl.available_seats || 24,
          baggage_allowance: fl.baggage_allowance || "20 kg check-in + 7 kg cabin",
          amenities: fl.amenities || ["In-flight meal", "Free Wi-Fi", "USB Power"],
          layover_info: fl.stops === 0 ? "Nonstop direct flight (0 layover)" : "1 Stop layover",
          cancellation_policy: "Free cancellation within 24 hours of booking. Standard airline refund policy applies.",
          departure_airport: {
            iata_code: fl.departure_airport?.iata_code || originAirport.code,
            name: fl.departure_airport?.name || originAirport.name,
            city: fl.departure_airport?.city || originAirport.city,
            country: fl.departure_airport?.country || originAirport.country,
          },
          arrival_airport: {
            iata_code: fl.arrival_airport?.iata_code || destAirport.code,
            name: fl.arrival_airport?.name || destAirport.name,
            city: fl.arrival_airport?.city || destAirport.city,
            country: fl.arrival_airport?.country || destAirport.country,
          },
          airline: {
            name: fl.airline?.name || "Partner Airline",
            iata_code: fl.airline?.iata_code || "PA",
            logo_url: fl.airline?.logo_url,
          },
          is_live_db: true,
        }));
      }
      setLiveFlights(results);
    } catch (err) {
      console.log("Error querying Supabase flights:", err);
      setLiveFlights([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Re-fetch when route or cabin class changes
  useEffect(() => {
    fetchLiveFlights();
  }, [originAirport.code, destAirport.code, cabinClass]);

  // Real-time Supabase table subscription
  useEffect(() => {
    const channel = supabase
      .channel("flights-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flights" },
        () => {
          fetchLiveFlights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [originAirport.code, destAirport.code]);

  // Drawer Animation handlers
  useEffect(() => {
    if (showDetailsDrawer) {
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
  }, [showDetailsDrawer]);

  const openFlightDetails = (flight: FlightItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFlightForDetails(flight);
    setShowDetailsDrawer(true);
  };

  const closeFlightDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDetailsDrawer(false);
  };

  // Swap Airports Handler
  const handleSwapAirports = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevOrigin = originAirport;
    setOriginAirport(destAirport);
    setDestAirport(prevOrigin);
  };

  // Airport Selector Handlers
  const openAirportSelector = (mode: "departure" | "arrival") => {
    Haptics.selectionAsync();
    setAirportModalMode(mode);
    setAirportSearchQuery("");
    setShowAirportModal(true);
  };

  const handleSelectAirport = (airport: Airport) => {
    Haptics.selectionAsync();
    if (airportModalMode === "departure") {
      setOriginAirport(airport);
      if (airport.code === destAirport.code) {
        // Automatically switch arrival if same
        const alternative = POPULAR_AIRPORTS.find((a) => a.code !== airport.code) || POPULAR_AIRPORTS[1];
        setDestAirport(alternative);
      }
    } else {
      setDestAirport(airport);
      if (airport.code === originAirport.code) {
        const alternative = POPULAR_AIRPORTS.find((a) => a.code !== airport.code) || POPULAR_AIRPORTS[0];
        setOriginAirport(alternative);
      }
    }
    setShowAirportModal(false);
  };

  // Passenger & Class Handlers
  const openPassengerModal = () => {
    Haptics.selectionAsync();
    setTempPassengers({ ...passengers });
    setTempCabinClass(cabinClass);
    setShowPassengerModal(true);
  };

  const applyPassengersAndClass = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPassengers(tempPassengers);
    setCabinClass(tempCabinClass);
    setShowPassengerModal(false);
  };

  // Calculation helpers
  const totalPassengersCount = passengers.adults + passengers.children + passengers.infants;

  const calculateFlightFare = (flight: FlightItem) => {
    const classOption = CABIN_CLASSES.find((c) => c.id === flight.cabin_class) || CABIN_CLASSES[0];
    const adultCost = flight.base_price * passengers.adults;
    const childCost = Math.round(flight.base_price * 0.75 * passengers.children);
    const infantCost = Math.round(flight.base_price * 0.1 * passengers.infants);
    const subtotal = Math.round((adultCost + childCost + infantCost) * classOption.multiplier);
    const taxes = Math.round(subtotal * 0.12);
    return {
      subtotal,
      taxes,
      total: subtotal + taxes,
      perPerson: Math.round((subtotal + taxes) / totalPassengersCount),
    };
  };

  // 5. Select Flight Action -> Create Pending Booking & Route to /screens/payments
  const handleSelectFlight = async (flight: FlightItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBookingInProgress(flight.id);

    try {
      const fare = calculateFlightFare(flight);
      let bookingId = `draft-${Date.now()}`;
      let bookingRef = `BK-FL-${flight.flight_number}-${Date.now().toString(36).toUpperCase()}`;

      // If user is authenticated in Supabase, create real pending booking in 'bookings' table
      if (user?.id) {
        try {
          const createdBooking = await bookingRepository.createBooking(user.id, {
            product_type: "flight",
            status: "payment_pending",
            flow_step: "payment",
            origin_city: originAirport.city,
            destination_city: destAirport.city,
            destination_country: destAirport.country,
            start_date: new Date().toISOString().split("T")[0],
            number_of_guests: totalPassengersCount,
            total_price: fare.subtotal,
            tax_amount: fare.taxes,
            service_fee: 0,
            final_price: fare.total,
            currency: flight.currency || "USD",
            notes: `Flight ${flight.flight_number} (${flight.cabin_class}) from ${originAirport.code} to ${destAirport.code} for ${totalPassengersCount} passenger(s)`,
            booking_reference: bookingRef,
            cancellation_policy: {
              policy: flight.cancellation_policy,
              baggage: flight.baggage_allowance,
            },
          });
          if (createdBooking?.id) {
            bookingId = createdBooking.id;
            bookingRef = createdBooking.booking_reference || bookingRef;
          }
        } catch (dbErr) {
          console.log("Saved local pending booking reference:", dbErr);
        }
      }

      if (showDetailsDrawer) {
        setShowDetailsDrawer(false);
      }

      // Route to /screens/payments with selected flight parameters
      router.push({
        pathname: "/screens/payments" as any,
        params: {
          bookingId: bookingId,
          reference: bookingRef,
          amount: fare.total.toString(),
          currency: flight.currency || "USD",
          flightNumber: flight.flight_number,
          airline: flight.airline?.name || "Airline Carrier",
          origin: originAirport.code,
          originCity: originAirport.city,
          destination: destAirport.code,
          destinationCity: destAirport.city,
          cabinClass: flight.cabin_class,
          passengers: totalPassengersCount.toString(),
          adults: passengers.adults.toString(),
          children: passengers.children.toString(),
          infants: passengers.infants.toString(),
          productType: "flight",
        },
      });
    } catch (err: any) {
      console.error("Flight reservation error:", err);
    } finally {
      setBookingInProgress(null);
    }
  };

  // Filtered airport list for modal search
  const filteredAirports = useMemo(() => {
    const q = airportSearchQuery.trim().toLowerCase();
    if (!q) return allDbAirports;
    return allDbAirports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [allDbAirports, airportSearchQuery]);

  return (
    <SafeAreaView style={styles.shell}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Hero Section */}
        <LinearGradient colors={["#E8F3FF", "#F5F7FA"]} style={styles.headerHero}>
          <View style={styles.topBarRow}>
            <View style={styles.headerLeft}>
              <Pressable
                style={styles.backCircleBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.canGoBack() ? router.back() : router.replace("/");
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>
              <View style={styles.brandRow}>
                <Text style={styles.tripLogoText}>Trip.com</Text>
                <View style={styles.vDivider} />
                <View style={styles.airlineBadge}>
                  <View style={styles.redDot} />
                  <Text style={styles.airlineName}>GLOBAL FLIGHTS</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.goldCoinBadge}
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/screens/rewards" as any);
              }}
            >
              <Text style={styles.goldCoinText}>T</Text>
            </Pressable>
          </View>

          {/* Headline */}
          <View style={styles.headlineBox}>
            <Text style={styles.headlineTitle}>Fly Worldwide with{"\n"}Instant Confirmation</Text>
            <Text style={styles.headlineSubtitle}>
              Live schedules, transparent fares & zero hidden cancellation fees
            </Text>
          </View>

          {/* Decorative Flight Graphic */}
          <View style={styles.decorativeImageWrap}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500",
              }}
              style={styles.decorativeImage}
            />
          </View>
        </LinearGradient>

        {/* Main Flight Search Card */}
        <View style={styles.searchCardContainer}>
          {/* Tabs: One-way, Round-trip, Multi-city */}
          <View style={styles.tabRow}>
            {(["One-way", "Round-trip", "Multi-city"] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab);
                  }}
                >
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form Inputs Container */}
          <View style={styles.formContainer}>
            {/* Origin & Destination Selectors with Swap Button */}
            <View style={styles.citiesBox}>
              {/* Departure Airport Selector Button */}
              <Pressable style={styles.cityRow} onPress={() => openAirportSelector("departure")}>
                <View style={styles.cityIconWrap}>
                  <Ionicons name="airplane-outline" size={18} color={TRIP_BLUE} />
                </View>
                <View style={styles.cityTextCol}>
                  <Text style={styles.cityFieldLabel}>Departure Airport</Text>
                  <View style={styles.airportBadgeRow}>
                    <Text style={styles.cityName}>{originAirport.city}</Text>
                    <View style={styles.iataCodePill}>
                      <Text style={styles.iataCodePillText}>{originAirport.code}</Text>
                    </View>
                  </View>
                  <Text style={styles.airportSubName} numberOfLines={1}>
                    {originAirport.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              <View style={styles.hDivider} />

              {/* Arrival Airport Selector Button */}
              <Pressable style={styles.cityRow} onPress={() => openAirportSelector("arrival")}>
                <View style={[styles.cityIconWrap, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="location-outline" size={18} color="#EF4444" />
                </View>
                <View style={styles.cityTextCol}>
                  <Text style={styles.cityFieldLabel}>Arrival Airport</Text>
                  <View style={styles.airportBadgeRow}>
                    <Text style={styles.cityName}>{destAirport.city}</Text>
                    <View style={[styles.iataCodePill, { backgroundColor: "#FEF2F2" }]}>
                      <Text style={[styles.iataCodePillText, { color: "#EF4444" }]}>{destAirport.code}</Text>
                    </View>
                  </View>
                  <Text style={styles.airportSubName} numberOfLines={1}>
                    {destAirport.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              {/* Swap Button */}
              <Pressable style={styles.swapBtn} onPress={handleSwapAirports}>
                <Ionicons name="swap-vertical" size={18} color={TRIP_BLUE} />
              </Pressable>
            </View>

            {/* Date Selector Row */}
            <Pressable
              style={styles.inputRow}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedDate((prev) => (prev.includes("16") ? "Thu, Jun 18, 2026" : "Tue, Jun 16, 2026"));
              }}
            >
              <Ionicons name="calendar-outline" size={19} color={TRIP_BLUE} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cityFieldLabel}>Travel Date</Text>
                <Text style={styles.inputValue}>{selectedDate}</Text>
              </View>
              {activeTab === "Round-trip" && (
                <View style={styles.returnDateBadge}>
                  <Text style={styles.returnDateText}>Return: {returnDate}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Passenger & Cabin Class Selector Row */}
            <Pressable style={styles.passengerClassRow} onPress={openPassengerModal}>
              <View style={styles.passengerSection}>
                <Ionicons name="people-outline" size={18} color={TRIP_BLUE} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.cityFieldLabel}>Passengers</Text>
                  <Text style={styles.passengerCount}>
                    {totalPassengersCount} Pax ({passengers.adults}A
                    {passengers.children > 0 ? `, ${passengers.children}C` : ""}
                    {passengers.infants > 0 ? `, ${passengers.infants}I` : ""})
                  </Text>
                </View>
              </View>

              <View style={styles.vDividerLight} />

              <View style={styles.classSection}>
                <Ionicons name="ribbon-outline" size={18} color={ACCENT_ORANGE} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.cityFieldLabel}>Cabin Class</Text>
                  <Text style={styles.classText} numberOfLines={1}>
                    {cabinClass}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
              </View>
            </Pressable>

            {/* Flight + Hotel Bundle Checkbox */}
            <View style={styles.bundleBox}>
              <View style={styles.bundlePill}>
                <Text style={styles.bundlePillText}>Save 6% on avg.</Text>
              </View>
              <Pressable
                style={styles.bundleCheckRow}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBundleHotel(!bundleHotel);
                }}
              >
                <Ionicons
                  name={bundleHotel ? "checkbox" : "square-outline"}
                  size={20}
                  color={TRIP_BLUE}
                />
                <Text style={styles.bundleLabel}>Flight + Hotel Bundle</Text>
              </Pressable>
            </View>

            {/* Search Flights CTA Button */}
            <Pressable
              style={styles.searchSubmitBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsSearching(true);
                fetchLiveFlights();
              }}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.searchSubmitText}>Search Flights</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Live Flight Results Section */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeaderRow}>
            <View>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.liveIndicatorText}>Live Route Query</Text>
              </View>
              <Text style={styles.routeHeadline}>
                {originAirport.code} ➔ {destAirport.code}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{liveFlights.length} Flights Available</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={TRIP_BLUE} />
              <Text style={styles.loadingText}>Connecting to Supabase flight inventory...</Text>
            </View>
          ) : (
            <View style={styles.flightCardsList}>
              {liveFlights.length === 0 ? (
                <View style={styles.flightEmptyContainer}>
                  <Ionicons name="airplane-outline" size={48} color="#94A3B8" />
                  <Text style={styles.flightEmptyTitle}>No flights found on this route</Text>
                  <Text style={styles.flightEmptySubtitle}>
                    We could not find any live scheduled flights from {originAirport.code} ({originAirport.city}) to {destAirport.code} ({destAirport.city}) for {cabinClass} class.
                  </Text>
                  <Pressable style={styles.flightEmptyResetBtn} onPress={fetchLiveFlights}>
                    <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.flightEmptyResetText}>Refresh Live Search</Text>
                  </Pressable>
                </View>
              ) : (
                liveFlights.map((flight) => {
                const fare = calculateFlightFare(flight);
                const isSelectedForBooking = bookingInProgress === flight.id;

                return (
                  <Pressable
                    key={flight.id}
                    style={styles.flightCard}
                    onPress={() => openFlightDetails(flight)}
                  >
                    {/* Card Top: Airline & Flight Number */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.airlineInfoCol}>
                        {flight.airline?.logo_url ? (
                          <Image source={{ uri: flight.airline.logo_url }} style={styles.airlineLogo} />
                        ) : (
                          <View style={styles.airlineLogoPlaceholder}>
                            <Ionicons name="airplane" size={16} color={TRIP_BLUE} />
                          </View>
                        )}
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.airlineTitle}>{flight.airline?.name}</Text>
                          <Text style={styles.flightNumText}>
                            {flight.flight_number} · {flight.aircraft_type}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.classBadge}>
                        <Text style={styles.classBadgeText}>{flight.cabin_class}</Text>
                      </View>
                    </View>

                    {/* Card Middle: Route & Times */}
                    <View style={styles.scheduleRow}>
                      <View style={styles.timeBlock}>
                        <Text style={styles.scheduleTime}>{flight.departure_time}</Text>
                        <Text style={styles.scheduleCode}>{flight.departure_airport?.iata_code}</Text>
                        <Text style={styles.scheduleCity}>{flight.departure_airport?.city}</Text>
                      </View>

                      <View style={styles.durationBlock}>
                        <Text style={styles.durationText}>
                          {Math.floor(flight.flight_duration / 60)}h {flight.flight_duration % 60}m
                        </Text>
                        <View style={styles.flightLine}>
                          <View style={styles.flightDot} />
                          <View style={styles.flightTrackLine} />
                          <Ionicons name="airplane" size={14} color={TRIP_BLUE} style={{ marginHorizontal: 2 }} />
                          <View style={styles.flightTrackLine} />
                          <View style={styles.flightDot} />
                        </View>
                        <Text style={[styles.stopsBadge, flight.stops === 0 ? styles.nonstopText : styles.layoverText]}>
                          {flight.stops === 0 ? "Nonstop" : "1 Stop"}
                        </Text>
                      </View>

                      <View style={[styles.timeBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.scheduleTime}>{flight.arrival_time}</Text>
                        <Text style={styles.scheduleCode}>{flight.arrival_airport?.iata_code}</Text>
                        <Text style={styles.scheduleCity}>{flight.arrival_airport?.city}</Text>
                      </View>
                    </View>

                    {/* Card Perks Badges */}
                    <View style={styles.perksRow}>
                      <View style={styles.perkPill}>
                        <Ionicons name="bag-handle-outline" size={12} color="#4B5563" />
                        <Text style={styles.perkText}>{flight.baggage_allowance?.split("+")[0] || "20 kg luggage"}</Text>
                      </View>
                      <View style={styles.perkPill}>
                        <Ionicons name="people-outline" size={12} color="#4B5563" />
                        <Text style={styles.perkText}>{flight.available_seats} seats left</Text>
                      </View>
                      {flight.is_live_db && (
                        <View style={[styles.perkPill, { backgroundColor: "#ECFDF5" }]}>
                          <Ionicons name="checkmark-circle" size={12} color={ACCENT_GREEN} />
                          <Text style={[styles.perkText, { color: ACCENT_GREEN }]}>Verified DB</Text>
                        </View>
                      )}
                    </View>

                    {/* Card Bottom: Price & Action Buttons */}
                    <View style={styles.cardBottomRow}>
                      <View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceValue}>${fare.total}</Text>
                          <Text style={styles.priceCurrency}> {flight.currency}</Text>
                        </View>
                        <Text style={styles.priceSubtitle}>
                          ${fare.perPerson}/pax · {totalPassengersCount} traveler{totalPassengersCount > 1 ? "s" : ""}
                        </Text>
                      </View>

                      <View style={styles.actionButtonsRow}>
                        <Pressable
                          style={styles.detailsBtn}
                          onPress={() => openFlightDetails(flight)}
                        >
                          <Text style={styles.detailsBtnText}>Details</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.selectFlightBtn, isSelectedForBooking && { opacity: 0.7 }]}
                          disabled={isSelectedForBooking}
                          onPress={() => handleSelectFlight(flight)}
                        >
                          {isSelectedForBooking ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Text style={styles.selectFlightBtnText}>Select</Text>
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
          )}
        </View>

        {/* Verified Route Inspirations */}
        {liveInspirations.length > 0 && (
          <View style={styles.inspirationSection}>
            <Text style={styles.sectionHeading}>Verified Route Inspirations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {liveInspirations.map((routeItem, idx) => (
                <Pressable
                  key={idx}
                  style={styles.inspirationCard}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const originFound = allDbAirports.find((a) => a.code === routeItem.from) || POPULAR_AIRPORTS.find((a) => a.code === routeItem.from);
                    const destFound = allDbAirports.find((a) => a.code === routeItem.to) || POPULAR_AIRPORTS.find((a) => a.code === routeItem.to);
                    if (originFound && destFound) {
                      setOriginAirport(originFound);
                      setDestAirport(destFound);
                    }
                  }}
                >
                  <View style={styles.inspRouteRow}>
                    <Text style={styles.inspCode}>{routeItem.from}</Text>
                    <Ionicons name="airplane" size={14} color={TRIP_BLUE} style={{ marginHorizontal: 6 }} />
                    <Text style={styles.inspCode}>{routeItem.to}</Text>
                  </View>
                  <Text style={styles.inspCarrier}>{routeItem.carrier} · {routeItem.time}</Text>
                  <View style={styles.inspPriceRow}>
                    <Text style={styles.inspPriceFrom}>from</Text>
                    <Text style={styles.inspPrice}>{routeItem.price}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating AI Pill & Bottom Nav */}
      <AiPill color={TRIP_BLUE} />
      <BottomNav active="Home" color={TRIP_BLUE} />

      {/* =========================================================================
          2. Interactive Airport Selector Modal (DAC, BKK, DXB, SIN, LHR, JFK)
         ========================================================================= */}
      <Modal
        visible={showAirportModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAirportModal(false)}
      >
        <SafeAreaView style={styles.modalShell}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowAirportModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </Pressable>
            <Text style={styles.modalTitle}>
              Select {airportModalMode === "departure" ? "Departure" : "Arrival"} Airport
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Field */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search code (DAC, BKK, DXB...), city, or airport"
              placeholderTextColor="#9CA3AF"
              value={airportSearchQuery}
              onChangeText={setAirportSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {airportSearchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAirportSearchQuery("");
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Quick Hub Filter Chips (DAC, BKK, DXB, SIN, LHR, JFK) */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsSectionLabel}>Popular Global Hubs:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {["DAC", "BKK", "DXB", "SIN", "LHR", "JFK", "PVG", "HND"].map((code) => {
                const targetAirport = POPULAR_AIRPORTS.find((a) => a.code === code);
                const isSelected =
                  (airportModalMode === "departure" ? originAirport.code : destAirport.code) === code;

                return (
                  <Pressable
                    key={code}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => {
                      if (targetAirport) {
                        handleSelectAirport(targetAirport);
                      }
                    }}
                  >
                    <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>{code}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Airport List */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.airportList}>
            {filteredAirports.length === 0 ? (
              <View style={styles.emptyAirportState}>
                <Ionicons name="airplane-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyAirportText}>No airports matching "{airportSearchQuery}"</Text>
              </View>
            ) : (
              filteredAirports.map((airport) => {
                const isSelected =
                  (airportModalMode === "departure" ? originAirport.code : destAirport.code) === airport.code;

                return (
                  <Pressable
                    key={airport.code}
                    style={[styles.airportItemRow, isSelected && styles.airportItemRowActive]}
                    onPress={() => handleSelectAirport(airport)}
                  >
                    <View style={[styles.airportCodeBox, isSelected && styles.airportCodeBoxActive]}>
                      <Text style={[styles.airportCodeText, isSelected && styles.airportCodeTextActive]}>
                        {airport.code}
                      </Text>
                    </View>

                    <View style={styles.airportDetailsCol}>
                      <View style={styles.airportCityRow}>
                        <Text style={styles.airportCityName}>{airport.city}</Text>
                        <Text style={styles.airportCountryName}>, {airport.country}</Text>
                      </View>
                      <Text style={styles.airportFullName} numberOfLines={1}>
                        {airport.name}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={TRIP_BLUE} style={{ marginLeft: 8 }} />
                    )}
                  </Pressable>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          3. Interactive Passenger Counter & Cabin Class Modal
         ========================================================================= */}
      <Modal
        visible={showPassengerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPassengerModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowPassengerModal(false)} />
          <View style={styles.passengerSheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetHeaderTitle}>Passengers & Cabin Class</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPassengerModal(false);
                }}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.7 }}>
              {/* Passengers Counter Section */}
              <Text style={styles.sheetSectionTitle}>Passengers</Text>

              {/* Adults Counter */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>Adults</Text>
                  <Text style={styles.counterSubtitle}>Age 12+ years</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <Pressable
                    style={[styles.stepperBtn, tempPassengers.adults <= 1 && styles.stepperBtnDisabled]}
                    disabled={tempPassengers.adults <= 1}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempPassengers((p) => ({ ...p, adults: Math.max(1, p.adults - 1) }));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={tempPassengers.adults <= 1 ? "#D1D5DB" : "#1F2937"} />
                  </Pressable>
                  <Text style={styles.stepperCountText}>{tempPassengers.adults}</Text>
                  <Pressable
                    style={[styles.stepperBtn, tempPassengers.adults >= 9 && styles.stepperBtnDisabled]}
                    disabled={tempPassengers.adults >= 9}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempPassengers((p) => ({ ...p, adults: Math.min(9, p.adults + 1) }));
                    }}
                  >
                    <Ionicons name="add" size={18} color={tempPassengers.adults >= 9 ? "#D1D5DB" : "#1F2937"} />
                  </Pressable>
                </View>
              </View>

              {/* Children Counter */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>Children</Text>
                  <Text style={styles.counterSubtitle}>Age 2 - 11 years (25% off base fare)</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <Pressable
                    style={[styles.stepperBtn, tempPassengers.children <= 0 && styles.stepperBtnDisabled]}
                    disabled={tempPassengers.children <= 0}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempPassengers((p) => ({ ...p, children: Math.max(0, p.children - 1) }));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={tempPassengers.children <= 0 ? "#D1D5DB" : "#1F2937"} />
                  </Pressable>
                  <Text style={styles.stepperCountText}>{tempPassengers.children}</Text>
                  <Pressable
                    style={[styles.stepperBtn, tempPassengers.children >= 8 && styles.stepperBtnDisabled]}
                    disabled={tempPassengers.children >= 8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempPassengers((p) => ({ ...p, children: Math.min(8, p.children + 1) }));
                    }}
                  >
                    <Ionicons name="add" size={18} color={tempPassengers.children >= 8 ? "#D1D5DB" : "#1F2937"} />
                  </Pressable>
                </View>
              </View>

              {/* Infants Counter */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>Infants</Text>
                  <Text style={styles.counterSubtitle}>Under 2 years (on lap, 90% off)</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <Pressable
                    style={[styles.stepperBtn, tempPassengers.infants <= 0 && styles.stepperBtnDisabled]}
                    disabled={tempPassengers.infants <= 0}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempPassengers((p) => ({ ...p, infants: Math.max(0, p.infants - 1) }));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={tempPassengers.infants <= 0 ? "#D1D5DB" : "#1F2937"} />
                  </Pressable>
                  <Text style={styles.stepperCountText}>{tempPassengers.infants}</Text>
                  <Pressable
                    style={[
                      styles.stepperBtn,
                      (tempPassengers.infants >= 4 || tempPassengers.infants >= tempPassengers.adults) &&
                        styles.stepperBtnDisabled,
                    ]}
                    disabled={tempPassengers.infants >= 4 || tempPassengers.infants >= tempPassengers.adults}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempPassengers((p) => ({ ...p, infants: Math.min(tempPassengers.adults, p.infants + 1) }));
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={
                        tempPassengers.infants >= 4 || tempPassengers.infants >= tempPassengers.adults
                          ? "#D1D5DB"
                          : "#1F2937"
                      }
                    />
                  </Pressable>
                </View>
              </View>

              {/* Cabin Class Switcher Section */}
              <Text style={[styles.sheetSectionTitle, { marginTop: 20 }]}>Cabin Class</Text>
              <View style={styles.cabinClassGrid}>
                {CABIN_CLASSES.map((option) => {
                  const isSelected = tempCabinClass === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.cabinCard, isSelected && styles.cabinCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTempCabinClass(option.id);
                      }}
                    >
                      <View style={styles.cabinCardHeader}>
                        <Text style={[styles.cabinCardTitle, isSelected && styles.cabinCardTitleActive]}>
                          {option.title}
                        </Text>
                        <View style={[styles.cabinBadge, isSelected && styles.cabinBadgeActive]}>
                          <Text style={[styles.cabinBadgeText, isSelected && styles.cabinBadgeTextActive]}>
                            {option.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cabinCardSubtitle}>{option.subtitle}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Apply CTA */}
            <View style={styles.sheetFooter}>
              <View style={styles.sheetSummaryCol}>
                <Text style={styles.sheetSummaryLabel}>Selection:</Text>
                <Text style={styles.sheetSummaryVal}>
                  {tempPassengers.adults + tempPassengers.children + tempPassengers.infants} Traveler(s) ·{" "}
                  {tempCabinClass}
                </Text>
              </View>
              <Pressable style={styles.applyBtn} onPress={applyPassengersAndClass}>
                <Text style={styles.applyBtnText}>Apply Selection</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          4. Expandable Flight Details Drawer (Layover, Baggage, Policy)
         ========================================================================= */}
      <Modal
        visible={showDetailsDrawer}
        transparent={true}
        animationType="none"
        onRequestClose={closeFlightDetails}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeFlightDetails} />
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

              {selectedFlightForDetails && (
                <>
                  {/* Drawer Header */}
                  <View style={styles.drawerHeaderRow}>
                    <View style={styles.drawerAirlineCol}>
                      <Text style={styles.drawerFlightNum}>
                        {selectedFlightForDetails.airline?.name} · {selectedFlightForDetails.flight_number}
                      </Text>
                      <Text style={styles.drawerAircraft}>
                        {selectedFlightForDetails.aircraft_type} · {selectedFlightForDetails.cabin_class}
                      </Text>
                    </View>
                    <Pressable style={styles.drawerCloseCircle} onPress={closeFlightDetails}>
                      <Ionicons name="close" size={20} color="#374151" />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerScroll}>
                    {/* Route Timeline Card */}
                    <View style={styles.drawerTimelineCard}>
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTime}>{selectedFlightForDetails.departure_time}</Text>
                          <Text style={styles.timelineAirport}>
                            {selectedFlightForDetails.departure_airport?.name} ({selectedFlightForDetails.departure_airport?.iata_code})
                          </Text>
                          <Text style={styles.timelineCity}>
                            {selectedFlightForDetails.departure_airport?.city}, Terminal 1
                          </Text>
                        </View>
                      </View>

                      {/* Flight Duration & Layover Time Display */}
                      <View style={styles.timelineDurationRow}>
                        <View style={styles.timelineVLine} />
                        <View style={styles.layoverNoticeBox}>
                          <Ionicons
                            name={selectedFlightForDetails.stops === 0 ? "checkmark-circle" : "time-outline"}
                            size={16}
                            color={selectedFlightForDetails.stops === 0 ? ACCENT_GREEN : ACCENT_ORANGE}
                          />
                          <View style={{ marginLeft: 6, flex: 1 }}>
                            <Text style={styles.layoverNoticeTitle}>
                              Flight Duration: {Math.floor(selectedFlightForDetails.flight_duration / 60)}h{" "}
                              {selectedFlightForDetails.flight_duration % 60}m
                            </Text>
                            <Text style={styles.layoverNoticeSubtitle}>
                              {selectedFlightForDetails.layover_info}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.timelineRow}>
                        <View style={[styles.timelineDot, { backgroundColor: "#EF4444" }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTime}>{selectedFlightForDetails.arrival_time}</Text>
                          <Text style={styles.timelineAirport}>
                            {selectedFlightForDetails.arrival_airport?.name} ({selectedFlightForDetails.arrival_airport?.iata_code})
                          </Text>
                          <Text style={styles.timelineCity}>
                            {selectedFlightForDetails.arrival_airport?.city}, Terminal 2
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Baggage Allowance Section */}
                    <View style={styles.drawerSectionBox}>
                      <View style={styles.drawerSectionHeader}>
                        <Ionicons name="bag-handle" size={18} color={TRIP_BLUE} />
                        <Text style={styles.drawerSectionTitle}>Baggage Allowance</Text>
                      </View>
                      <View style={styles.baggageItemRow}>
                        <Ionicons name="briefcase-outline" size={16} color="#4B5563" />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.baggageItemTitle}>Cabin / Hand Luggage</Text>
                          <Text style={styles.baggageItemDetail}>1 x 7 kg (55 x 40 x 20 cm) carry-on included</Text>
                        </View>
                        <Text style={styles.includedTag}>Included</Text>
                      </View>
                      <View style={styles.baggageItemRow}>
                        <Ionicons name="cube-outline" size={16} color="#4B5563" />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.baggageItemTitle}>Check-in Baggage</Text>
                          <Text style={styles.baggageItemDetail}>{selectedFlightForDetails.baggage_allowance}</Text>
                        </View>
                        <Text style={styles.includedTag}>Included</Text>
                      </View>
                      <Text style={styles.extraBaggageNote}>
                        Extra checked luggage can be purchased at airline check-in counter with online discount.
                      </Text>
                    </View>

                    {/* Cancellation & Refund Policy Section */}
                    <View style={styles.drawerSectionBox}>
                      <View style={styles.drawerSectionHeader}>
                        <Ionicons name="shield-checkmark" size={18} color={ACCENT_GREEN} />
                        <Text style={styles.drawerSectionTitle}>Cancellation & Date Change Policy</Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="checkmark-done" size={16} color={ACCENT_GREEN} />
                        <Text style={styles.policyText}>
                          Free cancellation within 24 hours of booking confirmation.
                        </Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="refresh-outline" size={16} color="#4B5563" />
                        <Text style={styles.policyText}>
                          Date changes permitted with fare difference up to 12 hours before scheduled departure.
                        </Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="cash-outline" size={16} color="#4B5563" />
                        <Text style={styles.policyText}>
                          Refundable ticket: Eligible for partial or full refund subject to airline carrier terms.
                        </Text>
                      </View>
                    </View>

                    {/* In-Flight Amenities Section */}
                    <View style={styles.drawerSectionBox}>
                      <View style={styles.drawerSectionHeader}>
                        <Ionicons name="sparkles" size={18} color={ACCENT_ORANGE} />
                        <Text style={styles.drawerSectionTitle}>In-Flight Amenities</Text>
                      </View>
                      <View style={styles.amenitiesGrid}>
                        {[
                          { icon: "restaurant-outline", label: "Complimentary Dining" },
                          { icon: "wifi-outline", label: "High-Speed Wi-Fi" },
                          { icon: "battery-charging-outline", label: "In-Seat USB / AC Power" },
                          { icon: "tv-outline", label: "HD Seatback Screen" },
                        ].map((amenity, idx) => (
                          <View key={idx} style={styles.amenityChip}>
                            <Ionicons name={amenity.icon as any} size={15} color="#374151" />
                            <Text style={styles.amenityChipText}>{amenity.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Price Breakdown Card */}
                    {(() => {
                      const fare = calculateFlightFare(selectedFlightForDetails);
                      return (
                        <View style={styles.drawerFareCard}>
                          <Text style={styles.fareCardTitle}>Price Breakdown</Text>
                          <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>
                              Base Fare ({totalPassengersCount} Traveler{totalPassengersCount > 1 ? "s" : ""})
                            </Text>
                            <Text style={styles.fareVal}>${fare.subtotal}</Text>
                          </View>
                          <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>Taxes, Fees & Carrier Surcharges (12%)</Text>
                            <Text style={styles.fareVal}>${fare.taxes}</Text>
                          </View>
                          <View style={styles.fareDivider} />
                          <View style={styles.fareRow}>
                            <Text style={styles.fareTotalLabel}>Total Fare (USD)</Text>
                            <Text style={styles.fareTotalVal}>${fare.total}</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </ScrollView>

                  {/* Drawer CTA: Select Flight Button */}
                  <View style={styles.drawerFooterBar}>
                    {(() => {
                      const fare = calculateFlightFare(selectedFlightForDetails);
                      const isSelected = bookingInProgress === selectedFlightForDetails.id;
                      return (
                        <>
                          <View>
                            <Text style={styles.footerPriceLabel}>Total Amount</Text>
                            <Text style={styles.footerPriceValue}>${fare.total} USD</Text>
                          </View>
                          <Pressable
                            style={[styles.reserveCTAButton, isSelected && { opacity: 0.7 }]}
                            disabled={isSelected}
                            onPress={() => handleSelectFlight(selectedFlightForDetails)}
                          >
                            {isSelected ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Text style={styles.reserveCTAButtonText}>Select & Reserve Flight</Text>
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
    paddingBottom: 24,
  },
  headerHero: {
    paddingTop: 12,
    paddingBottom: 72,
    paddingHorizontal: 16,
    position: "relative",
    overflow: "hidden",
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tripLogoText: {
    fontSize: 18,
    fontWeight: "900",
    color: TRIP_BLUE,
    fontStyle: "italic",
  },
  vDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#CBD5E1",
  },
  airlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  airlineName: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4B5563",
    letterSpacing: 0.5,
  },
  goldCoinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  goldCoinText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  headlineBox: {
    marginTop: 18,
    zIndex: 10,
  },
  headlineTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1F2937",
    lineHeight: 28,
  },
  headlineSubtitle: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 6,
    lineHeight: 16,
    maxWidth: SCREEN_WIDTH * 0.65,
  },
  decorativeImageWrap: {
    position: "absolute",
    right: -25,
    top: 20,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.6)",
    overflow: "hidden",
  },
  decorativeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  searchCardContainer: {
    marginHorizontal: 16,
    marginTop: -52,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 20,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: TRIP_BLUE,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabBtnTextActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  formContainer: {
    padding: 16,
  },
  citiesBox: {
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 4,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  cityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cityTextCol: {
    flex: 1,
  },
  cityFieldLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  airportBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  cityName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  iataCodePill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iataCodePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  airportSubName: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  hDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  swapBtn: {
    position: "absolute",
    right: 8,
    top: 42,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inputValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2,
  },
  returnDateBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  returnDateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  passengerClassRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  passengerSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  passengerCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2,
  },
  vDividerLight: {
    width: 1,
    height: 32,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  classSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  classText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2,
  },
  bundleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 4,
  },
  bundlePill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bundlePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  bundleCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bundleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  searchSubmitBtn: {
    marginTop: 14,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchSubmitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resultsSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  resultsHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_GREEN,
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: ACCENT_GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeHeadline: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  flightCardsList: {
    gap: 14,
  },
  flightCard: {
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
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
  },
  airlineInfoCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  airlineLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  airlineLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  airlineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  flightNumText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  classBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  timeBlock: {
    minWidth: 80,
  },
  scheduleTime: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  scheduleCode: {
    fontSize: 13,
    fontWeight: "800",
    color: TRIP_BLUE,
    marginTop: 2,
  },
  scheduleCity: {
    fontSize: 11,
    color: "#6B7280",
  },
  durationBlock: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  flightLine: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  flightDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TRIP_BLUE,
  },
  flightTrackLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#CBD5E1",
  },
  stopsBadge: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  nonstopText: {
    color: ACCENT_GREEN,
  },
  layoverText: {
    color: ACCENT_ORANGE,
  },
  perksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  perkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  perkText: {
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
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  priceCurrency: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  priceSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  selectFlightBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  selectFlightBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  inspirationSection: {
    marginTop: 28,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
  },
  horizontalScroll: {
    gap: 12,
    paddingRight: 16,
  },
  inspirationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    width: 170,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inspRouteRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inspCode: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  inspCarrier: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  inspPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 8,
  },
  inspPriceFrom: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  inspPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: TRIP_BLUE,
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
  airportList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyAirportState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyAirportText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 10,
    fontWeight: "600",
  },
  airportItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  airportItemRowActive: {
    backgroundColor: "#F0F7FF",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  airportCodeBox: {
    width: 48,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  airportCodeBoxActive: {
    backgroundColor: TRIP_BLUE,
  },
  airportCodeText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#374151",
  },
  airportCodeTextActive: {
    color: "#FFFFFF",
  },
  airportDetailsCol: {
    flex: 1,
  },
  airportCityRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  airportCityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  airportCountryName: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  airportFullName: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Sheet / Drawer Common Overlay Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  passengerSheetContainer: {
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
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  counterLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  counterSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  stepperWrap: {
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
    opacity: 0.5,
  },
  stepperCountText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },
  cabinClassGrid: {
    gap: 10,
  },
  cabinCard: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  cabinCardActive: {
    borderColor: TRIP_BLUE,
    backgroundColor: "#F0F7FF",
  },
  cabinCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cabinCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },
  cabinCardTitleActive: {
    color: TRIP_BLUE,
  },
  cabinBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cabinBadgeActive: {
    backgroundColor: "#DBEAFE",
  },
  cabinBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
  },
  cabinBadgeTextActive: {
    color: TRIP_BLUE,
  },
  cabinCardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
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
  sheetSummaryCol: {
    flex: 1,
  },
  sheetSummaryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  sheetSummaryVal: {
    fontSize: 13,
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

  // Flight Details Expandable Drawer Styles
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
  drawerAirlineCol: {
    flex: 1,
  },
  drawerFlightNum: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  drawerAircraft: {
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
  drawerTimelineCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TRIP_BLUE,
    marginTop: 5,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  timelineAirport: {
    fontSize: 13,
    fontWeight: "800",
    color: TRIP_BLUE,
    marginTop: 2,
  },
  timelineCity: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  timelineDurationRow: {
    flexDirection: "row",
    marginVertical: 10,
  },
  timelineVLine: {
    width: 2,
    backgroundColor: "#CBD5E1",
    marginLeft: 4,
    marginRight: 16,
  },
  layoverNoticeBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 8,
  },
  layoverNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  layoverNoticeSubtitle: {
    fontSize: 11,
    color: "#2563EB",
    marginTop: 2,
  },
  drawerSectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  drawerSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  baggageItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  baggageItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  baggageItemDetail: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  includedTag: {
    fontSize: 11,
    fontWeight: "700",
    color: ACCENT_GREEN,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  extraBaggageNote: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 8,
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
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
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
  flightEmptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 12,
  },
  flightEmptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  flightEmptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  flightEmptyResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  flightEmptyResetText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
