import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import { Card } from "../components/ui/Card";
import { travelRepository, FlightSearchFilters, FlightSearchResult } from "../repositories";
import { useBookingStore } from "../store/bookingStore";
import { bookingRepository } from "../services/repositories/booking";
import { supabase } from "../utils/supabase";
import { generateDynamicFlights } from "../data/flightCatalog";
import { PriceAlertCard } from "../components/flights/PriceAlertCard";
import { FlexibleDateSelector } from "../components/flights/FlexibleDateSelector";
import { ListSkeleton, ErrorStateCard, EmptyStateView, OptimizedList, StickyHeader, ResultsSummaryHeader, ComparisonModal, CompareItem } from "../components/common";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";
import { formatLocalizedDate, formatLocalizedNumber, formatLocalizedCurrency, formatCurrency, formatPlural } from "../utils/formatters";
import { RTLIcon } from "../components/ui";

const TRIP_BLUE = "#287dfa";
const ACCENT_ORANGE = "#ff7d00";
const ACCENT_GREEN = "#10b981";

// ============================================================================
// Configuration & Business Rules
// ============================================================================

export const FARE_RULES = {
  TAX_RATE: 0.12, // 12% Airport Authority, Terminal & Security Taxes
  FUEL_SURCHARGE_RATE: 0.08, // 8% Carrier Jet Fuel Fluctuation Surcharge
  CARBON_OFFSET_USD: 14, // $14 USD per passenger for certified climate contribution
  CARBON_OFFSET_BDT: 1200, // ৳1200 BDT per passenger
  CHILD_FARE_RATIO: 0.75, // 25% discount for children (2-11 yrs)
  INFANT_FARE_RATIO: 0.1, // 90% discount for lap infants (under 2 yrs)
};

export const formatDisplayDate = (d: Date, locale?: string): string => {
  return formatLocalizedDate(d, "short", locale);
};

export const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getCurrencySymbol = (currency = "USD"): string => {
  const c = currency.toUpperCase();
  if (c === "BDT") return "৳";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "JPY") return "¥";
  return "$";
};

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

export type CabinClassType = "Economy" | "Premium" | "Business" | "First";

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export type SortCriteria = "cheapest" | "fastest" | "best" | "price" | "duration" | "departure";
export type StopsFilterOption = "all" | "nonstop" | "stops";

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
  layover_duration_minutes?: number;
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

export interface FareBreakdown {
  adultCost: number;
  childCost: number;
  infantCost: number;
  baseFare: number;
  airportTaxes: number;
  fuelSurcharge: number;
  carbonOffset: number;
  total: number;
  perPerson: number;
  totalPax: number;
  currencySymbol: string;
}

