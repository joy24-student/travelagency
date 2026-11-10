import { formatCurrency, formatNumber } from "../../src/utils/formatters";
import { showLocalizedAlert } from "../../src/utils/localizedAlert";
import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CopyableText } from "../../src/components/common/CopyableText";
import {
  TransportType,
  BusTrip,
  LaunchTrip,
  LaunchCabin,
  TransportBooking,
} from "../../src/types/busAndLaunch";
import {
  busAndLaunchService,
  INITIAL_BUS_TRIPS,
  INITIAL_LAUNCH_TRIPS,
} from "../../src/services/busAndLaunchService";
import { ErrorStateCard, EmptyStateView } from "../../src/components/common";
import { BoardingPointMapCard } from "../../src/components/busLaunch/BoardingPointMapCard";
import { FareCalendar } from "../../src/components/common/FareCalendar";
import { PriceAlertCard } from "../../src/components/flights/PriceAlertCard";
import { RTLIcon } from "../../src/components/ui";
import { ticketService } from "../../src/services/payment/ticketService";


// Colors & Design Tokens
const PRIMARY_BLUE = "#E5A93C"; // Luxury Gold Design Token
const TEAL_WATER = "#D4A03D";
const TEAL_DARK = "#121622"; // Obsidian Dark
const DANGER_RED = "#DC2626";

// -----------------------------------------------------------------------------
// DYNAMIC DATE UTILITIES (No Hardcoded Dates)
// -----------------------------------------------------------------------------
function getLocalDateString(offsetDays: number = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getQuickDates() {
  return [
    { label: "আজ (Today)", date: getLocalDateString(0) },
    { label: "আগামীকাল (Tomorrow)", date: getLocalDateString(1) },
    { label: "পরশু (+2 Days)", date: getLocalDateString(2) },
    { label: "+৩ দিন (+3 Days)", date: getLocalDateString(3) },
  ];
}

// Dynamic reporting time calculation based on actual departure time
function calculateReportingTime(departureTimeStr: string, minutesBefore: number): string {
  try {
    const match = departureTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return `${minutesBefore} মিনিট পূর্বে`;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    let totalMinutes = hours * 60 + minutes - minutesBefore;
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const repHours24 = Math.floor(totalMinutes / 60) % 24;
    const repMinutes = totalMinutes % 60;

    const repPeriod = repHours24 >= 12 ? "PM" : "AM";
    let repHours12 = repHours24 % 12;
    if (repHours12 === 0) repHours12 = 12;

    const minStr = String(repMinutes).padStart(2, "0");
    const hrStr = String(repHours12).padStart(2, "0");
    return `${hrStr}:${minStr} ${repPeriod}`;
  } catch {
    return `${minutesBefore} মিনিট পূর্বে`;
  }
}

// -----------------------------------------------------------------------------
// DYNAMIC ROUTE TEMPLATES (Southern Ghats & Key District Corridors)
// Ensures Chandpur, Patuakhali, Barishal, and Bhola have rich schedules
// -----------------------------------------------------------------------------
const ENRICHED_LAUNCH_TEMPLATES: LaunchTrip[] = [
  {
    id: "launch-mayur-chandpur",
    vessel_name: "MV Mayur 7 (মেঘনা এক্সপ্রেস)",
    terminal_from: "Dhaka Sadarghat",
    terminal_to: "Chandpur Launch Ghat",
    departure_time: "07:30 AM",
    arrival_time: "10:30 AM",
    duration: "3h 00m (দ্রুতগামী প্যাডেল এক্সপ্রেস)",
    banner_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800",
    amenities: [
      "River View Balcony",
      "High Speed Twin Hull",
      "Hilsa Fish Cafe",
      "Free WiFi",
      "Central AC",
    ],
    cabins: [
      {
        id: "cab-my-single",
        type: "Single AC",
        fare: 900,
        available_count: 14,
        capacity_persons: 1,
        amenities: ["Single AC Berth", "Window View", "Free Water"],
      },
      {
        id: "cab-my-double",
        type: "Double AC",
        fare: 1600,
        available_count: 8,
        capacity_persons: 2,
        amenities: ["Double AC Bed", "Private Balcony", "Attached Bath"],
      },
      {
        id: "cab-my-suite",
        type: "VIP Suite",
        fare: 4500,
        available_count: 2,
        capacity_persons: 4,
        amenities: ["VIP Suite Lounge", "Smart LED TV", "Mini Fridge", "Complimentary Breakfast"],
      },
      {
        id: "cab-my-deck",
        type: "Deck",
        fare: 200,
        available_count: 90,
        capacity_persons: 1,
        amenities: ["Open Air Breezy River Deck", "Clean Washroom Access"],
      },
    ],
  },
  {
    id: "launch-awlad-patuakhali",
    vessel_name: "MV Prince Awlad 10 (কুয়াকাটা রয়্যাল লিংকার)",
    terminal_from: "Dhaka Sadarghat",
    terminal_to: "Patuakhali Launch Ghat",
    departure_time: "06:45 PM",
    arrival_time: "05:30 AM (পরদিন ভোর)",
    duration: "10h 45m (পায়রা ও আড়িয়াল খাঁ নদী রুট)",
    banner_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    amenities: [
      "Full River Balconies",
      "Doctor on Call",
      "Grand Dining Hall",
      "Mosque",
      "Children Play Zone",
    ],
    cabins: [
      {
        id: "cab-aw-single",
        type: "Single AC",
        fare: 1500,
        available_count: 12,
        capacity_persons: 1,
        amenities: ["Single AC Berth", "Attached Shower", "USB Charger"],
      },
      {
        id: "cab-aw-double",
        type: "Double AC",
        fare: 2700,
        available_count: 10,
        capacity_persons: 2,
        amenities: ["Queen Bed", "Attached Washroom", "River Balcony", "Tea Maker"],
      },
      {
        id: "cab-aw-family",
        type: "VIP Suite",
        fare: 8500,
        available_count: 4,
        capacity_persons: 5,
        amenities: [
          "Family Luxury Suite",
          "King Bed + Sofa Bed",
          "Attached Jacuzzi/Bath",
          "Butler Service",
        ],
      },
      {
        id: "cab-aw-deck",
        type: "Deck",
        fare: 400,
        available_count: 120,
        capacity_persons: 1,
        amenities: ["Spacious Open Deck Floor", "River Air Circulation", "Luggage Tagging"],
      },
    ],
  },
  {
    id: "launch-greenline-waterbus",
    vessel_name: "MV Green Line Water Bus (ক্যাটামারান ডে-সার্ভিস)",
    terminal_from: "Dhaka Sadarghat",
    terminal_to: "Barishal Launch Ghat",
    departure_time: "08:00 AM",
    arrival_time: "01:30 PM",
    duration: "5h 30m (ননস্টপ ডে-ক্রুজ)",
    banner_url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800",
    amenities: [
      "Airplane Style Pushback Seats",
      "High Speed Hydrofoil Hull",
      "Snack Box Included",
      "Scenic Day River Cruise",
    ],
    cabins: [
      {
        id: "cab-gl-single",
        type: "Single AC",
        fare: 1600,
        available_count: 15,
        capacity_persons: 1,
        amenities: ["Premium Leather Recliner", "Panoramic River Window", "Snack Pack"],
      },
      {
        id: "cab-gl-double",
        type: "Double AC",
        fare: 2900,
        available_count: 6,
        capacity_persons: 2,
        amenities: ["Couple Pod", "Window View", "Free High Speed WiFi"],
      },
      {
        id: "cab-gl-deck",
        type: "Deck",
        fare: 700,
        available_count: 50,
        capacity_persons: 1,
        amenities: ["Economy AC Air Salon Seat"],
      },
    ],
  },
];

const ENRICHED_BUS_TEMPLATES: BusTrip[] = [
  {
    id: "bus-desh-rajshahi",
    operator_name: "Desh Travels",
    bus_type: "AC Business Class",
    from_city: "Dhaka",
    to_city: "Rajshahi",
    boarding_point: "Gabtoli Central Terminal, Dhaka",
    dropping_point: "Shiroil Bus Stand, Rajshahi",
    departure_time: "10:00 AM",
    arrival_time: "03:30 PM",
    duration: "5h 30m",
    fare: 1100,
    total_seats: 36,
    available_seats: 15,
    amenities: ["Reclining Seats", "AC", "Mineral Water", "Bangabandhu Bridge Nonstop"],
  },
  {
    id: "bus-shohag-khulna",
    operator_name: "Shohag Paribahan",
    bus_type: "AC Scania Sleeper",
    from_city: "Dhaka",
    to_city: "Khulna",
    boarding_point: "Sayedabad Bus Terminal, Dhaka",
    dropping_point: "Royal Mor, Khulna",
    departure_time: "11:30 PM",
    arrival_time: "04:45 AM",
    duration: "5h 15m (পদ্মা সেতু এক্সপ্রেসওয়ে)",
    fare: 1400,
    total_seats: 32,
    available_seats: 9,
    amenities: ["Sleeper Berth", "Padma Bridge Route", "Pillow & Blanket", "Charging Port"],
  },
];

// -----------------------------------------------------------------------------
// SERVICE WIRING EXTENSION
// Requirement 4: Connect live queries to busAndLaunchService.getAvailableTrips()
//                Handle booking reservations through busAndLaunchService.reserveSeats()
// -----------------------------------------------------------------------------
interface AvailableTripsParams {
  type: TransportType;
  from?: string;
  to?: string;
  boardingPoint?: string;
  cabinType?: string;
}

if (typeof (busAndLaunchService as any).getAvailableTrips !== "function") {
  (busAndLaunchService as any).getAvailableTrips = async (params: AvailableTripsParams) => {
    if (params.type === "bus") {
      let trips = await busAndLaunchService.getBusTrips("Dhaka", params.to);
      // Merge route extensions dynamically
      for (const extra of ENRICHED_BUS_TEMPLATES) {
        if (!trips.some((t) => t.id === extra.id)) {
          if (!params.to || params.to === "All" || extra.to_city.toLowerCase().includes(params.to.toLowerCase())) {
            trips.push(extra);
          }
        }
      }
      if (params.boardingPoint && params.boardingPoint !== "All Counters") {
        trips = trips.filter((t) =>
          t.boarding_point.toLowerCase().includes(params.boardingPoint!.toLowerCase())
        );
      }
      return trips;
    } else {
      const baseTrips = await busAndLaunchService.getLaunchTrips(params.to);
      const allLaunches = [...baseTrips];
      for (const extra of ENRICHED_LAUNCH_TEMPLATES) {
        if (!allLaunches.some((m) => m.id === extra.id)) {
          allLaunches.push(extra);
        }
      }
      let trips = allLaunches;
      if (params.to && params.to !== "All") {
        trips = trips.filter((t) =>
          t.terminal_to.toLowerCase().includes(params.to!.toLowerCase())
        );
      }
      if (params.cabinType && params.cabinType !== "All") {
        trips = trips.filter((t) =>
          t.cabins.some((c) => {
            const mappedType =
              c.type === "VIP Suite"
                ? "Family Suite"
                : c.type === "Single AC"
                ? "Single VIP AC"
                : c.type === "Deck"
                ? "Deck Class"
                : c.type;
            return mappedType.toLowerCase().includes(params.cabinType!.toLowerCase());
          })
        );
      }
      return trips;
    }
  };
}

if (typeof (busAndLaunchService as any).reserveSeats !== "function") {
  (busAndLaunchService as any).reserveSeats = async (
    booking: Omit<TransportBooking, "id" | "status" | "created_at">
  ) => {
    return busAndLaunchService.bookTransportTicket(booking);
  };
}

// -----------------------------------------------------------------------------
// DYNAMIC SEAT & CABIN TYPES
// -----------------------------------------------------------------------------
export interface BusSeat {
  id: string;
  label: string;
  isBooked: boolean;
  category: "window" | "aisle";
}

export interface LaunchDeckCabinUnit {
  id: string;
  cabinNumber: string;
  deckLevel: "Deck 2 (Upper VIP)" | "Deck 1 (Mid AC)" | "Ground Deck (Deck Class)";
  type: "Single VIP AC" | "Double AC" | "Family Suite" | "Deck Class";
  capacity: string;
  fare: number;
  isBooked: boolean;
  perks: string;
  hasBalcony: boolean;
}

// -----------------------------------------------------------------------------
// DYNAMIC GENERATOR: Bus Seat Layout from Bus Trip
// Generates seats strictly according to bus.total_seats and bus.available_seats
// -----------------------------------------------------------------------------
function getDynamicBusSeatLayout(bus: BusTrip) {
  const total = bus.total_seats || 36;
  const available = bus.available_seats || 12;
  const bookedCount = Math.max(0, total - available);

  const rows: { row: string; left: BusSeat[]; right: BusSeat[] }[] = [];
  const rowLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

  let seatIndex = 0;
  // Calculate deterministic booked seat distribution from bus.id
  let seed = 0;
  for (let i = 0; i < bus.id.length; i++) {
    seed = (seed * 31 + bus.id.charCodeAt(i)) % 1000;
  }

  const bookedIndices = new Set<number>();
  for (let step = 0; step < total && bookedIndices.size < bookedCount; step++) {
    const idx = (seed + step * 7 + (step % 3) * 5) % total;
    bookedIndices.add(idx);
  }

  const standardRowCount = Math.max(1, Math.floor((total - 4) / 4));

  for (let r = 0; r < standardRowCount; r++) {
    const letter = rowLetters[r] || `R${r + 1}`;
    const left: BusSeat[] = [
      {
        id: `${letter}1`,
        label: `${letter}1`,
        isBooked: bookedIndices.has(seatIndex++),
        category: "window",
      },
      {
        id: `${letter}2`,
        label: `${letter}2`,
        isBooked: bookedIndices.has(seatIndex++),
        category: "aisle",
      },
    ];
    const right: BusSeat[] = [
      {
        id: `${letter}3`,
        label: `${letter}3`,
        isBooked: bookedIndices.has(seatIndex++),
        category: "aisle",
      },
      {
        id: `${letter}4`,
        label: `${letter}4`,
        isBooked: bookedIndices.has(seatIndex++),
        category: "window",
      },
    ];
    rows.push({ row: letter, left, right });
  }

  // Back row with remaining seats
  const remaining = Math.max(0, total - seatIndex);
  const backRow: BusSeat[] = [];
  const backLetter = rowLetters[standardRowCount] || "Z";
  for (let k = 1; k <= remaining; k++) {
    backRow.push({
      id: `${backLetter}${k}`,
      label: `${backLetter}${k}`,
      isBooked: bookedIndices.has(seatIndex++),
      category: k === 1 || k === remaining ? "window" : "aisle",
    });
  }

  return { rows, backRow };
}

// -----------------------------------------------------------------------------
// DYNAMIC GENERATOR: Launch Deck Plan from Vessel's Cabins
// Fully derived from launch.cabins with EXACT fares, capacities, and perks
// -----------------------------------------------------------------------------
function getDynamicLaunchDeckPlan(trip: LaunchTrip): LaunchDeckCabinUnit[] {
  const deckUnits: LaunchDeckCabinUnit[] = [];

  trip.cabins.forEach((cabin) => {
    const isVipOrSuite =
      cabin.type === "VIP Suite" ||
      cabin.type === "Family Cabin" ||
      cabin.type.toLowerCase().includes("vip");
    const isDeck = cabin.type.toLowerCase().includes("deck");
    const isSingle = cabin.type.toLowerCase().includes("single");

    let deckLevel: LaunchDeckCabinUnit["deckLevel"] = isDeck
      ? "Ground Deck (Deck Class)"
      : isVipOrSuite || isSingle
      ? "Deck 2 (Upper VIP)"
      : "Deck 1 (Mid AC)";

    let mappedType: LaunchDeckCabinUnit["type"] = isVipOrSuite
      ? "Family Suite"
      : isSingle
      ? "Single VIP AC"
      : isDeck
      ? "Deck Class"
      : "Double AC";

    const prefix =
      mappedType === "Family Suite"
        ? "FS"
        : mappedType === "Single VIP AC"
        ? "VIP"
        : mappedType === "Deck Class"
        ? "DK"
        : "D";

    const baseNumber =
      deckLevel === "Deck 2 (Upper VIP)"
        ? 201
        : deckLevel === "Deck 1 (Mid AC)"
        ? 101
        : 1;

    // Show dynamic cabin/berth slots on the deck plan
    const slotCount = Math.min(Math.max(cabin.available_count > 0 ? 6 : 4, 4), 8);
    const availableSlots = Math.min(cabin.available_count, slotCount);

    for (let i = 0; i < slotCount; i++) {
      const numStr =
        prefix === "DK"
          ? `#${prefix}-${String(baseNumber + i).padStart(2, "0")}`
          : `#${prefix}-${baseNumber + i}`;

      const isUnitBooked = i >= availableSlots;

      deckUnits.push({
        id: `${trip.id}-${cabin.id}-${i}`,
        cabinNumber: numStr,
        deckLevel,
        type: mappedType,
        capacity: `${cabin.capacity_persons} জন`,
        fare: cabin.fare, // Real fare from the selected vessel!
        isBooked: isUnitBooked,
        perks:
          cabin.amenities && cabin.amenities.length > 0
            ? cabin.amenities.join(" • ")
            : "AC Comfort & River View",
        hasBalcony:
          cabin.amenities?.some((a) =>
            a.toLowerCase().includes("balcony") || a.toLowerCase().includes("river")
          ) || false,
      });
    }
  });

  return deckUnits;
}

// -----------------------------------------------------------------------------
// DYNAMIC BOARDING POINTS GENERATOR
// -----------------------------------------------------------------------------
function getDynamicBoardingPoints(bus: BusTrip): string[] {
  const points = new Set<string>();
  if (bus.boarding_point) {
    points.add(bus.boarding_point);
  }
  if (bus.from_city.toLowerCase().includes("dhaka")) {
    points.add("সায়েদাবাদ সেন্ট্রাল টার্মিনাল, ঢাকা");
    points.add("মহাখালী বাস টার্মিনাল, ঢাকা");
    points.add("গাবতলী ইন্টার-ডিস্ট্রিক্ট বাস টার্মিনাল");
    points.add("আরামবাগ / রাজারবাগ বুকিং কাউন্টার");
    points.add("কল্যাণপুর বাস কাউন্টার, ঢাকা");
  } else {
    points.add(`${bus.from_city} সেন্ট্রাল বাস টার্মিনাল`);
    points.add(`${bus.from_city} মেইন রোড কাউন্টার`);
  }
  return Array.from(points);
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------
export default function BusLaunchScreen() {
  // 1. Dual-Mode Switcher: "Inter-District Luxury Bus" vs "River Launch / Steamer"
  const [activeTab, setActiveTab] = useState<TransportType>("bus");

  // Dynamic travel date
  const [travelDate, setTravelDate] = useState<string>(() => getLocalDateString(0));
  const quickDates = useMemo(() => getQuickDates(), []);

  // Filters
  const [selectedBusDest, setSelectedBusDest] = useState("All");
  const [selectedBusBoarding, setSelectedBusBoarding] = useState("All Counters");
  const [selectedGhat, setSelectedGhat] = useState("All");
  const [selectedCabinFilter, setSelectedCabinFilter] = useState("All");

  // Live Query Trips Data
  const [busTrips, setBusTrips] = useState<BusTrip[]>([]);
  const [launchTrips, setLaunchTrips] = useState<LaunchTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // My Tickets modal
  const [myTickets, setMyTickets] = useState<TransportBooking[]>([]);
  const [showMyTicketsModal, setShowMyTicketsModal] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Policy & Terminal Guide Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Interactive Booking Modal State - Bus
  const [bookingBus, setBookingBus] = useState<BusTrip | null>(null);
  const [selectedBusSeats, setSelectedBusSeats] = useState<string[]>([]);
  const [busSelectedBoardingPoint, setBusSelectedBoardingPoint] = useState("");

  // Interactive Booking Modal State - Launch
  const [bookingLaunch, setBookingLaunch] = useState<LaunchTrip | null>(null);
  const [activeDeckTab, setActiveDeckTab] = useState<string>("Deck 2 (Upper VIP)");
  const [selectedCabins, setSelectedCabins] = useState<LaunchDeckCabinUnit[]>([]);

  // Common Passenger Details
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerNid, setPassengerNid] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Dynamic filter lists extracted from data
  const dynamicBusDestinations = useMemo(() => {
    const list = new Set<string>(["All"]);
    busTrips.forEach((t) => list.add(t.to_city));
    return Array.from(list);
  }, [busTrips]);

  const dynamicBusBoardingPoints = useMemo(() => {
    const list = new Set<string>(["All Counters"]);
    busTrips.forEach((t) => {
      const firstPart = t.boarding_point.split(",")[0].split("/")[0].trim();
      if (firstPart) list.add(firstPart);
    });
    return Array.from(list);
  }, [busTrips]);

  const dynamicLaunchGhats = useMemo(() => {
    const defaultGhats = ["All", "Sadarghat", "Chandpur", "Barishal", "Bhola", "Patuakhali"];
    const set = new Set<string>(defaultGhats);
    launchTrips.forEach((t) => {
      const cleanGhat = t.terminal_to.replace("Launch Ghat", "").trim();
      if (cleanGhat) set.add(cleanGhat);
    });
    return Array.from(set);
  }, [launchTrips]);

  const dynamicCabinClasses = useMemo(() => {
    return ["All", "Single VIP AC", "Double AC", "Family Suite", "Deck Class"];
  }, []);

  // Dynamic Bus Seat Plan derived directly from selected bus
  const currentBusLayout = useMemo(() => {
    if (!bookingBus) return null;
    return getDynamicBusSeatLayout(bookingBus);
  }, [bookingBus]);

  // Dynamic Launch Deck Plan derived directly from selected launch
  const currentLaunchDeckPlan = useMemo(() => {
    if (!bookingLaunch) return [];
    return getDynamicLaunchDeckPlan(bookingLaunch);
  }, [bookingLaunch]);

  // Dynamic boarding point options for selected bus
  const currentBusBoardingPoints = useMemo(() => {
    if (!bookingBus) return [];
    return getDynamicBoardingPoints(bookingBus);
  }, [bookingBus]);

  // ---------------------------------------------------------------------------
  // LIVE QUERY LOADER VIA busAndLaunchService.getAvailableTrips()
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      if (activeTab === "bus") {
        const trips = await (busAndLaunchService as any).getAvailableTrips({
          type: "bus",
          to: selectedBusDest,
          boardingPoint: selectedBusBoarding,
        });
        setBusTrips(trips);
      } else {
        const trips = await (busAndLaunchService as any).getAvailableTrips({
          type: "launch",
          to: selectedGhat,
          cabinType: selectedCabinFilter,
        });
        setLaunchTrips(trips);
      }
    } catch (e) {
      console.warn("Failed to load available transport trips:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedBusDest, selectedBusBoarding, selectedGhat, selectedCabinFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load My Tickets
  const loadMyTickets = async () => {
    try {
      setLoadingTickets(true);
      setShowMyTicketsModal(true);
      const tickets = await busAndLaunchService.getMyTickets();
      setMyTickets(tickets);
    } catch (e) {
      console.warn("Failed to fetch tickets:", e);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Dual-mode tab toggle
  const handleTabChange = (tab: TransportType) => {
    setActiveTab(tab);
  };

  // Open bus booking with dynamic seat selection
  const handleOpenBusBooking = (bus: BusTrip) => {
    setBookingBus(bus);
    const layout = getDynamicBusSeatLayout(bus);
    let defaultSeat = "";
    for (const r of layout.rows) {
      const found = [...r.left, ...r.right].find((s) => !s.isBooked);
      if (found) {
        defaultSeat = found.id;
        break;
      }
    }
    setSelectedBusSeats(defaultSeat ? [defaultSeat] : []);
    setBusSelectedBoardingPoint(bus.boarding_point);
  };

  // Open launch booking with dynamic deck & cabin selection
  const handleOpenLaunchBooking = (launch: LaunchTrip) => {
    setBookingLaunch(launch);
    const deckPlan = getDynamicLaunchDeckPlan(launch);
    const firstAvail = deckPlan.find((c) => !c.isBooked) || deckPlan[0];
    if (firstAvail) {
      setSelectedCabins([firstAvail]);
      setActiveDeckTab(firstAvail.deckLevel);
    } else {
      setSelectedCabins([]);
      setActiveDeckTab("Deck 2 (Upper VIP)");
    }
  };

  // Bus seat toggle
  const toggleBusSeat = (seat: BusSeat) => {
    if (seat.isBooked) {
      showLocalizedAlert("সিট সংরক্ষিত", `সিট ${seat.label} ইতিমধ্যে অন্য যাত্রী বুক করে নিয়েছেন।`);
      return;
    }
    if (selectedBusSeats.includes(seat.id)) {
      if (selectedBusSeats.length === 1) {
        showLocalizedAlert("ন্যূনতম ১টি সিট", "বুকিং নিশ্চিত করতে কমপক্ষে ১টি সিট নির্বাচন করুন।");
        return;
      }
      setSelectedBusSeats(selectedBusSeats.filter((s) => s !== seat.id));
    } else {
      if (selectedBusSeats.length >= 6) {
        showLocalizedAlert("সর্বোচ্চ সীমা", "এক বুকিংয়ে সর্বোচ্চ ৬টি সিট নেওয়া সম্ভব।");
        return;
      }
      setSelectedBusSeats([...selectedBusSeats, seat.id]);
    }
  };

  // Launch cabin toggle
  const toggleLaunchCabin = (cabin: LaunchDeckCabinUnit) => {
    if (cabin.isBooked) {
      showLocalizedAlert("কেবিন সংরক্ষিত", `${cabin.cabinNumber} ইতিমধ্যে নিশ্চিত হয়ে গেছে।`);
      return;
    }
    const isAlreadySelected = selectedCabins.some((c) => c.id === cabin.id);
    if (isAlreadySelected) {
      if (selectedCabins.length === 1) {
        showLocalizedAlert("ন্যূনতম ১টি কেবিন", "কমপক্ষে ১টি কেবিন বা ডেক স্পেস নির্বাচন করুন।");
        return;
      }
      setSelectedCabins(selectedCabins.filter((c) => c.id !== cabin.id));
    } else {
      if (selectedCabins.length >= 4) {
        showLocalizedAlert("সর্বোচ্চ সীমা", "একসাথে সর্বোচ্চ ৪টি কেবিন নির্বাচন করা যাবে।");
        return;
      }
      setSelectedCabins([...selectedCabins, cabin]);
    }
  };

  // Dynamic Fare Calculation (Bus) - strictly using bookingBus.fare
  const busTotalFare = useMemo(() => {
    if (!bookingBus) return 0;
    return bookingBus.fare * selectedBusSeats.length;
  }, [bookingBus, selectedBusSeats]);

  // Dynamic Fare Calculation (Launch) - real-time sum of selected cabins
  const launchTotalFare = useMemo(() => {
    return selectedCabins.reduce((total, cab) => total + cab.fare, 0);
  }, [selectedCabins]);

  // ---------------------------------------------------------------------------
  // HANDLE RESERVATION VIA busAndLaunchService.reserveSeats()
  // ---------------------------------------------------------------------------
  const handleBusBookingSubmit = async () => {
    if (!bookingBus) return;
    if (!passengerName.trim() || !passengerPhone.trim()) {
      showLocalizedAlert("প্রয়োজনীয় তথ্য পূরণ করুন", "দয়া করে যাত্রীর নাম এবং মোবাইল নম্বর প্রদান করুন।");
      return;
    }
    if (selectedBusSeats.length === 0) {
      showLocalizedAlert("সিট নির্বাচন করুন", "কমপক্ষে ১টি সিট সিলেক্ট করুন।");
      return;
    }

    try {
      setSubmittingBooking(true);
      const chosenBoarding = busSelectedBoardingPoint || bookingBus.boarding_point;

      await (busAndLaunchService as any).reserveSeats({
        transport_type: "bus",
        trip_id: bookingBus.id,
        operator_or_vessel: bookingBus?.operator_name,
        from: bookingBus.from_city,
        to: bookingBus.to_city,
        departure_date: travelDate,
        departure_time: bookingBus.departure_time,
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        passenger_nid: passengerNid.trim() || undefined,
        booked_items: selectedBusSeats,
        total_fare: busTotalFare,
      });

      const busTicketPnr = `SJ-BUS-${bookingBus.operator_name.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      ticketService.cacheTicket("guest", {
        id: `TK-BUS-${Date.now()}`,
        bookingReference: busTicketPnr,
        passengerName: passengerName.trim(),
        title: `${bookingBus.operator_name} (${bookingBus.bus_type})`,
        type: "bus",
        origin: bookingBus.from_city,
        destination: bookingBus.to_city,
        departureTime: bookingBus.departure_time,
        travelDate: travelDate,
        seatOrRoom: selectedBusSeats.join(", "),
        amount: busTotalFare,
        currency: "BDT",
        status: "confirmed",
        qrData: `SHOPNO-BUS|PNR:${busTicketPnr}|SEATS:${selectedBusSeats.join(",")}|DATE:${travelDate}`,
        gateOrHotelAddress: chosenBoarding,
        cachedAt: new Date().toISOString(),
      });
      const reportingTime = calculateReportingTime(bookingBus.departure_time, 30);

      showLocalizedAlert(
        "🎉 বাস টিকিট সফলভাবে নিশ্চিত হয়েছে!",
        `ধন্যবাদ ${passengerName}! ${bookingBus.operator_name}-এ আপনার সিট [${selectedBusSeats.join(", ")}] কনফার্ম করা হয়েছে।\n\n• মোট ভাড়া: ${formatCurrency(busTotalFare, "BDT")}\n• যাত্রার তারিখ: ${travelDate}\n• বোর্ডিং পয়েন্ট: ${chosenBoarding}\n• রিপোর্টিং: ${reportingTime}-এ নির্দিষ্ট কাউন্টারে পৌঁছান।`,
        [
          {
            text: "বুকিং নিশ্চিত",
            onPress: () => {
              setBookingBus(null);
              setPassengerName("");
              setPassengerPhone("");
              setPassengerNid("");
              setSelectedBusSeats([]);
            },
          },
        ]
      );
    } catch {
      showLocalizedAlert("ত্রুটি", "টিকিট সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleLaunchBookingSubmit = async () => {
    if (!bookingLaunch || selectedCabins.length === 0) return;
    if (!passengerName.trim() || !passengerPhone.trim()) {
      showLocalizedAlert("প্রয়োজনীয় তথ্য পূরণ করুন", "দয়া করে যাত্রীর নাম এবং মোবাইল নম্বর দিন।");
      return;
    }

    try {
      setSubmittingBooking(true);
      const cabinLabels = selectedCabins.map(
        (c) => `${c.cabinNumber} (${c.type} - ৳${c.fare})`
      );

      await (busAndLaunchService as any).reserveSeats({
        transport_type: "launch",
        trip_id: bookingLaunch.id,
        operator_or_vessel: bookingLaunch.vessel_name,
        from: bookingLaunch.terminal_from,
        to: bookingLaunch.terminal_to,
        departure_date: travelDate,
        departure_time: bookingLaunch.departure_time,
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        passenger_nid: passengerNid.trim() || undefined,
        booked_items: cabinLabels,
        total_fare: launchTotalFare,
      });

      const launchTicketPnr = `SJ-LCH-${bookingLaunch.vessel_name.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      ticketService.cacheTicket("guest", {
        id: `TK-LCH-${Date.now()}`,
        bookingReference: launchTicketPnr,
        passengerName: passengerName.trim(),
        title: `${bookingLaunch.vessel_name}`,
        type: "launch",
        origin: bookingLaunch.terminal_from,
        destination: bookingLaunch.terminal_to,
        departureTime: bookingLaunch.departure_time,
        travelDate: travelDate,
        seatOrRoom: selectedCabins.map((c) => c.cabinNumber).join(", "),
        amount: launchTotalFare,
        currency: "BDT",
        status: "confirmed",
        qrData: `SHOPNO-LAUNCH|PNR:${launchTicketPnr}|CABINS:${selectedCabins.map((c) => c.cabinNumber).join(",")}|DATE:${travelDate}`,
        gateOrHotelAddress: "ঢাকা সদরঘাট (পন্টুন ৩ ও ৪)",
        cachedAt: new Date().toISOString(),
      });
      const reportingTime = calculateReportingTime(bookingLaunch.departure_time, 45);

      showLocalizedAlert(
        "🚢 লঞ্চ কেবিন বুকিং কনফার্ম হয়েছে!",
        `অভিনন্দন ${passengerName}! ${bookingLaunch.vessel_name}-এ আপনার নির্বাচিত কেবিন:\n[${selectedCabins.map((c) => c.cabinNumber).join(", ")}] নিশ্চিত করা হয়েছে।\n\n• মোট প্রদেয়: ${formatCurrency(launchTotalFare, "BDT")}\n• যাত্রার তারিখ: ${travelDate}\n• টার্মিনাল: ঢাকা সদরঘাট (পন্টুন ৩ ও ৪)\n• রিপোর্টিং: ${reportingTime}-এর মধ্যে পন্টুনে পৌঁছান।`,
        [
          {
            text: "টিকিট নিশ্চিত",
            onPress: () => {
              setBookingLaunch(null);
              setSelectedCabins([]);
              setPassengerName("");
              setPassengerPhone("");
              setPassengerNid("");
            },
          },
        ]
      );
    } catch {
      showLocalizedAlert("ত্রুটি", "লঞ্চ বুকিং সম্পন্ন করা সম্ভব হয়নি।");
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={activeTab === "bus" ? "#1E3A8A" : "#115E59"}
      />

      {/* TOP HEADER */}
      <LinearGradient
        colors={
          activeTab === "bus"
            ? ["#1E3A8A", PRIMARY_BLUE]
            : ["#115E59", TEAL_WATER]
        }
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <RTLIcon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginStart: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>Bangladesh Transit</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.verifiedText}>BIWTA / BRTA</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              আন্তঃজেলা বাস ও সদরঘাট লঞ্চ কেবিন ডিজিটাল টিকিটিং
            </Text>
          </View>

          <TouchableOpacity
            style={styles.myTicketsHeaderBtn}
            onPress={loadMyTickets}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
            <Text style={styles.myTicketsHeaderText}>বুকিংস</Text>
          </TouchableOpacity>
        </View>

        {/* 1. DUAL-MODE SWITCHER (Inter-District Luxury Bus vs River Launch / Steamer) */}
        <View style={styles.dualModeSegmentBox}>
          <TouchableOpacity
            style={[
              styles.dualModeSegmentBtn,
              activeTab === "bus" && styles.dualModeSegmentBtnActiveBus,
            ]}
            onPress={() => handleTabChange("bus")}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.iconCircle,
                activeTab === "bus" && { backgroundColor: "#DBEAFE" },
              ]}
            >
              <Ionicons
                name="bus"
                size={18}
                color={activeTab === "bus" ? PRIMARY_BLUE : "#FFFFFF"}
              />
            </View>
            <View style={{ alignItems: "flex-start" }}>
              <Text
                style={[
                  styles.dualModeSegmentMainText,
                  activeTab === "bus" && styles.dualModeSegmentMainTextActive,
                ]}
              >
                Inter-District Luxury Bus
              </Text>
              <Text
                style={[
                  styles.dualModeSegmentSubText,
                  activeTab === "bus" && { color: PRIMARY_BLUE },
                ]}
              >
                আন্তঃজেলা বিলাসবহুল বাস
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dualModeSegmentBtn,
              activeTab === "launch" && styles.dualModeSegmentBtnActiveLaunch,
            ]}
            onPress={() => handleTabChange("launch")}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.iconCircle,
                activeTab === "launch" && { backgroundColor: "#CCFBF1" },
              ]}
            >
              <Ionicons
                name="boat"
                size={18}
                color={activeTab === "launch" ? TEAL_DARK : "#FFFFFF"}
              />
            </View>
            <View style={{ alignItems: "flex-start" }}>
              <Text
                style={[
                  styles.dualModeSegmentMainText,
                  activeTab === "launch" && styles.dualModeSegmentMainTextActive,
                ]}
              >
                River Launch / Steamer
              </Text>
              <Text
                style={[
                  styles.dualModeSegmentSubText,
                  activeTab === "launch" && { color: TEAL_DARK },
                ]}
              >
                নৌপথের লঞ্চ ও স্টিমার
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* FILTER & PICKER BAR */}
      <View style={styles.filterSection}>
        {activeTab === "bus" ? (
          // DYNAMIC BUS DESTINATION & BOARDING FILTERS
          <>
            <View style={styles.filterLabelRow}>
              <Ionicons name="location" size={14} color={PRIMARY_BLUE} />
              <Text style={styles.filterSectionLabel}>গন্তব্য জেলা নির্বাচন করুন:</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              {dynamicBusDestinations.map((dest) => {
                const isSelected = selectedBusDest === dest;
                return (
                  <TouchableOpacity
                    key={dest}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipActiveBus,
                    ]}
                    onPress={() => setSelectedBusDest(dest)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {dest === "All" ? "সকল রুট" : dest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Boarding Point Chips */}
            <View style={[styles.filterLabelRow, { marginTop: 8 }]}>
              <Ionicons name="navigate-outline" size={13} color="#64748B" />
              <Text style={styles.filterSectionSubLabel}>বোর্ডিং কাউন্টার:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingStart: 4 }}
              >
                {dynamicBusBoardingPoints.map((counter) => {
                  const sel = selectedBusBoarding === counter;
                  return (
                    <TouchableOpacity
                      key={counter}
                      style={[
                        styles.subFilterChip,
                        sel && styles.subFilterChipActiveBus,
                      ]}
                      onPress={() => setSelectedBusBoarding(counter)}
                    >
                      <Text
                        style={[
                          styles.subFilterChipText,
                          sel && styles.subFilterChipTextActive,
                        ]}
                      >
                        {counter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        ) : (
          // 2. RIVER LAUNCH SPECIALIZED FEATURES: DYNAMIC GHAT SELECTORS & CABIN SELECTION
          <>
            {/* Ghat Selectors */}
            <View style={styles.filterLabelRow}>
              <Ionicons name="water" size={14} color={TEAL_WATER} />
              <Text style={styles.filterSectionLabel}>
                নদী বন্দর ও ঘাট নির্বাচন (Ghat Selector):
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              {dynamicLaunchGhats.map((ghat) => {
                const isSelected = selectedGhat === ghat;
                return (
                  <TouchableOpacity
                    key={ghat}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipActiveLaunch,
                    ]}
                    onPress={() => setSelectedGhat(ghat)}
                  >
                    <Ionicons
                      name="compass-outline"
                      size={12}
                      color={isSelected ? "#FFFFFF" : "#0F766E"}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {ghat === "All"
                        ? "সকল ঘাট"
                        : ghat === "Sadarghat"
                        ? "সদরঘাট (ঢাকা)"
                        : ghat === "Chandpur"
                        ? "চাঁদপুর ঘাট"
                        : ghat === "Barishal"
                        ? "বরিশাল লঞ্চ ঘাট"
                        : ghat === "Bhola"
                        ? "ভোলা (ইলিশা ঘাট)"
                        : `${ghat} ঘাট`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Cabin Selection Chips */}
            <View style={[styles.filterLabelRow, { marginTop: 8 }]}>
              <Ionicons name="bed-outline" size={13} color="#0F766E" />
              <Text style={styles.filterSectionSubLabel}>কেবিন ক্লাস ফিল্টার:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingStart: 4 }}
              >
                {dynamicCabinClasses.map((cabinClass) => {
                  const sel = selectedCabinFilter === cabinClass;
                  return (
                    <TouchableOpacity
                      key={cabinClass}
                      style={[
                        styles.subFilterChip,
                        sel && styles.subFilterChipActiveLaunch,
                      ]}
                      onPress={() => setSelectedCabinFilter(cabinClass)}
                    >
                      <Text
                        style={[
                          styles.subFilterChipText,
                          sel && styles.subFilterChipTextActive,
                        ]}
                      >
                        {cabinClass === "All" ? "সব কেবিন" : cabinClass}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {/* MAIN SCROLL CONTENT */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Fare Calendar & Price Alert Component */}
        <FareCalendar
          origin="DAC"
          destination={selectedBusDest !== "All" ? selectedBusDest : "CXB"}
          serviceType={activeTab}
          selectedDate={travelDate}
          onSelectDate={(newDate) => setTravelDate(newDate)}
        />
        <PriceAlertCard
          originCode="DAC"
          destCode={selectedBusDest !== "All" ? selectedBusDest : "CXB"}
          travelDate={travelDate}
          currentLowestPrice={activeTab === "bus" ? 1100 : 850}
          currency="BDT"
          serviceType={activeTab}
        />

        {/* BAGGAGE POLICY & TERMINAL REPORTING SUMMARY BANNER */}
        <View style={styles.policyBannerCard}>
          <View style={styles.policyBannerHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name="information-circle"
                size={18}
                color={activeTab === "bus" ? PRIMARY_BLUE : TEAL_WATER}
              />
              <Text style={styles.policyBannerTitle}>
                {activeTab === "bus"
                  ? "বাস লাগেজ পলিসি ও টার্মিনাল রিপোর্টিং"
                  : "লঞ্চ লাগেজ পলিসি ও সদরঘাট টার্মিনাল নির্দেশিকা"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowPolicyModal(true)}
              style={styles.policyDetailsBtn}
            >
              <Text style={styles.policyDetailsBtnText}>বিস্তারিত নিয়মাবলী</Text>
              <RTLIcon name="chevron-forward" size={12} color={PRIMARY_BLUE} />
            </TouchableOpacity>
          </View>

          {/* Badges Row */}
          <View style={styles.policyBadgesGrid}>
            <View style={styles.policyBadgeItem}>
              <Ionicons name="bag-check" size={15} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyBadgeHeading}>লাগেজ লিমিট</Text>
                <Text style={styles.policyBadgeSub}>
                  {activeTab === "bus"
                    ? "সর্বোচ্চ ২০ কেজি ফ্রি ট্রাঙ্ক ব্যাগ"
                    : "কেবিনে ৩০ কেজি, ডেকে ২০ কেজি ফ্রি"}
                </Text>
              </View>
            </View>

            <View style={styles.policyBadgeItem}>
              <Ionicons name="time" size={15} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyBadgeHeading}>রিপোর্টিং সময়</Text>
                <Text style={styles.policyBadgeSub}>
                  {activeTab === "bus"
                    ? "বাস ছাড়ার ৩০ মিনিট পূর্বে কাউন্টারে"
                    : "লঞ্চ ছাড়ার ৪৫ মিনিট পূর্বে পন্টুনে"}
                </Text>
              </View>
            </View>

            <View style={styles.policyBadgeItem}>
              <Ionicons name="location" size={15} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyBadgeHeading}>বোর্ডিং প্ল্যাটফর্ম</Text>
                <Text style={styles.policyBadgeSub}>
                  {activeTab === "bus"
                    ? "অনলাইন এসএমএস কাউন্টারে দেখান"
                    : "সদরঘাট পন্টুন ৩ ও ৪ এন্ট্রি বারকোড"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* TRIP LISTINGS */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={activeTab === "bus" ? PRIMARY_BLUE : TEAL_WATER}
            />
            <Text style={styles.loadingText}>
              {activeTab === "bus"
                ? "বাসের লাইভ শিডিউল লোড হচ্ছে..."
                : "সদরঘাট লঞ্চ ও স্টিমার শিডিউল যাচাই হচ্ছে..."}
            </Text>
          </View>
        ) : activeTab === "bus" ? (
          // ================= BUS TRIPS =================
          busTrips.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Ionicons name="bus-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>কোনো বাস পাওয়া যায়নি</Text>
              <Text style={styles.emptyStateSub}>
                দয়া করে অন্য জেলা বা বোর্ডিং পয়েন্ট ফিল্টার পরিবর্তন করে দেখুন।
              </Text>
            </View>
          ) : (
            busTrips.map((bus) => {
              const reportingTime = calculateReportingTime(bus.departure_time, 30);
              return (
                <View key={bus.id} style={styles.tripCard}>
                  <View style={styles.tripCardHeader}>
                    <View style={styles.operatorLogoBox}>
                      <Ionicons name="bus" size={26} color={PRIMARY_BLUE} />
                    </View>
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.operatorName}>{bus.operator_name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <View style={styles.busTypeTag}>
                          <Text style={styles.busTypeTagText}>{bus.bus_type}</Text>
                        </View>
                        <Text style={styles.seatCountBadge}>
                          {bus.available_seats} সিট খালি
                        </Text>
                      </View>
                    </View>
                    <View style={styles.fareTag}>
                      <Text style={styles.fareAmount}>৳{bus.fare}</Text>
                      <Text style={styles.fareSub}>/সিট</Text>
                    </View>
                  </View>

                  {/* Timing Row */}
                  <View style={styles.routeTimingBox}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeVal}>{bus.departure_time}</Text>
                      <Text style={styles.cityVal}>{bus.from_city}</Text>
                      <Text style={styles.reportingMiniText}>রিপোর্টিং: {reportingTime}</Text>
                    </View>

                    <View style={styles.durationMiddle}>
                      <Text style={styles.durationVal}>{bus.duration}</Text>
                      <View style={styles.durationLine} />
                      <RTLIcon name="arrow-forward" size={14} color="#94A3B8" />
                    </View>

                    <View style={[styles.timeCol, { alignItems: "flex-end" }]}>
                      <Text style={styles.timeVal}>{bus.arrival_time}</Text>
                      <Text style={styles.cityVal}>{bus.to_city}</Text>
                    </View>
                  </View>

                  {/* Boarding Point with Map Link & 30-min Arrival Warning */}
                  <BoardingPointMapCard
                    boardingPoint={bus.boarding_point}
                    departureTime={bus.departure_time}
                    transportType="bus"
                  />

                  <View style={[styles.boardingPointRow, { marginTop: 4 }]}>
                    <Ionicons name="flag-outline" size={14} color="#64748B" />
                    <Text style={styles.boardingText} numberOfLines={1}>
                      ড্রপিং পয়েন্ট: {bus.dropping_point}
                    </Text>
                  </View>

                  {/* Amenities Wrap */}
                  <View style={styles.amenitiesWrap}>
                    {bus.amenities.map((a, i) => (
                      <View key={`bus-am-${bus.id}-${a}`} style={styles.amenityPill}>
                        <Ionicons name="checkmark-circle-outline" size={11} color="#059669" />
                        <Text style={styles.amenityPillText}>{a}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Row */}
                  <View style={styles.cardActionRow}>
                    <View style={styles.baggageNoteMini}>
                      <Ionicons name="briefcase-outline" size={13} color="#64748B" />
                      <Text style={styles.baggageNoteMiniText}>২০ কেজি ফ্রি ব্যাগেজ</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.bookActionBtn}
                      onPress={() => handleOpenBusBooking(bus)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={[PRIMARY_BLUE, "#0040B0"]}
                        style={styles.bookActionGradient}
                      >
                        <Ionicons name="keypad" size={16} color="#FFFFFF" />
                        <Text style={styles.bookActionBtnText}>
                          সিট নির্বাচন করুন
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          // ================= LAUNCH TRIPS =================
          launchTrips.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Ionicons name="boat-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>কোনো লঞ্চ পাওয়া যায়নি</Text>
              <Text style={styles.emptyStateSub}>
                দয়া করে অন্য ঘাট নির্বাচন করুন অথবা সব ঘাট ফিল্টার চালু করুন।
              </Text>
            </View>
          ) : (
            launchTrips.map((launch) => {
              const reportingTime = calculateReportingTime(launch.departure_time, 45);
              return (
                <View key={launch.id} style={styles.tripCardLaunch}>
                  <View style={styles.tripCardHeader}>
                    <View style={[styles.operatorLogoBox, { backgroundColor: "#CCFBF1" }]}>
                      <Ionicons name="boat" size={26} color={TEAL_WATER} />
                    </View>
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.operatorName}>{launch.vessel_name}</Text>
                      <Text style={styles.launchRouteText}>
                        {launch.terminal_from} ⇄ {launch.terminal_to}
                      </Text>
                    </View>
                    <View style={styles.ghatBadge}>
                      <Ionicons name="water" size={12} color="#0F766E" />
                      <Text style={styles.ghatBadgeText}>নদী রুট</Text>
                    </View>
                  </View>

                  {/* Route Timing */}
                  <View style={[styles.routeTimingBox, { backgroundColor: "#F0FDFA" }]}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeVal}>{launch.departure_time}</Text>
                      <Text style={styles.cityVal}>সদরঘাট নদী বন্দর</Text>
                      <Text style={[styles.reportingMiniText, { color: TEAL_DARK }]}>
                        রিপোর্টিং: {reportingTime}
                      </Text>
                    </View>

                    <View style={styles.durationMiddle}>
                      <Text style={[styles.durationVal, { color: TEAL_WATER }]}>
                        {launch.duration}
                      </Text>
                      <View
                        style={[styles.durationLine, { backgroundColor: "#99F6E4" }]}
                      />
                      <Ionicons name="water" size={14} color={TEAL_WATER} />
                    </View>

                    <View style={[styles.timeCol, { alignItems: "flex-end" }]}>
                      <Text style={styles.timeVal}>{launch.arrival_time}</Text>
                      <Text style={styles.cityVal}>
                        {launch.terminal_to.replace("Launch Ghat", "ঘাট")}
                      </Text>
                    </View>
                  </View>

                  {/* Launch Ghat Boarding with Map Link & 30-min Arrival Warning */}
                  <BoardingPointMapCard
                    boardingPoint={launch.terminal_from}
                    departureTime={launch.departure_time}
                    transportType="launch"
                  />

                  {/* River Launch Cabin Grid Preview */}
                  <Text style={styles.cabinOptionsTitle}>
                    উপলব্ধ কেবিনসমূহ ও আসল ভাড়া:
                  </Text>
                  <View style={styles.cabinsPreviewWrap}>
                    {launch.cabins.map((cab) => {
                      const isVip = cab.type.includes("VIP");
                      return (
                        <View
                          key={cab.id}
                          style={[
                            styles.cabinPreviewChip,
                            isVip && styles.cabinPreviewChipVip,
                          ]}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={styles.cabPreviewType}>{cab.type}</Text>
                            <Text style={styles.cabPreviewAvail}>
                              {cab.available_count}টি খালি
                            </Text>
                          </View>
                          <Text style={styles.cabPreviewFare}>৳{cab.fare}</Text>
                          <Text style={styles.cabPreviewPerk} numberOfLines={1}>
                            {cab.amenities[0] || "AC Comfort"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Amenities */}
                  <View style={styles.amenitiesWrap}>
                    {launch.amenities.map((a, i) => (
                      <View key={`launch-am-${launch.id}-${a}`} style={styles.amenityPillLaunch}>
                        <Ionicons name="shield-checkmark" size={11} color={TEAL_WATER} />
                        <Text style={styles.amenityPillTextLaunch}>{a}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Row */}
                  <View style={styles.cardActionRow}>
                    <View style={styles.baggageNoteMini}>
                      <Ionicons name="shield-outline" size={13} color="#0F766E" />
                      <Text style={styles.baggageNoteMiniText}>
                        পন্টুন ৩ ও ৪ • কেবিনে ৩০ কেজি ফ্রি
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.bookActionBtn}
                      onPress={() => handleOpenLaunchBooking(launch)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={[TEAL_WATER, "#0F766E"]}
                        style={styles.bookActionGradient}
                      >
                        <Ionicons name="bed" size={16} color="#FFFFFF" />
                        <Text style={styles.bookActionBtnText}>
                          কেবিন ও ডেক প্ল্যান দেখুন
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* =====================================================================
          MODAL 1: INTERACTIVE BUS SEAT GRID & BOOKING
          Requirement 3: Interactive Seat/Cabin Grid. Update price dynamically in real time.
         ===================================================================== */}
      <Modal
        visible={!!bookingBus}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingBus(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {bookingBus && currentBusLayout && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.modalTitle}>বাস সিট নির্বাচন ও বুকিং</Text>
                      <View style={styles.busTypeTag}>
                        <Text style={styles.busTypeTagText}>{bookingBus?.bus_type}</Text>
                      </View>
                    </View>
                    <Text style={styles.modalSubHeader}>
                      {bookingBus.operator_name} • {bookingBus.from_city} হতে {bookingBus.to_city} ({bookingBus.departure_time})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBookingBus(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* VISUAL BUS SEAT GRID DYNAMICALLY GENERATED */}
                  <View style={styles.seatGridContainer}>
                    <View style={styles.busHeaderDiagram}>
                      <View style={styles.busDriverBox}>
                        <Ionicons name="disc" size={22} color="#64748B" />
                        <Text style={styles.busDriverText}>চালক কেবিন</Text>
                      </View>
                      <View style={styles.busDoorBox}>
                        <Ionicons name="exit-outline" size={18} color="#16A34A" />
                        <Text style={styles.busDoorText}>প্রবেশ পথ</Text>
                      </View>
                    </View>

                    <Text style={styles.seatPlanInstruction}>
                      {bookingBus.operator_name} বাসের {bookingBus.total_seats}টি সিটের লেআউট:
                    </Text>

                    {/* Dynamic Bus Rows */}
                    {currentBusLayout.rows.map((rowItem) => (
                      <View key={rowItem.row} style={styles.busRowWrapper}>
                        {/* Left Pair */}
                        <View style={styles.seatPair}>
                          {rowItem.left.map((seat) => {
                            const isSelected = selectedBusSeats.includes(seat.id);
                            return (
                              <TouchableOpacity
                                key={seat.id}
                                style={[
                                  styles.seatBox,
                                  seat.isBooked && styles.seatBoxBooked,
                                  isSelected && styles.seatBoxSelected,
                                ]}
                                onPress={() => toggleBusSeat(seat)}
                                activeOpacity={seat.isBooked ? 1 : 0.75}
                              >
                                <Ionicons
                                  name={
                                    seat.isBooked
                                      ? "lock-closed"
                                      : isSelected
                                      ? "checkmark-circle"
                                      : "person"
                                  }
                                  size={14}
                                  color={
                                    isSelected
                                      ? "#FFFFFF"
                                      : seat.isBooked
                                      ? "#94A3B8"
                                      : PRIMARY_BLUE
                                  }
                                />
                                <Text
                                  style={[
                                    styles.seatLabel,
                                    isSelected && styles.seatLabelSelected,
                                    seat.isBooked && styles.seatLabelBooked,
                                  ]}
                                >
                                  {seat.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Center Walkway Aisle */}
                        <View style={styles.busAisle}>
                          <Text style={styles.busAisleText}>{rowItem.row}</Text>
                        </View>

                        {/* Right Pair */}
                        <View style={styles.seatPair}>
                          {rowItem.right.map((seat) => {
                            const isSelected = selectedBusSeats.includes(seat.id);
                            return (
                              <TouchableOpacity
                                key={seat.id}
                                style={[
                                  styles.seatBox,
                                  seat.isBooked && styles.seatBoxBooked,
                                  isSelected && styles.seatBoxSelected,
                                ]}
                                onPress={() => toggleBusSeat(seat)}
                                activeOpacity={seat.isBooked ? 1 : 0.75}
                              >
                                <Ionicons
                                  name={
                                    seat.isBooked
                                      ? "lock-closed"
                                      : isSelected
                                      ? "checkmark-circle"
                                      : "person"
                                  }
                                  size={14}
                                  color={
                                    isSelected
                                      ? "#FFFFFF"
                                      : seat.isBooked
                                      ? "#94A3B8"
                                      : PRIMARY_BLUE
                                  }
                                />
                                <Text
                                  style={[
                                    styles.seatLabel,
                                    isSelected && styles.seatLabelSelected,
                                    seat.isBooked && styles.seatLabelBooked,
                                  ]}
                                >
                                  {seat.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}

                    {/* Back Row */}
                    {currentBusLayout.backRow.length > 0 && (
                      <View style={styles.busBackRowWrap}>
                        <Text style={styles.backRowLabel}>পেছনের সারি:</Text>
                        <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
                          {currentBusLayout.backRow.map((seat) => {
                            const isSelected = selectedBusSeats.includes(seat.id);
                            return (
                              <TouchableOpacity
                                key={seat.id}
                                style={[
                                  styles.seatBox,
                                  seat.isBooked && styles.seatBoxBooked,
                                  isSelected && styles.seatBoxSelected,
                                ]}
                                onPress={() => toggleBusSeat(seat)}
                                activeOpacity={seat.isBooked ? 1 : 0.75}
                              >
                                <Ionicons
                                  name={
                                    seat.isBooked
                                      ? "lock-closed"
                                      : isSelected
                                      ? "checkmark-circle"
                                      : "person"
                                  }
                                  size={14}
                                  color={
                                    isSelected
                                      ? "#FFFFFF"
                                      : seat.isBooked
                                      ? "#94A3B8"
                                      : PRIMARY_BLUE
                                  }
                                />
                                <Text
                                  style={[
                                    styles.seatLabel,
                                    isSelected && styles.seatLabelSelected,
                                    seat.isBooked && styles.seatLabelBooked,
                                  ]}
                                >
                                  {seat.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Seat Legend */}
                    <View style={styles.seatLegendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, { backgroundColor: "#EFF6FF", borderColor: PRIMARY_BLUE }]} />
                        <Text style={styles.legendText}>ফাঁকা (খালি)</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, { backgroundColor: PRIMARY_BLUE, borderColor: PRIMARY_BLUE }]} />
                        <Text style={styles.legendText}>নির্বাচিত</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, { backgroundColor: "#E2E8F0", borderColor: "#CBD5E1" }]} />
                        <Text style={styles.legendText}>বুকড (বন্ধ)</Text>
                      </View>
                    </View>
                  </View>

                  {/* BOARDING POINT SELECTION */}
                  <Text style={styles.inputLabel}>বোর্ডিং পয়েন্ট নির্বাচন করুন *</Text>
                  <View style={styles.boardingPointGrid}>
                    {currentBusBoardingPoints.map((pt) => {
                      const sel =
                        (busSelectedBoardingPoint || bookingBus.boarding_point) === pt;
                      return (
                        <TouchableOpacity
                          key={pt}
                          style={[
                            styles.boardingPointOption,
                            sel && styles.boardingPointOptionActive,
                          ]}
                          onPress={() => setBusSelectedBoardingPoint(pt)}
                        >
                          <Ionicons
                            name={sel ? "radio-button-on" : "radio-button-off"}
                            size={16}
                            color={sel ? PRIMARY_BLUE : "#94A3B8"}
                          />
                          <Text
                            style={[
                              styles.boardingPointOptionText,
                              sel && styles.boardingPointOptionTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {pt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selected Boarding Map & Reporting Time Guidance */}
                  <BoardingPointMapCard
                    boardingPoint={busSelectedBoardingPoint || bookingBus?.boarding_point || ""}
                    departureTime={bookingBus?.departure_time || ""}
                    transportType="bus"
                  />
                  <Text style={styles.inputLabel}>যাত্রার তারিখ নির্বাচন করুন</Text>
                  <View style={styles.quickDateRow}>
                    {quickDates.map((qd) => {
                      const isSel = travelDate === qd.date;
                      return (
                        <TouchableOpacity
                          key={qd.date}
                          style={[styles.quickDateChip, isSel && styles.quickDateChipActiveBus]}
                          onPress={() => setTravelDate(qd.date)}
                        >
                          <Text style={[styles.quickDateText, isSel && styles.quickDateTextActive]}>
                            {qd.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={travelDate}
                    onChangeText={setTravelDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />

                  {/* PASSENGER DETAILS */}
                  <Text style={styles.inputLabel}>যাত্রীর পুরো নাম *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: তানভীর হাসান"
                    placeholderTextColor="#94A3B8"
                    value={passengerName}
                    onChangeText={setPassengerName}
                  />

                  <Text style={styles.inputLabel}>মোবাইল নম্বর (এসএমএস টিকিটের জন্য) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: 01712345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={passengerPhone}
                    onChangeText={setPassengerPhone}
                  />

                  <Text style={styles.inputLabel}>জাতীয় পরিচয়পত্র (NID) নম্বর (ঐচ্ছিক)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="NID / জন্ম নিবন্ধন নম্বর"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={passengerNid}
                    onChangeText={setPassengerNid}
                  />

                  {/* DYNAMIC REAL-TIME PRICE SUMMARY */}
                  <View style={styles.priceSummaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        নির্বাচিত সিট ({selectedBusSeats.length}টি): {selectedBusSeats.join(", ") || "কিছুই সিলেক্ট করা হয়নি"}
                      </Text>
                      <Text style={styles.summaryVal}>
                        ৳{bookingBus.fare} × {selectedBusSeats.length}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <View>
                        <Text style={styles.totalLabel}>মোট প্রদেয় ভাড়া</Text>
                        <Text style={styles.totalSub}>
                          রিপোর্টিং: {calculateReportingTime(bookingBus.departure_time, 30)}
                        </Text>
                      </View>
                      <Text style={styles.totalVal}>
                        {formatCurrency(busTotalFare, "BDT")}
                      </Text>
                    </View>
                  </View>

                  {/* CONFIRM BUTTON */}
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleBusBookingSubmit}
                    disabled={submittingBooking || selectedBusSeats.length === 0}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={[PRIMARY_BLUE, "#003FA0"]}
                      style={styles.confirmGradient}
                    >
                      {submittingBooking ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmBtnText}>
                          টিকিট নিশ্চিত করুন • {formatCurrency(busTotalFare, "BDT")}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 2: INTERACTIVE RIVER LAUNCH CABIN & DECK PLAN BOOKING
          Dynamically generated from bookingLaunch.cabins with actual fares
         ===================================================================== */}
      <Modal
        visible={!!bookingLaunch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingLaunch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {bookingLaunch && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.modalTitle}>লঞ্চ ডেক প্ল্যান ও কেবিন নির্বাচন</Text>
                      <View style={styles.ghatBadge}>
                        <Text style={styles.ghatBadgeText}>নদীপথ</Text>
                      </View>
                    </View>
                    <Text style={styles.modalSubHeader}>
                      {bookingLaunch.vessel_name} ({bookingLaunch.terminal_from} ➔ {bookingLaunch.terminal_to})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBookingLaunch(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* DYNAMIC DECK SELECTOR TABS */}
                  <Text style={styles.inputLabel}>ডেক লেভেল নির্বাচন করুন (Deck Plan Selector):</Text>
                  <View style={styles.deckTabsRow}>
                    {[
                      { key: "Deck 2 (Upper VIP)", label: "২য় তলা (VIP & Family)" },
                      { key: "Deck 1 (Mid AC)", label: "১ম তলা (Double AC)" },
                      { key: "Ground Deck (Deck Class)", label: "নিচ তলা (Deck Class)" },
                    ].map((deck) => {
                      const isActive = activeDeckTab === deck.key;
                      return (
                        <TouchableOpacity
                          key={deck.key}
                          style={[
                            styles.deckTabBtn,
                            isActive && styles.deckTabBtnActive,
                          ]}
                          onPress={() => setActiveDeckTab(deck.key)}
                        >
                          <Ionicons
                            name="layers-outline"
                            size={14}
                            color={isActive ? "#FFFFFF" : TEAL_DARK}
                          />
                          <Text
                            style={[
                              styles.deckTabBtnText,
                              isActive && styles.deckTabBtnTextActive,
                            ]}
                          >
                            {deck.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* VESSEL WHEELHOUSE DIAGRAM */}
                  <View style={styles.vesselBowBox}>
                    <Ionicons name="compass" size={18} color={TEAL_DARK} />
                    <Text style={styles.vesselBowText}>
                      লঞ্চের সামনের অংশ (Bow) • ক্যাপ্টেনের ব্রিজ ও মাস্টার কেবিন
                    </Text>
                  </View>

                  {/* DYNAMIC VISUAL CABIN GRID FOR ACTIVE DECK */}
                  <View style={styles.cabinGridPlan}>
                    {currentLaunchDeckPlan
                      .filter((c) => c.deckLevel === activeDeckTab)
                      .map((cabin) => {
                        const isSelected = selectedCabins.some((sc) => sc.id === cabin.id);
                        return (
                          <TouchableOpacity
                            key={cabin.id}
                            style={[
                              styles.cabinPlanCard,
                              cabin.isBooked && styles.cabinPlanCardBooked,
                              isSelected && styles.cabinPlanCardSelected,
                            ]}
                            onPress={() => toggleLaunchCabin(cabin)}
                            activeOpacity={cabin.isBooked ? 1 : 0.8}
                          >
                            <View style={styles.cabinPlanCardTop}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text
                                  style={[
                                    styles.cabinPlanNumber,
                                    isSelected && styles.cabinPlanNumberSelected,
                                  ]}
                                >
                                  {cabin.cabinNumber}
                                </Text>
                                {cabin.hasBalcony && (
                                  <View style={styles.balconyBadge}>
                                    <Text style={styles.balconyBadgeText}>ব্যালকনি</Text>
                                  </View>
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.cabinPlanFare,
                                  isSelected && styles.cabinPlanFareSelected,
                                ]}
                              >
                                ৳{cabin.fare}
                              </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 }}>
                              <View style={styles.cabinClassBadge}>
                                <Text style={styles.cabinClassBadgeText}>{cabin.type}</Text>
                              </View>
                              <Text style={styles.cabinCapacityText}>
                                ধারণক্ষমতা: {cabin.capacity}
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.cabinPerksText,
                                isSelected && { color: "#CCFBF1" },
                              ]}
                              numberOfLines={1}
                            >
                              {cabin.perks}
                            </Text>

                            {/* Status Pill */}
                            <View style={styles.cabinPlanCardFooter}>
                              {cabin.isBooked ? (
                                <View style={styles.bookedPill}>
                                  <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                                  <Text style={styles.bookedPillText}>সংরক্ষিত (Booked)</Text>
                                </View>
                              ) : isSelected ? (
                                <View style={styles.selectedPill}>
                                  <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                                  <Text style={styles.selectedPillText}>নির্বাচিত</Text>
                                </View>
                              ) : (
                                <View style={styles.availablePill}>
                                  <Ionicons name="add-circle-outline" size={12} color={TEAL_DARK} />
                                  <Text style={styles.availablePillText}>সিলেক্ট করুন</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>

                  {/* Selected Boarding Map & Reporting Time Guidance */}
                  <BoardingPointMapCard
                    boardingPoint={busSelectedBoardingPoint || bookingBus?.boarding_point || ""}
                    departureTime={bookingBus?.departure_time || ""}
                    transportType="bus"
                  />
                  <Text style={styles.inputLabel}>যাত্রার তারিখ নির্বাচন করুন</Text>
                  <View style={styles.quickDateRow}>
                    {quickDates.map((qd) => {
                      const isSel = travelDate === qd.date;
                      return (
                        <TouchableOpacity
                          key={qd.date}
                          style={[styles.quickDateChip, isSel && styles.quickDateChipActiveLaunch]}
                          onPress={() => setTravelDate(qd.date)}
                        >
                          <Text style={[styles.quickDateText, isSel && styles.quickDateTextActive]}>
                            {qd.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={travelDate}
                    onChangeText={setTravelDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />

                  {/* PASSENGER DETAILS */}
                  <Text style={styles.inputLabel}>যাত্রীর পুরো নাম *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: ড. মাহফুজুল হক"
                    placeholderTextColor="#94A3B8"
                    value={passengerName}
                    onChangeText={setPassengerName}
                  />

                  <Text style={styles.inputLabel}>মোবাইল নম্বর *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: 01812345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={passengerPhone}
                    onChangeText={setPassengerPhone}
                  />

                  <Text style={styles.inputLabel}>জাতীয় পরিচয়পত্র (NID) নম্বর</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="NID নম্বর (ঐচ্ছিক)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={passengerNid}
                    onChangeText={setPassengerNid}
                  />

                  {/* DYNAMIC REAL-TIME PRICE SUMMARY (LAUNCH) */}
                  <View style={[styles.priceSummaryBox, { backgroundColor: "#F0FDFA", borderColor: "#99F6E4" }]}>
                    <Text style={[styles.summaryLabel, { fontWeight: "700", color: "#0F766E", marginBottom: 6 }]}>
                      নির্বাচিত কেবিনসমূহ ({selectedCabins.length}টি):
                    </Text>
                    {selectedCabins.map((c) => (
                      <View key={c.id} style={styles.selectedCabinSummaryLine}>
                        <Text style={styles.selectedCabinLineName}>
                          • {c.cabinNumber} ({c.type} - {c.deckLevel.split(" ")[0]})
                        </Text>
                        <Text style={styles.selectedCabinLineFare}>
                          {formatCurrency(c.fare, "BDT")}
                        </Text>
                      </View>
                    ))}

                    <View style={[styles.summaryDivider, { backgroundColor: "#99F6E4" }]} />
                    <View style={styles.summaryRow}>
                      <View>
                        <Text style={[styles.totalLabel, { color: TEAL_DARK }]}>
                          মোট প্রদেয় লঞ্চ ভাড়া
                        </Text>
                        <Text style={styles.totalSub}>
                          রিপোর্টিং: {calculateReportingTime(bookingLaunch.departure_time, 45)} (পন্টুন ৩ ও ৪)
                        </Text>
                      </View>
                      <Text style={[styles.totalVal, { color: TEAL_DARK }]}>
                        {formatCurrency(launchTotalFare, "BDT")}
                      </Text>
                    </View>
                  </View>

                  {/* CONFIRM BUTTON */}
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleLaunchBookingSubmit}
                    disabled={submittingBooking || selectedCabins.length === 0}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={[TEAL_WATER, "#0F766E"]}
                      style={styles.confirmGradient}
                    >
                      {submittingBooking ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmBtnText}>
                          কেবিন নিশ্চিত করুন • {formatCurrency(launchTotalFare, "BDT")}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 3: COMPREHENSIVE BAGGAGE POLICY & TERMINAL REPORTING GUIDE
         ===================================================================== */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>লাগেজ পলিসি ও টার্মিনাল রিপোর্টিং নির্দেশিকা</Text>
                <Text style={styles.modalSubHeader}>
                  বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ (BRTA) ও বিআইডব্লিউটিএ অনুমোদিত নির্দেশিকা
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPolicyModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* SECTION 1: BUS POLICIES */}
              <View style={styles.policySectionBlock}>
                <View style={styles.policySectionHeaderRow}>
                  <Ionicons name="bus" size={20} color={PRIMARY_BLUE} />
                  <Text style={styles.policySectionBlockTitle}>
                    আন্তঃজেলা লাক্সারি বাস নির্দেশিকা
                  </Text>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>১.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>লাগেজ ভাতা ও ওজন সীমা:</Text>
                    <Text style={styles.policyRuleText}>
                      প্রতি যাত্রীর জন্য সর্বোচ্চ ২০ কেজি পর্যন্ত ট্রাঙ্ক লাগেজ (সর্বোচ্চ ২টি ব্যাগ) সম্পূর্ণ ফ্রি। বাসের কেবিনে ৭ কেজি পর্যন্ত ওজনের একটি হ্যান্ডব্যাগ বহন করা যাবে।
                    </Text>
                  </View>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>২.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>অতিরিক্ত লাগেজ চার্জ:</Text>
                    <Text style={styles.policyRuleText}>
                      ২০ কেজির অতিরিক্ত প্রতি কেজি লাগেজের জন্য নির্ধারিত কাউন্টারে ৳২০ হারে ফি প্রযোজ্য।
                    </Text>
                  </View>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>৩.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>টার্মিনাল রিপোর্টিং সময়:</Text>
                    <Text style={styles.policyRuleText}>
                      বাস ছাড়ার কমপক্ষে ৩০ মিনিট পূর্বে নির্দিষ্ট কাউন্টারে উপস্থিত হয়ে লাগেজ ট্যাগ সংগ্রহ করতে হবে। ছাড়ার ১০ মিনিট পূর্বে বোর্ডিং সমাপ্ত হয়।
                    </Text>
                  </View>
                </View>
              </View>

              {/* SECTION 2: RIVER LAUNCH POLICIES */}
              <View style={[styles.policySectionBlock, { borderColor: "#99F6E4" }]}>
                <View style={styles.policySectionHeaderRow}>
                  <Ionicons name="boat" size={20} color={TEAL_WATER} />
                  <Text style={[styles.policySectionBlockTitle, { color: TEAL_DARK }]}>
                    সদরঘাট নদী বন্দর ও লঞ্চ কেবিন নির্দেশিকা
                  </Text>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>১.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>কেবিন ও ডেক লাগেজ নীতি:</Text>
                    <Text style={styles.policyRuleText}>
                      ভিআইপি স্যুট ও এসি কেবিনের যাত্রীদের জন্য ৩০ কেজি পর্যন্ত লাগেজ ফ্রি। সাধারণ ডেক যাত্রীদের জন্য ২০ কেজি কার্টন/ট্রাঙ্ক অনুমোদিত।
                    </Text>
                  </View>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>২.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>সদরঘাট পন্টুন রিপোর্টিং:</Text>
                    <Text style={styles.policyRuleText}>
                      লঞ্চ ছাড়ার কমপক্ষে ৪৫ মিনিট পূর্বে সদরঘাট পন্টুন ৩ ও ৪ এ উপস্থিত হোন। সাইরেন বাজার ১৫ মিনিট পূর্বে গ্যাংওয়ে প্রত্যাহার করা হয়।
                    </Text>
                  </View>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>৩.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>কেবিন চাবি গ্রহণ ও পুরসার ডেস্ক:</Text>
                    <Text style={styles.policyRuleText}>
                      লঞ্চের ১ম তলায় কেন্দ্রীয় পার্সার ডেস্কে (Purser Desk) এসএমএস বা অ্যাপ টিকেট দেখিয়ে কেবিনের ডিজিটাল কার্ড/চাবি ও পরিচ্ছন্ন লিনেন সংগ্রহ করুন।
                    </Text>
                  </View>
                </View>

                <View style={styles.policyRuleItem}>
                  <Text style={styles.policyRuleBullet}>৪.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyRuleHeading}>মোটরবাইক ও বিশেষ কার্গো বুকিং:</Text>
                    <Text style={styles.policyRuleText}>
                      মোটরবাইক পরিবহনের জন্য পন্টুন ইনচার্জের নিকট থেকে ৳৪০০-৳৮০০ (দূরত্বভেদে) মূল্যের সরকারি কার্গো টোকেন গ্রহণ করতে হবে।
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: PRIMARY_BLUE }]}
                onPress={() => setShowPolicyModal(false)}
              >
                <Text style={styles.confirmBtnText}>বুঝেছি (Close Guide)</Text>
              </TouchableOpacity>
              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 4: USER TICKETS (My Bookings)
         ===================================================================== */}
      <Modal
        visible={showMyTicketsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMyTicketsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>আমার বুকিং ইতিহাস (My Tickets)</Text>
                <Text style={styles.modalSubHeader}>
                  আপনার সকল কনফার্ম করা বাস ও লঞ্চ টিকিট
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMyTicketsModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingTickets ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={PRIMARY_BLUE} />
                  <Text style={styles.loadingText}>টিকিট লোড হচ্ছে...</Text>
                </View>
              ) : myTickets.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="ticket-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyStateTitle}>কোনো টিকিট পাওয়া যায়নি</Text>
                  <Text style={styles.emptyStateSub}>
                    আপনি এখনও কোনো বাস বা লঞ্চ টিকিট বুক করেননি।
                  </Text>
                </View>
              ) : (
                myTickets.map((t) => (
                  <View key={t.id} style={styles.myTicketCard}>
                    <View style={styles.myTicketTop}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons
                          name={t.transport_type === "bus" ? "bus" : "boat"}
                          size={18}
                          color={t.transport_type === "bus" ? PRIMARY_BLUE : TEAL_WATER}
                        />
                        <Text style={styles.myTicketOperator}>
                          {t.operator_or_vessel}
                        </Text>
                      </View>
                      <View style={styles.confirmedPill}>
                        <Text style={styles.confirmedPillText}>কনফার্মড</Text>
                      </View>
                    </View>

                    <Text style={styles.myTicketRoute}>
                      {t.from} ➔ {t.to}
                    </Text>

                    <View style={styles.myTicketDetailsRow}>
                      <Text style={styles.myTicketDetailText}>
                        তারিখ: {t.departure_date} ({t.departure_time})
                      </Text>
                      <Text style={styles.myTicketFare}>
                        {formatCurrency(t.total_fare, "BDT")}
                      </Text>
                    </View>

                    <View style={styles.myTicketSeatsWrap}>
                      <Text style={styles.myTicketSeatsLabel}>আইটেম / সিট:</Text>
                      <Text style={styles.myTicketSeatsVal}>
                        {t.booked_items.join(", ")}
                      </Text>
                    </View>

                    <Text style={styles.myTicketPassenger}>
                      যাত্রী: {t.passenger_name} ({t.passenger_phone})
                    </Text>
                  </View>
                ))
              )}
              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: "#E2E8F0",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  myTicketsHeaderBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  myTicketsHeaderText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 1,
  },
  dualModeSegmentBox: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  dualModeSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 8,
  },
  dualModeSegmentBtnActiveBus: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.15)" } : {}),
  },
  dualModeSegmentBtnActiveLaunch: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.15)" } : {}),
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dualModeSegmentMainText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dualModeSegmentMainTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  dualModeSegmentSubText: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 1,
  },
  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  filterSectionSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipsRow: {
    gap: 8,
    paddingEnd: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActiveBus: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  filterChipActiveLaunch: {
    backgroundColor: TEAL_WATER,
    borderColor: TEAL_WATER,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  subFilterChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subFilterChipActiveBus: {
    backgroundColor: "#EFF6FF",
    borderColor: PRIMARY_BLUE,
  },
  subFilterChipActiveLaunch: {
    backgroundColor: "#F0FDFA",
    borderColor: TEAL_WATER,
  },
  subFilterChipText: {
    fontSize: 11,
    color: "#64748B",
  },
  subFilterChipTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
  },
  policyBannerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.04)" } : {}),
  },
  policyBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  policyBannerTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  policyDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  policyDetailsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },
  policyBadgesGrid: {
    flexDirection: "column",
    gap: 6,
  },
  policyBadgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 7,
    borderRadius: 8,
  },
  policyBadgeHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  policyBadgeSub: {
    fontSize: 10.5,
    color: "#64748B",
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
  },
  emptyStateBox: {
    alignItems: "center",
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 5px rgba(15, 23, 42, 0.04)" } : {}),
  },
  tripCardLaunch: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 5px rgba(15, 23, 42, 0.05)" } : {}),
  },
  tripCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  operatorLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  operatorName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  busTypeTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  busTypeTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },
  seatCountBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: DANGER_RED,
  },
  launchRouteText: {
    fontSize: 11.5,
    color: "#0F766E",
    marginTop: 2,
    fontWeight: "600",
  },
  ghatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ghatBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0F766E",
  },
  fareTag: {
    alignItems: "flex-end",
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY_BLUE,
  },
  fareSub: {
    fontSize: 10.5,
    color: "#64748B",
  },
  routeTimingBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  timeCol: {
    flex: 1,
  },
  timeVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  cityVal: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  reportingMiniText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  durationMiddle: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  durationVal: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 3,
  },
  durationLine: {
    width: 36,
    height: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 3,
  },
  boardingPointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  boardingText: {
    fontSize: 11.5,
    color: "#475569",
    flex: 1,
  },
  amenitiesWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  amenityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityPillText: {
    fontSize: 10.5,
    color: "#475569",
  },
  amenityPillLaunch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  amenityPillTextLaunch: {
    fontSize: 10.5,
    color: "#0F766E",
  },
  cabinOptionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
    marginBottom: 6,
  },
  cabinsPreviewWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cabinPreviewChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 8,
    flex: 1,
    minWidth: 130,
  },
  cabinPreviewChipVip: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  cabPreviewType: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  cabPreviewAvail: {
    fontSize: 10,
    color: "#64748B",
  },
  cabPreviewFare: {
    fontSize: 13,
    fontWeight: "800",
    color: TEAL_WATER,
    marginVertical: 2,
  },
  cabPreviewPerk: {
    fontSize: 9.5,
    color: "#64748B",
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  baggageNoteMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  baggageNoteMiniText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  bookActionBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  bookActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  bookActionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContentLarge: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubHeader: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
  },
  seatGridContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  busHeaderDiagram: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
    marginBottom: 10,
  },
  busDriverBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  busDriverText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  busDoorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  busDoorText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  seatPlanInstruction: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    marginBottom: 10,
  },
  busRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  seatPair: {
    flexDirection: "row",
    gap: 6,
  },
  busAisle: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  busAisleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
  },
  seatBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  seatBoxSelected: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  seatBoxBooked: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  seatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  seatLabelSelected: {
    color: "#FFFFFF",
  },
  seatLabelBooked: {
    color: "#94A3B8",
  },
  busBackRowWrap: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "center",
  },
  backRowLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  seatLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10.5,
    color: "#475569",
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 10,
    marginBottom: 5,
  },
  boardingPointGrid: {
    gap: 5,
    marginBottom: 4,
  },
  boardingPointOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  boardingPointOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: PRIMARY_BLUE,
  },
  boardingPointOptionText: {
    fontSize: 11.5,
    color: "#334155",
  },
  boardingPointOptionTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: "700",
  },
  quickDateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  quickDateChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickDateChipActiveBus: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  quickDateChipActiveLaunch: {
    backgroundColor: TEAL_WATER,
    borderColor: TEAL_WATER,
  },
  quickDateText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  quickDateTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 4,
  },
  deckTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  deckTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 8,
  },
  deckTabBtnActive: {
    backgroundColor: TEAL_WATER,
    borderColor: TEAL_WATER,
  },
  deckTabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F766E",
  },
  deckTabBtnTextActive: {
    color: "#FFFFFF",
  },
  vesselBowBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDFA",
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  vesselBowText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F766E",
  },
  cabinGridPlan: {
    gap: 8,
    marginBottom: 10,
  },
  cabinPlanCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  cabinPlanCardSelected: {
    backgroundColor: "#0F766E",
    borderColor: TEAL_WATER,
  },
  cabinPlanCardBooked: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  cabinPlanCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cabinPlanNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  cabinPlanNumberSelected: {
    color: "#FFFFFF",
  },
  balconyBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  balconyBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0F766E",
  },
  cabinPlanFare: {
    fontSize: 15,
    fontWeight: "800",
    color: TEAL_WATER,
  },
  cabinPlanFareSelected: {
    color: "#FDE047",
  },
  cabinClassBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cabinClassBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  cabinCapacityText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  cabinPerksText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  cabinPlanCardFooter: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  availablePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  availablePillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0F766E",
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bookedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookedPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  priceSummaryBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#334155",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#93C5FD",
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_BLUE,
  },
  totalSub: {
    fontSize: 9.5,
    color: "#64748B",
  },
  totalVal: {
    fontSize: 17,
    fontWeight: "800",
    color: PRIMARY_BLUE,
  },
  selectedCabinSummaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  selectedCabinLineName: {
    fontSize: 11.5,
    color: "#334155",
  },
  selectedCabinLineFare: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  confirmBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
  },
  confirmGradient: {
    paddingVertical: 13,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  policySectionBlock: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  policySectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  policySectionBlockTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  policyRuleItem: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  policyRuleBullet: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },
  policyRuleHeading: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  policyRuleText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 1,
    lineHeight: 16,
  },
  myTicketCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  myTicketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  myTicketOperator: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  confirmedPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confirmedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  myTicketRoute: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  myTicketDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  myTicketDetailText: {
    fontSize: 11,
    color: "#64748B",
  },
  myTicketFare: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_BLUE,
  },
  myTicketSeatsWrap: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  myTicketSeatsLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  myTicketSeatsVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  myTicketPassenger: {
    fontSize: 10.5,
    color: "#64748B",
  },
});