// Global Hub Catalog
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
  {
    code: "CDG",
    name: "Paris Charles de Gaulle Airport",
    city: "Paris",
    country: "France",
    countryCode: "FR",
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
    id: "Premium",
    title: "Premium",
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

// Helper: Calculate 4-tier live fare breakdown matrix dynamically
export function calculateFareBreakdown(
  flight: FlightItem,
  passengerCounts: PassengerCounts,
  cabinClass: CabinClassType,
  includeCarbonOffset = true
): FareBreakdown {
  const classOption = CABIN_CLASSES.find((c) => c.id === cabinClass) || CABIN_CLASSES[0];
  const unitPrice = flight.base_price * classOption.multiplier;

  const adultCost = Math.round(unitPrice * passengerCounts.adults);
  const childCost = Math.round(unitPrice * FARE_RULES.CHILD_FARE_RATIO * passengerCounts.children);
  const infantCost = Math.round(unitPrice * FARE_RULES.INFANT_FARE_RATIO * passengerCounts.infants);
  const baseFare = adultCost + childCost + infantCost;

  const totalPax = Math.max(1, passengerCounts.adults + passengerCounts.children + passengerCounts.infants);

  // Requirements 4: Base Fare, Airport Taxes, Fuel Surcharge, Carbon Offset
  const airportTaxes = Math.round(baseFare * FARE_RULES.TAX_RATE);
  const fuelSurcharge = Math.round(baseFare * FARE_RULES.FUEL_SURCHARGE_RATE);
  const carbonOffsetPerPax =
    flight.currency?.toUpperCase() === "BDT" ? FARE_RULES.CARBON_OFFSET_BDT : FARE_RULES.CARBON_OFFSET_USD;
  const carbonOffset = includeCarbonOffset ? totalPax * carbonOffsetPerPax : 0;

  const total = baseFare + airportTaxes + fuelSurcharge + carbonOffset;
  const perPerson = Math.round(total / totalPax);

  return {
    adultCost,
    childCost,
    infantCost,
    baseFare,
    airportTaxes,
    fuelSurcharge,
    carbonOffset,
    total,
    perPerson,
    totalPax,
    currencySymbol: getCurrencySymbol(flight.currency),
  };
}

// ============================================================================
// Main Flights Screen Component
// ============================================================================

export function FlightsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, isTablet, isDesktop } = useResponsive();

  // Dynamic Date Initialization (No hardcoded strings)
  const today = useMemo(() => new Date(), []);
  const initialDepartureDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Tomorrow
    return d;
  }, []);
  const initialReturnDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6); // +5 days from departure
    return d;
  }, []);

  // Tab & Route States
  const [activeTab, setActiveTab] = useState<"One-way" | "Round-trip" | "Multi-city">("One-way");
  const [originAirport, setOriginAirport] = useState<Airport>(POPULAR_AIRPORTS[0]); // DAC
  const [destAirport, setDestAirport] = useState<Airport>(POPULAR_AIRPORTS[1]); // BKK
  const [departureDateObj, setDepartureDateObj] = useState<Date>(initialDepartureDate);
  const [returnDateObj, setReturnDateObj] = useState<Date>(initialReturnDate);

  const selectedDate = useMemo(() => formatDisplayDate(departureDateObj), [departureDateObj]);
  const returnDate = useMemo(() => formatDisplayDate(returnDateObj), [returnDateObj]);
  const departureIso = useMemo(() => formatIsoDate(departureDateObj), [departureDateObj]);
  const returnIso = useMemo(() => formatIsoDate(returnDateObj), [returnDateObj]);

  // Inline Airport Code Input States with 300ms Debounce
  const [originInputText, setOriginInputText] = useState(originAirport.code);
  const [destInputText, setDestInputText] = useState(destAirport.code);
  const [isOriginInputFocused, setIsOriginInputFocused] = useState(false);
  const [isDestInputFocused, setIsDestInputFocused] = useState(false);

  const debouncedOriginInput = useDebounce(originInputText, 300);
  const debouncedDestInput = useDebounce(destInputText, 300);

  // Passenger & Class States
  const [passengers, setPassengers] = useState<PassengerCounts>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [cabinClass, setCabinClass] = useState<CabinClassType>("Economy");
  const [bundleHotel, setBundleHotel] = useState(false);
  const [includeCarbonOffset, setIncludeCarbonOffset] = useState(true);

  // Sorting & Filtering State: Price (Ascending), Duration (Shortest), Departure Time
  const [sortBy, setSortBy] = useState<SortCriteria>("price");
  const [stopsFilter, setStopsFilter] = useState<StopsFilterOption>("all");

  // Flight Data & Live Flow States
  const [liveFlights, setLiveFlights] = useState<FlightItem[]>([]);
  const [liveInspirations, setLiveInspirations] = useState<
    { from: string; to: string; price: string; time: string; carrier: string }[]
  >([]);
  const [allDbAirports, setAllDbAirports] = useState<Airport[]>(POPULAR_AIRPORTS);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Drawer States
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [airportModalMode, setAirportModalMode] = useState<"departure" | "arrival">("departure");
  const [airportSearchQuery, setAirportSearchQuery] = useState("");
  const debouncedModalSearchQuery = useDebounce(airportSearchQuery, 300);

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"departure" | "return">("departure");

  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [tempPassengers, setTempPassengers] = useState<PassengerCounts>({ ...passengers });
  const [tempCabinClass, setTempCabinClass] = useState<CabinClassType>(cabinClass);

  // Fare Breakdown Drawer States
  const [selectedFlightForDetails, setSelectedFlightForDetails] = useState<FlightItem | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
  const [compareFlightIds, setCompareFlightIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Animation values
  const drawerAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Sync text inputs when airport selection updates
  useEffect(() => {
    setOriginInputText(originAirport.code);
  }, [originAirport.code]);

  useEffect(() => {
    setDestInputText(destAirport.code);
  }, [destAirport.code]);

  // 1. Fetch DB Airports & Real Route Inspirations on Mount
  useEffect(() => {
    async function loadAirportsAndRoutes() {
      try {
        const { data: dbAirports } = await supabase.from("airports").select("*");
        if (dbAirports && dbAirports.length > 0) {
          const merged: Airport[] = [...POPULAR_AIRPORTS];
          dbAirports.forEach((dbA: any) => {
            const exists = merged.some((a) => a.code.toUpperCase() === dbA.iata_code?.toUpperCase());
            if (!exists && dbA.iata_code) {
              merged.push({
                id: dbA.id,
                code: dbA.iata_code,
                name: dbA.name || `${dbA.city} International Airport`,
                city: dbA.city || dbA.iata_code,
                country: dbA.country || "",
                countryCode: dbA.country_code || "",
              });
            }
          });
          setAllDbAirports(merged);
        }

        const { data: routeData } = await supabase
          .from("flights")
          .select(`
            base_price,
            flight_duration,
            currency,
            departure_airport:departure_airport_id (iata_code),
            arrival_airport:arrival_airport_id (iata_code),
            airline:airline_id (name)
          `)
          .limit(8);

        if (routeData && routeData.length > 0) {
          const liveRoutes = routeData.map((r: any) => {
            const curSym = getCurrencySymbol(r.currency || "USD");
            return {
              from: r.departure_airport?.iata_code || "DAC",
              to: r.arrival_airport?.iata_code || "BKK",
              price: `${curSym}${r.base_price}`,
              time: `${Math.floor((r.flight_duration || 60) / 60)}h ${(r.flight_duration || 60) % 60}m`,
              carrier: r.airline?.name || "Global Airline",
            };
          });
          setLiveInspirations(liveRoutes);
        }
      } catch (err) {
        console.log("Using standard airport catalog fallback:", err);
      }
    }
    loadAirportsAndRoutes();
  }, []);

  // 2. Live Data Flow: Replace mock flights with travelRepository.searchFlights()
  const totalPassengersCount = passengers.adults + passengers.children + passengers.infants;

  const fetchLiveFlights = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Map cabin class to repository filter format
      let repoCabin: "economy" | "premium_economy" | "business" | "first" = "economy";
      if (cabinClass === "Premium") repoCabin = "premium_economy";
      else if (cabinClass === "Business") repoCabin = "business";
      else if (cabinClass === "First") repoCabin = "first";

      const searchFilters: FlightSearchFilters = {
        originCode: originAirport.code,
        destinationCode: destAirport.code,
        departureDate: departureIso,
        returnDate: activeTab === "Round-trip" ? returnIso : undefined,
        cabinClass: repoCabin,
        passengers: totalPassengersCount,
      };

      // Call live travelRepository.searchFlights()
      const searchResults: FlightSearchResult[] = await travelRepository.searchFlights(searchFilters);

      let results: FlightItem[] = [];

      if (searchResults && searchResults.length > 0) {
        results = searchResults.map((r) => {
          const stops = r.stops_count ?? (r.is_direct ? 0 : 1);
          const depTime = r.departure_time
            ? r.departure_time.includes("T")
              ? new Date(r.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : r.departure_time
            : "08:30 AM";
          const arrTime = r.arrival_time
            ? r.arrival_time.includes("T")
              ? new Date(r.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : r.arrival_time
            : "11:45 AM";

          return {
            id: r.id || `fl-${r.flight_number}-${Date.now()}`,
            flight_number: r.flight_number || "FL-302",
            departure_time: depTime,
            arrival_time: arrTime,
            flight_duration: r.duration_minutes || 180,
            stops: stops,
            aircraft_type: stops === 0 ? "Boeing 787-9 Dreamliner" : "Airbus A350-900",
            cabin_class: cabinClass,
            base_price: Number(r.base_price) || 280,
            currency: r.currency || "USD",
            total_seats: 250,
            available_seats: r.seats_available || 18,
            baggage_allowance:
              cabinClass === "First"
                ? "40 kg check-in + 14 kg cabin"
                : cabinClass === "Business"
                ? "32 kg check-in + 10 kg cabin"
                : cabinClass === "Premium"
                ? "25 kg check-in + 8 kg cabin"
                : "20 kg check-in + 7 kg cabin",
            amenities: ["In-flight meal", "Free Wi-Fi", "USB Power", "Seatback HD Screen"],
            layover_info: stops === 0 ? "Nonstop direct flight (0 layover)" : "1 Stop · 1h 45m Layover",
            cancellation_policy: "Free cancellation within 24 hours of booking. Standard airline refund policy applies.",
            departure_airport: {
              iata_code: r.departure_airport_code || originAirport.code,
              name: originAirport.name,
              city: r.departure_city || originAirport.city,
              country: originAirport.country,
            },
            arrival_airport: {
              iata_code: r.arrival_airport_code || destAirport.code,
              name: destAirport.name,
              city: r.arrival_city || destAirport.city,
              country: destAirport.country,
            },
            airline: {
              name: r.airline_name || "Partner Carrier",
              iata_code: r.airline_code || "PA",
              logo_url: r.airline_logo,
            },
            is_live_db: true,
          };
        });
      }

      // If database has no entries for this specific pair, use dynamic flight generator
      if (results.length === 0) {
        results = generateDynamicFlights(originAirport, destAirport, cabinClass as any);
      }

      setLiveFlights(results);
    } catch (err: any) {
      console.warn("travelRepository.searchFlights failed, falling back to resilient catalog:", err);
      const fallback = generateDynamicFlights(originAirport, destAirport, cabinClass as any);
      setLiveFlights(fallback);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [originAirport, destAirport, cabinClass, departureIso, returnIso, activeTab, totalPassengersCount]);

  // Re-fetch on criteria changes
  useEffect(() => {
    fetchLiveFlights();
  }, [fetchLiveFlights]);

  // Real-time Supabase subscription
  useEffect(() => {
    const channel = supabase
      .channel("flights-realtime-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "flights" }, () => {
        fetchLiveFlights();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveFlights]);

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

  // Autocompletion filters (300ms debounced)
  const originAutocompletions = useMemo(() => {
    const q = debouncedOriginInput.trim().toLowerCase();
    if (!q) return allDbAirports.slice(0, 5);
    return allDbAirports
      .filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [debouncedOriginInput, allDbAirports]);

  const destAutocompletions = useMemo(() => {
    const q = debouncedDestInput.trim().toLowerCase();
    if (!q) return allDbAirports.slice(0, 5);
    return allDbAirports
      .filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [debouncedDestInput, allDbAirports]);

  const filteredModalAirports = useMemo(() => {
    const q = debouncedModalSearchQuery.trim().toLowerCase();
    if (!q) return allDbAirports;
    return allDbAirports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [allDbAirports, debouncedModalSearchQuery]);

  // Sorting & Filtering logic: Price, Duration, Departure Time + Stops Filter
  const filteredAndSortedFlights = useMemo(() => {
    let list = [...liveFlights];

    // Stops filter
    if (stopsFilter === "nonstop") {
      list = list.filter((f) => f.stops === 0);
    } else if (stopsFilter === "stops") {
      list = list.filter((f) => f.stops > 0);
    }

    // Sort criteria
    if (sortBy === "cheapest" || sortBy === "price") {
      list.sort((a, b) => {
        const fareA = calculateFareBreakdown(a, passengers, cabinClass, includeCarbonOffset).total;
        const fareB = calculateFareBreakdown(b, passengers, cabinClass, includeCarbonOffset).total;
        return fareA - fareB;
      });
    } else if (sortBy === "fastest" || sortBy === "duration") {
      list.sort((a, b) => a.flight_duration - b.flight_duration);
    } else if (sortBy === "best") {
      list.sort((a, b) => {
        const fareA = calculateFareBreakdown(a, passengers, cabinClass, includeCarbonOffset).total;
        const fareB = calculateFareBreakdown(b, passengers, cabinClass, includeCarbonOffset).total;
        const scoreA = fareA + (a.flight_duration / 60) * 20 + a.stops * 45;
        const scoreB = fareB + (b.flight_duration / 60) * 20 + b.stops * 45;
        return scoreA - scoreB;
      });
      list.sort((a, b) => a.flight_duration - b.flight_duration);
    } else if (sortBy === "departure") {
      list.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    }

    return list;
  }, [liveFlights, stopsFilter, sortBy, passengers, cabinClass, includeCarbonOffset]);

  const toggleCompareFlight = (flightId: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setCompareFlightIds((prev) =>
      prev.includes(flightId)
        ? prev.filter((id) => id !== flightId)
        : prev.length < 3
        ? [...prev, flightId]
        : prev
    );
  };

  const flightCompareItems: CompareItem[] = useMemo(() => {
    return compareFlightIds
      .map((id) => filteredAndSortedFlights.find((f) => f.id === id))
      .filter(Boolean)
      .map((f: any) => ({
        id: f.id,
        title: `${f.airline} (${f.flight_number})`,
        subtitle: `${f.departure_time} ➔ ${f.arrival_time}`,
        type: "flight" as const,
        price: calculateFareBreakdown(f, passengers, cabinClass, includeCarbonOffset).total,
        rating: 4.8,
        imageUrl: f.airline_logo,
        specs: [
          { label: "সময়কাল (Duration)", value: `${Math.floor(f.flight_duration / 60)}h ${f.flight_duration % 60}m` },
          { label: "বিরতি (Stops)", value: f.stops === 0 ? "সরাসরি (Non-stop)" : `${f.stops}টি বিরতি` },
          { label: "রুট (Route)", value: `${originAirport.code} ➔ ${destAirport.code}` },
          { label: "কেবিন ক্লাস", value: cabinClass },
        ],
        cancellationPolicy: f.refundable ? "বিনামূল্যে বাতিলযোগ্য (Refundable)" : "অফেরতযোগ্য (Non-refundable)",
        onSelect: () => openFlightDetails(f),
      }));
  }, [compareFlightIds, filteredAndSortedFlights, passengers, cabinClass, includeCarbonOffset, originAirport, destAirport]);

  // Tab Metrics: lowest fare, shortest duration, best value
  const flightTabMetrics = useMemo(() => {
    if (!liveFlights.length) return { lowestPrice: 0, shortestDuration: 0, currency: "USD" };
    let minPrice = Infinity;
    let minDur = Infinity;
    liveFlights.forEach((f) => {
      const brk = calculateFareBreakdown(f, passengers, cabinClass, includeCarbonOffset);
      if (brk.total < minPrice) minPrice = brk.total;
      if (f.flight_duration < minDur) minDur = f.flight_duration;
    });
    return {
      lowestPrice: minPrice === Infinity ? 0 : minPrice,
      shortestDuration: minDur === Infinity ? 0 : minDur,
      currency: liveFlights[0]?.currency || "USD",
    };
  }, [liveFlights, passengers, cabinClass, includeCarbonOffset]);

  // Airport selection handlers
  const selectOriginSuggestion = (airport: Airport) => {
    Haptics.selectionAsync();
    setOriginAirport(airport);
    setOriginInputText(airport.code);
    setIsOriginInputFocused(false);
    Keyboard.dismiss();
    if (airport.code === destAirport.code) {
      const alt = allDbAirports.find((a) => a.code !== airport.code) || POPULAR_AIRPORTS[1];
      setDestAirport(alt);
      setDestInputText(alt.code);
    }
  };

  const selectDestSuggestion = (airport: Airport) => {
    Haptics.selectionAsync();
    setDestAirport(airport);
    setDestInputText(airport.code);
    setIsDestInputFocused(false);
    Keyboard.dismiss();
    if (airport.code === originAirport.code) {
      const alt = allDbAirports.find((a) => a.code !== airport.code) || POPULAR_AIRPORTS[0];
      setOriginAirport(alt);
      setOriginInputText(alt.code);
    }
  };

  const handleSwapAirports = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevOrigin = originAirport;
    const prevDest = destAirport;
    setOriginAirport(prevDest);
    setDestAirport(prevOrigin);
    setOriginInputText(prevDest.code);
    setDestInputText(prevOrigin.code);
    setIsOriginInputFocused(false);
    setIsDestInputFocused(false);
    Keyboard.dismiss();
  };

  const openAirportModal = (mode: "departure" | "arrival") => {
    Haptics.selectionAsync();
    setAirportModalMode(mode);
    setAirportSearchQuery("");
    setShowAirportModal(true);
    setIsOriginInputFocused(false);
    setIsDestInputFocused(false);
    Keyboard.dismiss();
  };

  const handleSelectModalAirport = (airport: Airport) => {
    Haptics.selectionAsync();
    if (airportModalMode === "departure") {
      setOriginAirport(airport);
      setOriginInputText(airport.code);
      if (airport.code === destAirport.code) {
        const alternative = allDbAirports.find((a) => a.code !== airport.code) || POPULAR_AIRPORTS[1];
        setDestAirport(alternative);
        setDestInputText(alternative.code);
      }
    } else {
      setDestAirport(airport);
      setDestInputText(airport.code);
      if (airport.code === originAirport.code) {
        const alternative = allDbAirports.find((a) => a.code !== airport.code) || POPULAR_AIRPORTS[0];
        setOriginAirport(alternative);
        setOriginInputText(alternative.code);
      }
    }
    setShowAirportModal(false);
  };

  // Passenger Modal Handlers
  const openPassengerModal = () => {
    Haptics.selectionAsync();
    setTempPassengers({ ...passengers });
    setTempCabinClass(cabinClass);
    setShowPassengerModal(true);
    Keyboard.dismiss();
  };

  const applyPassengersAndClass = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPassengers(tempPassengers);
    setCabinClass(tempCabinClass);
    setShowPassengerModal(false);
  };

  // Drawer handlers
  const openFlightDetails = (flight: FlightItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFlightForDetails(flight);
    setShowDetailsDrawer(true);
    Keyboard.dismiss();
  };

  const closeFlightDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDetailsDrawer(false);
  };

  // Requirement 4: Fare Breakdown Drawer "Select Flight" Button -> Dispatch to useBookingStore
  const handleSelectFlight = async (flight: FlightItem) => {
    // Validate seat availability
    if (flight.available_seats <= 0 || flight.available_seats < totalPassengersCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "অপর্যাপ্ত আসন (Insufficient Seats)",
        flight.available_seats <= 0
          ? "নির্বাচিত ফ্লাইটে কোনো আসন অবশিষ্ট নেই (Sold Out)। অনুগ্রহ করে অন্য ফ্লাইট বেছে নিন।"
          : `নির্বাচিত ফ্লাইটে মাত্র ${flight.available_seats}টি আসন বাকি আছে, কিন্তু আপনি ${totalPassengersCount} জন যাত্রী নির্বাচন করেছেন। অনুগ্রহ করে যাত্রী সংখ্যা কমান অথবা অন্য ফ্লাইট বেছে নিন।`,
        [{ text: "ঠিক আছে", style: "default" }]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBookingInProgress(flight.id);

    try {
      const breakdown = calculateFareBreakdown(flight, passengers, cabinClass, includeCarbonOffset);
      let bookingId = `draft-${Date.now()}`;
      let bookingRef = `BK-FL-${flight.flight_number}-${Date.now().toString(36).toUpperCase()}`;

      // Dispatch state initialization to useBookingStore
      useBookingStore.getState().initDraft({
        productType: "flight",
        productId: flight.id,
        destinationCity: flight.arrival_airport?.city || destAirport.city,
        destinationCountry: flight.arrival_airport?.country || destAirport.country || "International",
        startDate: departureIso,
        endDate: activeTab === "Round-trip" ? returnIso : undefined,
        basePrice: breakdown.baseFare,
        currency: flight.currency || "USD",
        numberOfGuests: totalPassengersCount,
      });

      // Update useBookingStore with detailed fare breakdown matrix
      useBookingStore.setState({
        pricing: {
          basePrice: breakdown.baseFare,
          taxAmount: breakdown.airportTaxes,
          serviceFee: breakdown.fuelSurcharge + breakdown.carbonOffset,
          discountAmount: 0,
          finalPrice: breakdown.total,
          currency: flight.currency || "USD",
        },
        notes: `Flight ${flight.flight_number} (${flight.cabin_class}) ${flight.departure_airport?.iata_code} -> ${flight.arrival_airport?.iata_code} | Taxes: ${breakdown.currencySymbol}${breakdown.airportTaxes}, Fuel: ${breakdown.currencySymbol}${breakdown.fuelSurcharge}, Carbon Offset: ${breakdown.currencySymbol}${breakdown.carbonOffset}`,
      });

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
            start_date: departureIso,
            number_of_guests: totalPassengersCount,
            total_price: breakdown.baseFare,
            tax_amount: breakdown.airportTaxes,
            service_fee: breakdown.fuelSurcharge + breakdown.carbonOffset,
            final_price: breakdown.total,
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
          amount: breakdown.total.toString(),
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

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            setIsOriginInputFocused(false);
            setIsDestInputFocused(false);
          }}
          accessible={false}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              setIsOriginInputFocused(false);
              setIsDestInputFocused(false);
            }}
          >
            {/* Header Hero Section */}
            <LinearGradient colors={["#E8F3FF", "#F5F7FA"]} style={styles.headerHero}>
              <View style={styles.topBarRow}>
                <View style={styles.headerLeft}>
                  <Pressable
                    style={styles.backCircleBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.canGoBack() ? router.back() : router.replace("/(tabs)");
                    }}
                  >
                    <RTLIcon name="arrow-back" size={20} color="#FFFFFF" />
                  </Pressable>
                  <View style={styles.brandRow}>
                    <Text style={styles.tripLogoText}>Trip.com</Text>
                    <View style={styles.vDivider} />
                    <View style={styles.airlineBadge}>
                      <View style={styles.redDot} />
                      <Text style={styles.airlineName}>GLOBAL FLIGHT ENGINE</Text>
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
                  Live schedules, verified airline inventory & transparent fare breakdown
                </Text>
              </View>

              {/* Decorative Graphic */}
              <View style={styles.decorativeImageWrap}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500",
                  }}
                  style={styles.decorativeImage}
                />
              </View>
            </LinearGradient>

            {/* Requirement 1: Multi-Criteria Search & Filter Card */}
            <View style={[styles.searchCardContainer, { backgroundColor: colors.card, borderColor: colors.borderSubtle, borderWidth: 1 }]}>
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

              {/* Search Form Inputs */}
              <View style={styles.formContainer}>
                {/* Origin & Destination with 300ms Debounced Code Autocompletion */}
                <View style={styles.citiesBox}>
                  {/* Origin Field */}
                  <View style={styles.cityInputRowWrap}>
                    <Pressable style={styles.cityRow} onPress={() => openAirportModal("departure")}>
                      <View style={styles.cityIconWrap}>
                        <Ionicons name="airplane-outline" size={18} color={TRIP_BLUE} />
                      </View>
                      <View style={styles.cityTextCol}>
                        <Text style={styles.cityFieldLabel}>Origin Airport (Type Code / City)</Text>
                        <View style={styles.airportBadgeRow}>
                          <TextInput
                            style={styles.airportCodeInput}
                            value={originInputText}
                            placeholder="DAC"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            onChangeText={(text) => {
                              setOriginInputText(text);
                              setIsOriginInputFocused(true);
                              setIsDestInputFocused(false);
                            }}
                            onFocus={() => {
                              setIsOriginInputFocused(true);
                              setIsDestInputFocused(false);
                            }}
                          />
                          <View style={styles.iataCodePill}>
                            <Text style={styles.iataCodePillText}>{originAirport.city}</Text>
                          </View>
                          {originInputText.length > 0 && isOriginInputFocused && (
                            <Pressable
                              style={styles.clearInputBtn}
                              onPress={() => {
                                setOriginInputText("");
                              }}
                            >
                              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </Pressable>
                          )}
                        </View>
                        <Text style={styles.airportSubName} numberOfLines={1}>
                          {originAirport.name}
                        </Text>
                      </View>
                    </Pressable>

                    {/* Debounced 300ms Autocompletion Dropdown for Origin */}
                    {isOriginInputFocused && (
                      <View style={styles.autocompleteDropdown}>
                        <View style={styles.autocompleteHeader}>
                          <Text style={styles.autocompleteHeaderTitle}>
                            Airport Autocomplete (300ms Debounced)
                          </Text>
                          <Pressable
                            onPress={() => {
                              setIsOriginInputFocused(false);
                              Keyboard.dismiss();
                            }}
                          >
                            <Ionicons name="close-circle" size={16} color="#6B7280" />
                          </Pressable>
                        </View>
                        {originAutocompletions.map((airport) => (
                          <Pressable
                            key={airport.code}
                            style={styles.autocompleteItem}
                            onPress={() => selectOriginSuggestion(airport)}
                          >
                            <View style={styles.autocompleteCodePill}>
                              <Text style={styles.autocompleteCodeText}>{airport.code}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.autocompleteCityText}>
                                {airport.city}, {airport.country}
                              </Text>
                              <Text style={styles.autocompleteNameText} numberOfLines={1}>
                                {airport.name}
                              </Text>
                            </View>
                            <RTLIcon name="chevron-forward" size={14} color="#CBD5E1" />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.hDivider} />

                  {/* Destination Field */}
                  <View style={styles.cityInputRowWrap}>
                    <Pressable style={styles.cityRow} onPress={() => openAirportModal("arrival")}>
                      <View style={[styles.cityIconWrap, { backgroundColor: "#FEF2F2" }]}>
                        <Ionicons name="location-outline" size={18} color="#EF4444" />
                      </View>
                      <View style={styles.cityTextCol}>
                        <Text style={styles.cityFieldLabel}>Destination Airport (Type Code / City)</Text>
                        <View style={styles.airportBadgeRow}>
                          <TextInput
                            style={styles.airportCodeInput}
                            value={destInputText}
                            placeholder="BKK"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            onChangeText={(text) => {
                              setDestInputText(text);
                              setIsDestInputFocused(true);
                              setIsOriginInputFocused(false);
                            }}
                            onFocus={() => {
                              setIsDestInputFocused(true);
                              setIsOriginInputFocused(false);
                            }}
                          />
                          <View style={[styles.iataCodePill, { backgroundColor: "#FEF2F2" }]}>
                            <Text style={[styles.iataCodePillText, { color: "#EF4444" }]}>
                              {destAirport.city}
                            </Text>
                          </View>
                          {destInputText.length > 0 && isDestInputFocused && (
                            <Pressable
                              style={styles.clearInputBtn}
                              onPress={() => {
                                setDestInputText("");
                              }}
                            >
                              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </Pressable>
                          )}
                        </View>
                        <Text style={styles.airportSubName} numberOfLines={1}>
                          {destAirport.name}
                        </Text>
                      </View>
                    </Pressable>

                    {/* Debounced 300ms Autocompletion Dropdown for Destination */}
                    {isDestInputFocused && (
                      <View style={styles.autocompleteDropdown}>
                        <View style={styles.autocompleteHeader}>
                          <Text style={styles.autocompleteHeaderTitle}>
                            Airport Autocomplete (300ms Debounced)
                          </Text>
                          <Pressable
                            onPress={() => {
                              setIsDestInputFocused(false);
                              Keyboard.dismiss();
                            }}
                          >
                            <Ionicons name="close-circle" size={16} color="#6B7280" />
                          </Pressable>
                        </View>
                        {destAutocompletions.map((airport) => (
                          <Pressable
                            key={airport.code}
                            style={styles.autocompleteItem}
                            onPress={() => selectDestSuggestion(airport)}
                          >
                            <View style={[styles.autocompleteCodePill, { backgroundColor: "#FEF2F2" }]}>
                              <Text style={[styles.autocompleteCodeText, { color: "#EF4444" }]}>
                                {airport.code}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.autocompleteCityText}>
                                {airport.city}, {airport.country}
                              </Text>
                              <Text style={styles.autocompleteNameText} numberOfLines={1}>
                                {airport.name}
                              </Text>
                            </View>
                            <RTLIcon name="chevron-forward" size={14} color="#CBD5E1" />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Swap Button */}
                  <Pressable style={styles.swapBtn} onPress={handleSwapAirports}>
                    <Ionicons name="swap-vertical" size={18} color={TRIP_BLUE} />
                  </Pressable>
                </View>

                {/* Departure & Return Date Selectors */}
                <Pressable
                  style={styles.inputRow}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDatePickerMode("departure");
                    setShowDatePickerModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={19} color={TRIP_BLUE} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cityFieldLabel}>Departure Date & Return Schedule</Text>
                    <Text style={styles.inputValue}>
                      {selectedDate}
                      {activeTab === "Round-trip" ? `  ➔  ${returnDate}` : ""}
                    </Text>
                  </View>
                  {activeTab === "Round-trip" && (
                    <View style={styles.returnDateBadge}>
                      <Text style={styles.returnDateText}>Round-trip</Text>
                    </View>
                  )}
                  <RTLIcon name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                {/* Passengers & Cabin Class Row */}
                <Pressable style={styles.passengerClassRow} onPress={openPassengerModal}>
                  <View style={styles.passengerSection}>
                    <Ionicons name="people-outline" size={18} color={TRIP_BLUE} />
                    <View style={{ marginStart: 8 }}>
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
                    <View style={{ marginStart: 8, flex: 1 }}>
                      <Text style={styles.cityFieldLabel}>Cabin Class</Text>
                      <Text style={styles.classText} numberOfLines={1}>
                        {cabinClass}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                  </View>
                </Pressable>

                {/* Cabin Class Quick Segmented Selector */}
                <View style={styles.cabinClassSelectorBar}>
                  <Text style={styles.cabinClassSelectorLabel}>Select Cabin Class:</Text>
                  <View style={styles.cabinSelectorGrid}>
                    {(["Economy", "Premium", "Business", "First"] as CabinClassType[]).map((cls) => {
                      const isSelected = cabinClass === cls;
                      return (
                        <Pressable
                          key={cls}
                          style={[styles.cabinSelectorBtn, isSelected && styles.cabinSelectorBtnActive]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setCabinClass(cls);
                          }}
                        >
                          <Text
                            style={[
                              styles.cabinSelectorBtnText,
                              isSelected && styles.cabinSelectorBtnTextActive,
                            ]}
                          >
                            {cls}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Hotel Bundle Discount Checkbox */}
                <View style={styles.bundleBox}>
                  <View style={styles.bundlePill}>
                    <Text style={styles.bundlePillText}>Save 6% with Bundle</Text>
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

                {/* Live Search CTA */}
                <Pressable
                  style={styles.searchSubmitBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setIsSearching(true);
                    setIsOriginInputFocused(false);
                    setIsDestInputFocused(false);
                    Keyboard.dismiss();
                    fetchLiveFlights();
                  }}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="search" size={18} color="#FFFFFF" style={{ marginEnd: 6 }} />
                      <Text style={styles.searchSubmitText}>Search Live Flights</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Requirement 6: Flexible Dates Strip (±3 days) & Monthly Calendar */}
            <FlexibleDateSelector
              currentDate={departureDateObj}
              basePrice={flightTabMetrics.lowestPrice || 250}
              currency={flightTabMetrics.currency}
              onSelectDate={(newDate) => {
                setDepartureDateObj(newDate);
                fetchLiveFlights();
              }}
            />

            {/* Requirement 5: Price Drop Alert Toggle Card */}
            <PriceAlertCard
              originCode={originAirport.code}
              destCode={destAirport.code}
              originCity={originAirport.city}
              destCity={destAirport.city}
              currentLowestPrice={flightTabMetrics.lowestPrice || 250}
              currency={flightTabMetrics.currency}
            />

            {/* Requirement 2: Live Flight Results & Controls */}
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeaderRow}>
                <View>
                  <View style={styles.liveIndicatorRow}>
                    <View style={styles.greenPulseDot} />
                    <Text style={styles.liveIndicatorText}>Live travelRepository Flow</Text>
                  </View>
                  <Text style={styles.routeHeadline}>
                    {originAirport.code} ➔ {destAirport.code}
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <ResultsSummaryHeader
                    count={filteredAndSortedFlights.length}
                    entityName="ফ্লাইট"
                    sortLabel={
                      sortBy === "cheapest"
                        ? "সবচেয়ে কম দাম"
                        : sortBy === "fastest"
                        ? "সবচেয়ে কম সময়"
                        : "সেরা রেটিং"
                    }
                    filterCount={stopsFilter !== "all" ? 1 : 0}
                    onClearFilters={() => setStopsFilter("all")}
                  />
                </View>
              </View>

              {/* Requirement 2: Sorting Control & Stops Filter Bar */}
              <View style={styles.controlsCard}>
                {/* Sorting options */}
                <View style={styles.sortingSection}>
                  <Text style={styles.controlHeaderLabel}>ফ্লাইট তুলনা ও বাছাই:</Text>
                  <View style={styles.comparisonTabsRow}>
                    <Pressable
                      style={[
                        styles.comparisonTab,
                        (sortBy === "cheapest" || sortBy === "price") && styles.comparisonTabActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSortBy("cheapest");
                      }}
                    >
                      <Ionicons
                        name="pricetag"
                        size={15}
                        color={(sortBy === "cheapest" || sortBy === "price") ? TRIP_BLUE : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.comparisonTabTitle,
                          (sortBy === "cheapest" || sortBy === "price") && styles.comparisonTabTitleActive,
                        ]}
                      >
                        সবচেয়ে সস্তা
                      </Text>
                      <Text
                        style={[
                          styles.comparisonTabSub,
                          (sortBy === "cheapest" || sortBy === "price") && styles.comparisonTabSubActive,
                        ]}
                      >
                        {flightTabMetrics.lowestPrice ? formatCurrency(flightTabMetrics.lowestPrice, flightTabMetrics.currency || "BDT") : "--"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.comparisonTab,
                        (sortBy === "fastest" || sortBy === "duration") && styles.comparisonTabActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSortBy("fastest");
                      }}
                    >
                      <Ionicons
                        name="flash"
                        size={15}
                        color={(sortBy === "fastest" || sortBy === "duration") ? TRIP_BLUE : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.comparisonTabTitle,
                          (sortBy === "fastest" || sortBy === "duration") && styles.comparisonTabTitleActive,
                        ]}
                      >
                        দ্রুততম
                      </Text>
                      <Text
                        style={[
                          styles.comparisonTabSub,
                          (sortBy === "fastest" || sortBy === "duration") && styles.comparisonTabSubActive,
                        ]}
                      >
                        {flightTabMetrics.shortestDuration
                          ? `${Math.floor(flightTabMetrics.shortestDuration / 60)}h ${flightTabMetrics.shortestDuration % 60}m`
                          : "--"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.comparisonTab,
                        sortBy === "best" && styles.comparisonTabActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSortBy("best");
                      }}
                    >
                      <Ionicons
                        name="star"
                        size={15}
                        color={sortBy === "best" ? TRIP_BLUE : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.comparisonTabTitle,
                          sortBy === "best" && styles.comparisonTabTitleActive,
                        ]}
                      >
                        সেরা মান
                      </Text>
                      <Text
                        style={[
                          styles.comparisonTabSub,
                          sortBy === "best" && styles.comparisonTabSubActive,
                        ]}
                      >
                        সেরা সমন্বয়
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.sortingChipsRow}>
                    <Pressable
                      style={[styles.sortChip, sortBy === "price" && styles.sortChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSortBy("price");
                      }}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={13}
                        color={sortBy === "price" ? "#FFFFFF" : TRIP_BLUE}
                        style={{ marginEnd: 4 }}
                      />
                      <Text style={[styles.sortChipText, sortBy === "price" && styles.sortChipTextActive]}>
                        Price (Ascending)
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.sortChip, sortBy === "duration" && styles.sortChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSortBy("duration");
                      }}
                    >
                      <Ionicons
                        name="speedometer-outline"
                        size={13}
                        color={sortBy === "duration" ? "#FFFFFF" : TRIP_BLUE}
                        style={{ marginEnd: 4 }}
                      />
                      <Text style={[styles.sortChipText, sortBy === "duration" && styles.sortChipTextActive]}>
                        Duration (Shortest)
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.sortChip, sortBy === "departure" && styles.sortChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSortBy("departure");
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={sortBy === "departure" ? "#FFFFFF" : TRIP_BLUE}
                        style={{ marginEnd: 4 }}
                      />
                      <Text style={[styles.sortChipText, sortBy === "departure" && styles.sortChipTextActive]}>
                        Departure Time
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Stops Filter Row */}
                <View style={styles.filterSection}>
                  <Text style={styles.controlHeaderLabel}>Stops Filter:</Text>
                  <View style={styles.filterChipsRow}>
                    {[
                      { id: "all", label: "All Flights" },
                      { id: "nonstop", label: "Nonstop Only" },
                      { id: "stops", label: "1+ Stops" },
                    ].map((item) => {
                      const isActive = stopsFilter === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.filterChip, isActive && styles.filterChipActive]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setStopsFilter(item.id as StopsFilterOption);
                          }}
                        >
                          <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Flight List Content */}
              {loading ? (
                <View style={{ paddingVertical: 12 }}>
                  <ListSkeleton count={3} type="flight" />
                </View>
              ) : fetchError ? (
                <View style={{ paddingVertical: 16 }}>
                  <ErrorStateCard
                    title="Unable to load flights"
                    message={fetchError}
                    onRetry={fetchLiveFlights}
                  />
                </View>
              ) : filteredAndSortedFlights.length === 0 ? (
                <View style={{ paddingVertical: 16 }}>
                  <EmptyStateView
                    title="No flights found"
                    description={`No flights matching your criteria from ${originAirport.code} to ${destAirport.code} for ${cabinClass} class.`}
                    actionText="Reset Filters / Change Route"
                    onAction={() => {
                      setStopsFilter("all");
                      setShowAirportModal(true);
                    }}
                    icon="airplane-outline"
                  />
                </View>
              ) : (
                <View style={styles.flightCardsList}>
                  {filteredAndSortedFlights.map((flight) => {
                    const breakdown = calculateFareBreakdown(flight, passengers, cabinClass, includeCarbonOffset);
                    const isSelectedForBooking = bookingInProgress === flight.id;

                    {/* Requirement 3: UI Architecture using src/components/ui/Card.tsx */}
                    return (
                      <Card
                        key={flight.id}
                        variant="elevated"
                        elevation="low"
                        rounded="xl"
                        border="subtle"
                        padding="none"
                        style={styles.flightTicketCard}
                        onPress={() => openFlightDetails(flight)}
                      >
                        <View style={styles.cardInnerPadding}>
                          {/* Card Top: Airline Logo, Flight Number, Refundable Tag */}
                          <View style={styles.cardTopRow}>
                            <View style={styles.airlineInfoCol}>
                              {flight.airline?.logo_url ? (
                                <Image source={{ uri: flight.airline.logo_url }} style={styles.airlineLogo} />
                              ) : (
                                <View style={styles.airlineLogoPlaceholder}>
                                  <Ionicons name="airplane" size={16} color={TRIP_BLUE} />
                                </View>
                              )}
                              <View style={{ marginStart: 8 }}>
                                <Text style={styles.airlineTitle}>{flight.airline?.name}</Text>
                                <Text style={styles.flightNumText}>
                                  {flight.flight_number} · {flight.aircraft_type}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.topBadgesRow}>
                              {/* Refundable tag */}
                              <View style={styles.refundableTag}>
                                <Ionicons name="shield-checkmark" size={11} color="#059669" />
                                <Text style={styles.refundableTagText}>Refundable</Text>
                              </View>

                              <View style={styles.classBadge}>
                                <Text style={styles.classBadgeText}>{flight.cabin_class}</Text>
                              </View>
                            </View>
                          </View>

                          {/* Card Middle: Route, Times, Layover Duration Badge */}
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
                              {/* Layover duration badge */}
                              <View
                                style={[
                                  styles.layoverBadge,
                                  flight.stops === 0
                                    ? styles.layoverBadgeDirect
                                    : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 3 === 0 ? 40 : (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105))) <= 60
                                    ? styles.shortLayoverBadge
                                    : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105)) >= 420
                                    ? styles.overnightLayoverBadge
                                    : styles.layoverBadgeStop,
                                ]}
                              >
                                <Ionicons
                                  name={flight.stops === 0 ? "flash-outline" : "time-outline"}
                                  size={11}
                                  color={
                                    flight.stops === 0
                                      ? "#059669"
                                      : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 3 === 0 ? 40 : (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105))) <= 60
                                      ? "#DC2626"
                                      : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105)) >= 420
                                      ? "#6D28D9"
                                      : "#D97706"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.layoverBadgeText,
                                    flight.stops === 0
                                      ? styles.layoverTextDirect
                                      : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 3 === 0 ? 40 : (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105))) <= 60
                                      ? styles.shortLayoverText
                                      : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105)) >= 420
                                      ? styles.overnightLayoverText
                                      : styles.layoverTextStop,
                                  ]}
                                >
                                  {flight.stops === 0 ? "Nonstop · Direct" : (
                                    (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 3 === 0 ? 40 : (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105))) <= 60
                                      ? `ছোট কানেকশন ⚠ (${flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 3 === 0 ? 40 : 105)} মি.)`
                                      : (flight.layover_duration_minutes ?? (flight.flight_number.charCodeAt(1) % 2 === 0 ? 510 : 105)) >= 420
                                      ? `রাত্রিকালীন লেওভার 🌙 (${Math.floor((flight.layover_duration_minutes ?? 510)/60)}h)`
                                      : `${flight.stops} Stop · 1h 45m`
                                  )}
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.timeBlock, { alignItems: "flex-end" }]}>
                              <Text style={styles.scheduleTime}>{flight.arrival_time}</Text>
                              <Text style={styles.scheduleCode}>{flight.arrival_airport?.iata_code}</Text>
                              <Text style={styles.scheduleCity}>{flight.arrival_airport?.city}</Text>
                            </View>
                          </View>

                          {/* Baggage Allowance Icons & Amenities */}
                          <View style={styles.perksRow}>
                            {/* Baggage allowance icon */}
                            <View style={styles.baggageIncludedPill}>
                              <Ionicons name="checkmark-circle" size={13} color="#059669" />
                              <Ionicons name="briefcase" size={12} color="#059669" />
                              <Text style={styles.baggageIncludedText}>
                                ব্যাগেজ অন্তর্ভুক্ত: {flight.baggage_allowance || "২০ কেজি চেক-ইন + ৭ কেজি কেবিন"}
                              </Text>
                            </View>

                            <View style={[styles.perkPill, flight.available_seats <= 0 && { backgroundColor: "#FFE4E6" }]}>
                              <Ionicons
                                name={flight.available_seats <= 0 ? "close-circle" : "people-outline"}
                                size={12}
                                color={flight.available_seats <= 0 ? "#E11D48" : "#6B7280"}
                              />
                              <Text style={[styles.perkText, flight.available_seats <= 0 && { color: "#E11D48", fontWeight: "700" }]}>
                                {flight.available_seats <= 0 ? "আসন শেষ (Sold Out)" : `${flight.available_seats} seats left`}
                              </Text>
                            </View>

                            {flight.is_live_db && (
                              <View style={[styles.perkPill, { backgroundColor: "#ECFDF5" }]}>
                                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                <Text style={[styles.perkText, { color: "#10B981" }]}>Verified DB</Text>
                              </View>
                            )}
                          </View>

                          {/* Card Bottom: Total Fare & CTA */}
                          <View style={styles.cardBottomRow}>
                            <View>
                              <View style={styles.priceRow}>
                                <Text style={styles.priceValue}>{formatCurrency(breakdown.total, flight.currency || "BDT")}</Text>
                                <Text style={styles.priceCurrency}> {flight.currency}</Text>
                              </View>
                              <Text style={styles.priceSubtitle}>{formatCurrency(breakdown.perPerson, flight.currency || "BDT")}/pax · {formatPlural(breakdown.totalPax, "passenger")}</Text>
                            </View>

                            <View style={styles.actionButtonsRow}>
                              <Pressable
                                style={[
                                  styles.compareFlightBtn,
                                  compareFlightIds.includes(flight.id) && styles.compareFlightBtnActive,
                                ]}
                                onPress={() => toggleCompareFlight(flight.id)}
                              >
                                <Ionicons
                                  name={compareFlightIds.includes(flight.id) ? "checkmark" : "git-compare-outline"}
                                  size={13}
                                  color={compareFlightIds.includes(flight.id) ? "#ffffff" : "#2563eb"}
                                />
                                <Text
                                  style={[
                                    styles.compareFlightBtnText,
                                    compareFlightIds.includes(flight.id) && styles.compareFlightBtnTextActive,
                                  ]}
                                >
                                  {compareFlightIds.includes(flight.id) ? "যোগ হয়েছে" : "তুলনা"}
                                </Text>
                              </Pressable>
                              <Pressable
                                style={styles.detailsBtn}
                                onPress={() => openFlightDetails(flight)}
                              >
                                <Text style={styles.detailsBtnText}>Fare Breakdown</Text>
                              </Pressable>

                              <Pressable
                                style={[styles.selectFlightBtn, isSelectedForBooking && { opacity: 0.7 }]}
                                disabled={isSelectedForBooking}
                                onPress={() => openFlightDetails(flight)}
                              >
                                <Text style={styles.selectFlightBtnText}>Select</Text>
                                <RTLIcon name="chevron-forward" size={14} color="#FFFFFF" style={{ marginStart: 2 }} />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
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
                      key={`${routeItem.from}-${routeItem.to}-${(routeItem as any).id || idx}`}
                      style={styles.inspirationCard}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const originFound =
                          allDbAirports.find((a) => a.code === routeItem.from) ||
                          POPULAR_AIRPORTS.find((a) => a.code === routeItem.from);
                        const destFound =
                          allDbAirports.find((a) => a.code === routeItem.to) ||
                          POPULAR_AIRPORTS.find((a) => a.code === routeItem.to);
                        if (originFound && destFound) {
                          setOriginAirport(originFound);
                          setDestAirport(destFound);
                          setOriginInputText(originFound.code);
                          setDestInputText(destFound.code);
                        }
                      }}
                    >
                      <View style={styles.inspRouteRow}>
                        <Text style={styles.inspCode}>{routeItem.from}</Text>
                        <Ionicons name="airplane" size={14} color={TRIP_BLUE} style={{ marginHorizontal: 6 }} />
                        <Text style={styles.inspCode}>{routeItem.to}</Text>
                      </View>
                      <Text style={styles.inspCarrier}>
                        {routeItem.carrier} · {routeItem.time}
                      </Text>
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>


      {/* =========================================================================
          Airport Full Modal Selector with 300ms Debounce & Popular Hubs
         ========================================================================= */}
      <Modal
        visible={showAirportModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAirportModal(false)}
      >
        <SafeAreaView style={styles.modalShell}>
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
              Select {airportModalMode === "departure" ? "Origin" : "Destination"} Airport
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Field with 300ms Debounce */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginEnd: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search airport code (DAC, BKK, DXB...), city, or airport"
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

          {/* Quick Hub Filter Chips */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsSectionLabel}>Global Hub Airports:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {["DAC", "BKK", "DXB", "SIN", "LHR", "JFK", "PVG", "HND", "DOH", "KUL"].map((code) => {
                const targetAirport =
                  allDbAirports.find((a) => a.code === code) || POPULAR_AIRPORTS.find((a) => a.code === code);
                const isSelected =
                  (airportModalMode === "departure" ? originAirport.code : destAirport.code) === code;

                return (
                  <Pressable
                    key={code}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => {
                      if (targetAirport) {
                        handleSelectModalAirport(targetAirport);
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
            {filteredModalAirports.length === 0 ? (
              <View style={styles.emptyAirportState}>
                <Ionicons name="airplane-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyAirportText}>No airports matching "{airportSearchQuery}"</Text>
              </View>
            ) : (
              filteredModalAirports.map((airport) => {
                const isSelected =
                  (airportModalMode === "departure" ? originAirport.code : destAirport.code) === airport.code;

                return (
                  <Pressable
                    key={airport.code}
                    style={[styles.airportItemRow, isSelected && styles.airportItemRowActive]}
                    onPress={() => handleSelectModalAirport(airport)}
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
                      <Ionicons name="checkmark-circle" size={22} color={TRIP_BLUE} style={{ marginStart: 8 }} />
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
          Departure & Return Date Picker Modal (Dynamic Dates)
         ========================================================================= */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <SafeAreaView style={styles.modalShell}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePickerModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </Pressable>
            <Text style={styles.modalTitle}>Select Travel Dates</Text>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={{ color: TRIP_BLUE, fontWeight: "700", fontSize: 15 }}>Done</Text>
            </Pressable>
          </View>

          {/* Mode Selector */}
          <View style={styles.datePickerModeTabs}>
            <Pressable
              style={[
                styles.datePickerModeTab,
                datePickerMode === "departure" && styles.datePickerModeTabActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setDatePickerMode("departure");
              }}
            >
              <Text style={styles.datePickerModeLabel}>Departure Date</Text>
              <Text style={[styles.datePickerModeVal, datePickerMode === "departure" && styles.datePickerModeValActive]}>
                {selectedDate}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.datePickerModeTab,
                datePickerMode === "return" && styles.datePickerModeTabActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setDatePickerMode("return");
              }}
            >
              <Text style={styles.datePickerModeLabel}>Return Date (Optional)</Text>
              <Text style={[styles.datePickerModeVal, datePickerMode === "return" && styles.datePickerModeValActive]}>
                {returnDate}
              </Text>
            </Pressable>
          </View>

          {/* Quick Date Presets */}
          <View style={styles.quickDateChipsRow}>
            {[
              { label: "Tomorrow", offsetDays: 1 },
              { label: "+3 Days", offsetDays: 3 },
              { label: "+7 Days", offsetDays: 7 },
              { label: "+14 Days", offsetDays: 14 },
              { label: "1 Month", offsetDays: 30 },
            ].map((preset) => (
              <Pressable
                key={preset.label}
                style={styles.quickDateChip}
                onPress={() => {
                  Haptics.selectionAsync();
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + preset.offsetDays);
                  if (datePickerMode === "departure") {
                    setDepartureDateObj(targetDate);
                  } else {
                    setReturnDateObj(targetDate);
                  }
                }}
              >
                <Text style={styles.quickDateChipText}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Calendar Grid (Next 30 Days dynamically generated from today) */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingHorizontal: 16 }}>
            <Text style={styles.calendarMonthHeading}>Available Departures (Next 30 Days)</Text>
            <View style={styles.calendarDaysGrid}>
              {Array.from({ length: 30 }).map((_, idx) => {
                const dayDate = new Date(today);
                dayDate.setDate(dayDate.getDate() + idx + 1);
                const dayNum = dayDate.getDate();
                const dayName = formatLocalizedDate(dayDate, { weekday: "short" });
                const fullFormatted = formatDisplayDate(dayDate);
                const isSelected =
                  datePickerMode === "departure"
                    ? selectedDate === fullFormatted
                    : returnDate === fullFormatted;

                return (
                  <Pressable
                    key={fullFormatted || `cal-day-${idx}`}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDayCellActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (datePickerMode === "departure") {
                        setDepartureDateObj(dayDate);
                        if (activeTab === "Round-trip") {
                          setDatePickerMode("return");
                        }
                      } else {
                        setReturnDateObj(dayDate);
                      }
                    }}
                  >
                    <Text style={[styles.calendarDayName, isSelected && styles.calendarDayNameActive]}>
                      {dayName}
                    </Text>
                    <Text style={[styles.calendarDayNum, isSelected && styles.calendarDayNumActive]}>
                      {dayNum}
                    </Text>
                    <Text style={[styles.calendarPriceHint, isSelected && { color: "#FFFFFF" }]}>
                      ${240 + (idx % 5) * 20}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.datePickerFooter}>
            <Pressable
              style={styles.confirmDateBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={styles.confirmDateBtnText}>Apply Selected Dates</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          Passengers & Cabin Class Configuration Modal
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

              {/* Cabin Class Options */}
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
          Requirement 4: Fare Breakdown Drawer (Bottom Sheet)
          Displays Base Fare, Airport Taxes, Fuel Surcharge, Carbon Offset
          with "Select Flight" dispatching to useBookingStore
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
                    {/* Route Schedule Timeline */}
                    <View style={styles.drawerTimelineCard}>
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTime}>{selectedFlightForDetails.departure_time}</Text>
                          <Text style={styles.timelineAirport}>
                            {selectedFlightForDetails.departure_airport?.name} (
                            {selectedFlightForDetails.departure_airport?.iata_code})
                          </Text>
                          <Text style={styles.timelineCity}>
                            {selectedFlightForDetails.departure_airport?.city}, Terminal 1
                          </Text>
                        </View>
                      </View>

                      <View style={styles.timelineDurationRow}>
                        <View style={styles.timelineVLine} />
                        <View style={styles.layoverNoticeBox}>
                          <Ionicons
                            name={selectedFlightForDetails.stops === 0 ? "checkmark-circle" : "time-outline"}
                            size={16}
                            color={selectedFlightForDetails.stops === 0 ? ACCENT_GREEN : ACCENT_ORANGE}
                          />
                          <View style={{ marginStart: 6, flex: 1 }}>
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
                            {selectedFlightForDetails.arrival_airport?.name} (
                            {selectedFlightForDetails.arrival_airport?.iata_code})
                          </Text>
                          <Text style={styles.timelineCity}>
                            {selectedFlightForDetails.arrival_airport?.city}, Terminal 2
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Requirement 4: Live Itemized Fare Breakdown Matrix */}
                    {(() => {
                      const breakdown = calculateFareBreakdown(
                        selectedFlightForDetails,
                        passengers,
                        cabinClass,
                        includeCarbonOffset
                      );
                      return (
                        <View style={styles.fareMatrixContainer}>
                          <View style={styles.fareMatrixHeader}>
                            <Ionicons name="receipt-outline" size={18} color={TRIP_BLUE} />
                            <Text style={styles.fareMatrixTitle}>Itemized Live Fare Breakdown</Text>
                          </View>

                          <View style={styles.fareMatrixList}>
                            {/* 1. Base Fare */}
                            <View style={styles.fareMatrixRow}>
                              <View style={styles.fareItemCol}>
                                <View style={styles.fareItemTitleRow}>
                                  <Ionicons name="airplane-outline" size={15} color="#4B5563" />
                                  <Text style={styles.fareItemTitle}>Base Fare</Text>
                                </View>
                                <Text style={styles.fareItemDesc}>
                                  {passengers.adults} Adult{passengers.adults > 1 ? "s" : ""}
                                  {passengers.children > 0 ? `, ${passengers.children} Child(ren)` : ""}
                                  {passengers.infants > 0 ? `, ${passengers.infants} Infant(s)` : ""} ·{" "}
                                  {selectedFlightForDetails.cabin_class}
                                </Text>
                              </View>
                              <Text style={styles.fareItemValue}>
                                {formatCurrency(breakdown.baseFare, selectedFlightForDetails.currency || "BDT")}
                              </Text>
                            </View>

                            {/* 2. Airport Taxes */}
                            <View style={styles.fareMatrixRow}>
                              <View style={styles.fareItemCol}>
                                <View style={styles.fareItemTitleRow}>
                                  <Ionicons name="business-outline" size={15} color="#4B5563" />
                                  <Text style={styles.fareItemTitle}>Airport Taxes & Security</Text>
                                </View>
                                <Text style={styles.fareItemDesc}>
                                  Civil aviation authority security fee & passenger facility charge (12%)
                                </Text>
                              </View>
                              <Text style={styles.fareItemValue}>
                                {formatCurrency(breakdown.airportTaxes, selectedFlightForDetails.currency || "BDT")}
                              </Text>
                            </View>

                            {/* 3. Fuel Surcharge */}
                            <View style={styles.fareMatrixRow}>
                              <View style={styles.fareItemCol}>
                                <View style={styles.fareItemTitleRow}>
                                  <Ionicons name="flame-outline" size={15} color="#E11D48" />
                                  <Text style={styles.fareItemTitle}>Fuel Surcharge (YQ/YR)</Text>
                                </View>
                                <Text style={styles.fareItemDesc}>
                                  Carrier jet fuel fluctuation rate adjustment (8%)
                                </Text>
                              </View>
                              <Text style={styles.fareItemValue}>
                                {formatCurrency(breakdown.fuelSurcharge, selectedFlightForDetails.currency || "BDT")}
                              </Text>
                            </View>

                            {/* 4. Carbon Offset (with toggle) */}
                            <View style={styles.fareMatrixRow}>
                              <View style={styles.fareItemCol}>
                                <View style={styles.fareItemTitleRow}>
                                  <Ionicons name="leaf-outline" size={15} color="#10B981" />
                                  <Text style={styles.fareItemTitle}>Carbon Offset Contribution</Text>
                                  <Pressable
                                    style={styles.carbonToggleBtn}
                                    onPress={() => {
                                      Haptics.selectionAsync();
                                      setIncludeCarbonOffset(!includeCarbonOffset);
                                    }}
                                  >
                                    <Ionicons
                                      name={includeCarbonOffset ? "checkbox" : "square-outline"}
                                      size={18}
                                      color={TRIP_BLUE}
                                    />
                                  </Pressable>
                                </View>
                                <Text style={styles.fareItemDesc}>
                                  IATA-verified green flight carbon neutralization (
                                  {breakdown.currencySymbol}
                                  {selectedFlightForDetails.currency?.toUpperCase() === "BDT"
                                    ? FARE_RULES.CARBON_OFFSET_BDT
                                    : FARE_RULES.CARBON_OFFSET_USD}
                                  /pax)
                                </Text>
                              </View>
                              <Text style={styles.fareItemValue}>
                                {formatCurrency(breakdown.carbonOffset, selectedFlightForDetails.currency || "BDT")}
                              </Text>
                            </View>

                            <View style={styles.fareMatrixDivider} />

                            {/* Total Fare */}
                            <View style={styles.fareMatrixTotalRow}>
                              <View>
                                <Text style={styles.fareMatrixTotalLabel}>Total Fare (All taxes & fees included)</Text>
                                <Text style={styles.fareMatrixPerPerson}>
                                  {formatCurrency(breakdown.perPerson, selectedFlightForDetails.currency || "BDT")} / {formatPlural(1, "passenger")}
                                </Text>
                              </View>
                              <Text style={styles.fareMatrixTotalValue}>{formatCurrency(breakdown.total, selectedFlightForDetails.currency || "BDT")}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* Baggage Allowance Section */}
                    <View style={styles.drawerSectionBox}>
                      <View style={styles.drawerSectionHeader}>
                        <Ionicons name="bag-handle" size={18} color={TRIP_BLUE} />
                        <Text style={styles.drawerSectionTitle}>Baggage Allowance</Text>
                      </View>
                      <View style={styles.baggageItemRow}>
                        <Ionicons name="briefcase-outline" size={16} color="#4B5563" />
                        <View style={{ marginStart: 10, flex: 1 }}>
                          <Text style={styles.baggageItemTitle}>Cabin / Hand Luggage</Text>
                          <Text style={styles.baggageItemDetail}>1 x 7 kg (55 x 40 x 20 cm) carry-on included</Text>
                        </View>
                        <Text style={styles.includedTag}>Included</Text>
                      </View>
                      <View style={styles.baggageItemRow}>
                        <Ionicons name="cube-outline" size={16} color="#4B5563" />
                        <View style={{ marginStart: 10, flex: 1 }}>
                          <Text style={styles.baggageItemTitle}>Check-in Baggage</Text>
                          <Text style={styles.baggageItemDetail}>{selectedFlightForDetails.baggage_allowance}</Text>
                        </View>
                        <Text style={styles.includedTag}>Included</Text>
                      </View>
                    </View>

                    {/* Cancellation & Refund Policy */}
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
                          Date changes permitted with fare difference up to 12 hours before departure.
                        </Text>
                      </View>
                      <View style={styles.policyRow}>
                        <Ionicons name="cash-outline" size={16} color="#4B5563" />
                        <Text style={styles.policyText}>
                          Refundable ticket: Partial or full refund subject to carrier terms.
                        </Text>
                      </View>
                    </View>
                  </ScrollView>

                  {/* Drawer Footer with "Select Flight" Button dispatching to useBookingStore */}
                  <View style={styles.drawerFooterBar}>
                    {(() => {
                      const breakdown = calculateFareBreakdown(
                        selectedFlightForDetails,
                        passengers,
                        cabinClass,
                        includeCarbonOffset
                      );
                      const isSelected = bookingInProgress === selectedFlightForDetails.id;
                      return (
                        <>
                          <View>
                            <Text style={styles.footerPriceLabel}>Total Amount</Text>
                            <Text style={styles.footerPriceValue}>{formatCurrency(breakdown.total, selectedFlightForDetails.currency || "BDT")}</Text>
                          </View>
                          {(() => {
                            const isSoldOut = selectedFlightForDetails.available_seats <= 0;
                            const isInsufficient = selectedFlightForDetails.available_seats < totalPassengersCount;
                            const isBlocked = isSelected || isSoldOut || isInsufficient;

                            return (
                              <Pressable
                                style={[
                                  styles.reserveCTAButton,
                                  isBlocked && !isSelected && { backgroundColor: "#94A3B8" },
                                  isSelected && { opacity: 0.7 },
                                ]}
                                disabled={isBlocked}
                                onPress={() => handleSelectFlight(selectedFlightForDetails)}
                              >
                                {isSelected ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : isSoldOut ? (
                                  <>
                                    <Ionicons name="ban" size={18} color="#FFFFFF" style={{ marginEnd: 6 }} />
                                    <Text style={styles.reserveCTAButtonText}>আসন শেষ (Sold Out)</Text>
                                  </>
                                ) : isInsufficient ? (
                                  <>
                                    <Ionicons name="alert-circle" size={18} color="#FFFFFF" style={{ marginEnd: 6 }} />
                                    <Text style={styles.reserveCTAButtonText}>আসন অপর্যাপ্ত (মাত্র {selectedFlightForDetails.available_seats}টি বাকি)</Text>
                                  </>
                                ) : (
                                  <>
                                    <Text style={styles.reserveCTAButtonText}>Select Flight</Text>
                                    <RTLIcon name="arrow-forward" size={18} color="#FFFFFF" style={{ marginStart: 6 }} />
                                  </>
                                )}
                              </Pressable>
                            );
                          })()}
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
      {/* Floating Compare Action Bar */}
      {compareFlightIds.length > 0 && (
        <View style={styles.floatingCompareBar}>
          <Pressable
            style={styles.floatingCompareBtn}
            onPress={() => setShowCompareModal(true)}
          >
            <Ionicons name="git-compare-outline" size={18} color="#ffffff" />
            <Text style={styles.floatingCompareBtnText}>
              {compareFlightIds.length}টি ফ্লাইট তুলনা করুন
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </Pressable>
          <Pressable
            style={styles.floatingCompareClose}
            onPress={() => setCompareFlightIds([])}
          >
            <Ionicons name="close" size={18} color="#ffffff" />
          </Pressable>
        </View>
      )}

      {/* Side-by-Side Comparison Modal */}
      <ComparisonModal
        visible={showCompareModal}
        items={flightCompareItems}
        onClose={() => setShowCompareModal(false)}
        onRemoveItem={(id) => setCompareFlightIds((prev) => prev.filter((x) => x !== id))}
        onClearAll={() => setCompareFlightIds([])}
        onBookItem={(item) => {
          const flight = filteredAndSortedFlights.find((f) => f.id === item.id);
          if (flight) openFlightDetails(flight);
        }}
      />
    </SafeAreaView>
  );
}

export default FlightsScreen;

// ============================================================================
// Stylesheet
// ============================================================================

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  compareFlightBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  compareFlightBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  compareFlightBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  compareFlightBtnTextActive: {
    color: "#ffffff",
  },
  floatingCompareBar: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 999,
  },
  floatingCompareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.3)" } : {}),
  },
  floatingCompareBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  floatingCompareClose: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.3)" } : {}),
  },
  keyboardContainer: {
    flex: 1,
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
    fontSize: 12,
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
    maxWidth: "65%",
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 14px rgba(15, 23, 42, 0.1)" } : {}),
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
  cityInputRowWrap: {
    position: "relative",
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
    fontSize: 12,
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
  airportCodeInput: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    minWidth: 70,
    paddingVertical: 2,
  },
  clearInputBtn: {
    padding: 2,
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
    fontSize: 12,
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.08)" } : {}),
    zIndex: 10,
  },
  autocompleteDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    padding: 8,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.12)" } : {}),
    zIndex: 30,
  },
  autocompleteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 4,
  },
  autocompleteHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
    textTransform: "uppercase",
  },
  autocompleteItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    gap: 8,
  },
  autocompleteCodePill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 44,
    alignItems: "center",
  },
  autocompleteCodeText: {
    fontSize: 12,
    fontWeight: "900",
    color: TRIP_BLUE,
  },
  autocompleteCityText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  autocompleteNameText: {
    fontSize: 12,
    color: "#6B7280",
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
    fontSize: 12,
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
  cabinClassSelectorBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cabinClassSelectorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  cabinSelectorGrid: {
    flexDirection: "row",
    gap: 6,
  },
  cabinSelectorBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cabinSelectorBtnActive: {
    backgroundColor: TRIP_BLUE,
  },
  cabinSelectorBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  cabinSelectorBtnTextActive: {
    color: "#FFFFFF",
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
    fontSize: 12,
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
    marginBottom: 10,
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
    fontSize: 12,
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
  controlsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 10,
  },
  controlHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sortingSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  sortingChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  sortChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sortChipActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  sortChipTextActive: {
    color: "#FFFFFF",
  },
  comparisonTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  comparisonTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  comparisonTabActive: {
    backgroundColor: "#EFF6FF",
    borderColor: TRIP_BLUE,
  },
  comparisonTabTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginTop: 2,
  },
  comparisonTabTitleActive: {
    color: TRIP_BLUE,
  },
  comparisonTabSub: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  comparisonTabSubActive: {
    color: TRIP_BLUE,
  },
  shortLayoverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  shortLayoverText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  overnightLayoverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#C4B5FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  overnightLayoverText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6D28D9",
  },
  baggageIncludedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  baggageIncludedText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#047857",
  },
  filterSection: {
    paddingTop: 2,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: TRIP_BLUE,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  flightCardsList: {
    gap: 14,
  },
  flightTicketCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  cardInnerPadding: {
    padding: 16,
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
    flex: 1,
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
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  topBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refundableTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  refundableTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  classBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 12,
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
    fontSize: 12,
    color: "#6B7280",
  },
  durationBlock: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 12,
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
  layoverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  layoverBadgeDirect: {
    backgroundColor: "#ECFDF5",
  },
  layoverBadgeStop: {
    backgroundColor: "#FEF3C7",
  },
  layoverBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  layoverTextDirect: {
    color: "#059669",
  },
  layoverTextStop: {
    color: "#D97706",
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
  baggageAllowancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  baggageAllowanceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
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
    fontSize: 12,
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
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsBtn: {
    paddingHorizontal: 10,
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
    paddingEnd: 16,
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 5px rgba(15, 23, 42, 0.05)" } : {}),
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
    fontSize: 12,
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
    fontSize: 12,
    color: "#9CA3AF",
  },
  inspPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: TRIP_BLUE,
  },

  // Modal Styles
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
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  chipsRow: {
    gap: 8,
    paddingEnd: 16,
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
    marginEnd: 12,
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

  // Sheet Overlays
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
    fontSize: 12,
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
    fontSize: 12,
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

  // Drawer Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawerSheet: {
    height: "88%",
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
    marginEnd: 12,
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
    marginStart: 4,
    marginEnd: 16,
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
    fontSize: 12,
    color: "#2563EB",
    marginTop: 2,
  },

  // Requirement 4: Itemized Live Fare Breakdown Matrix
  fareMatrixContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  fareMatrixHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 10,
  },
  fareMatrixTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  fareMatrixList: {
    gap: 10,
  },
  fareMatrixRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fareItemCol: {
    flex: 1,
    paddingEnd: 12,
  },
  fareItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fareItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  carbonToggleBtn: {
    padding: 2,
    marginStart: 4,
  },
  fareItemDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  fareItemValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  fareMatrixDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  fareMatrixTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  fareMatrixTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  fareMatrixPerPerson: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  fareMatrixTotalValue: {
    fontSize: 19,
    fontWeight: "900",
    color: TRIP_BLUE,
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
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  includedTag: {
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT_GREEN,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    fontSize: 12,
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
    paddingHorizontal: 22,
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
    fontSize: 15,
    fontWeight: "800",
  },
  datePickerModeTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: "#F8FAFC",
  },
  datePickerModeTab: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  datePickerModeTabActive: {
    borderColor: TRIP_BLUE,
    backgroundColor: "#EFF6FF",
  },
  datePickerModeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  datePickerModeVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  datePickerModeValActive: {
    color: TRIP_BLUE,
  },
  quickDateChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  calendarMonthHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 12,
  },
  calendarDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarDayCell: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayCellActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  calendarDayName: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  calendarDayNameActive: {
    color: "#FFFFFF",
  },
  calendarDayNum: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  calendarDayNumActive: {
    color: "#FFFFFF",
  },
  calendarPriceHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  datePickerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  confirmDateBtn: {
    backgroundColor: TRIP_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmDateBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
