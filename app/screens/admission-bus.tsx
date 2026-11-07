import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
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
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { openLink } from "../../src/utils/openLink";
import {
  AdmissionBusRoute,
  AdmissionTicketBooking,
} from "../../src/types/admissionBus";
import {
  admissionBusService,
} from "../../src/services/admissionBusService";
import { ErrorStateCard, EmptyStateView } from "../../src/components/common";

const PRIMARY_BLUE = "#0055F2";
const VIOLET_PURPLE = "#7C3AED";
const EMERALD_GREEN = "#059669";
const AMBER_GOLD = "#D97706";

const getUpcomingExamDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Target Universities for Exam Tracker
export const TARGET_UNIVERSITIES = [
  {
    code: "ALL",
    label: "সকল বিশ্ববিদ্যালয়",
    subLabel: "All Universities",
    icon: "globe-outline",
  },
  {
    code: "DU",
    label: "Dhaka University",
    subLabel: "ঢাকা বিশ্ববিদ্যালয়",
    icon: "school-outline",
    examDate: getUpcomingExamDate(7),
    examTime: "11:00 AM - 12:30 PM",
    center: "Curzon Hall & Arts Faculty, Dhaka",
    guaranteedArrival: "09:00 AM (2h prior)",
  },
  {
    code: "BUET",
    label: "BUET",
    subLabel: "বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়",
    icon: "construct-outline",
    examDate: getUpcomingExamDate(11),
    examTime: "10:00 AM - 12:00 PM",
    center: "BUET Main Campus & ECE Building, Palashi",
    guaranteedArrival: "08:00 AM (2h prior)",
  },
  {
    code: "RUET",
    label: "RUET",
    subLabel: "রাজশাহী প্রকৌশল বিশ্ববিদ্যালয়",
    icon: "hardware-chip-outline",
    examDate: getUpcomingExamDate(17),
    examTime: "10:00 AM - 12:30 PM",
    center: "RUET Campus, Kazla, Rajshahi",
    guaranteedArrival: "08:00 AM (2h prior)",
  },
  {
    code: "CU",
    label: "Chittagong University",
    subLabel: "চট্টগ্রাম বিশ্ববিদ্যালয়",
    icon: "leaf-outline",
    examDate: getUpcomingExamDate(24),
    examTime: "11:00 AM - 12:00 PM",
    center: "1 No. Gate & Central Field, CU Campus",
    guaranteedArrival: "09:00 AM (2h prior)",
  },
  {
    code: "GST",
    label: "GST Cluster",
    subLabel: "গুচ্ছভুক্ত ২৪ বিশ্ববিদ্যালয়",
    icon: "layers-outline",
    examDate: getUpcomingExamDate(30),
    examTime: "12:00 PM - 01:00 PM",
    center: "Divisional University Centers",
    guaranteedArrival: "10:00 AM (2h prior)",
  },
];

// District Hubs
const DISTRICT_HUBS = [
  { code: "ALL", label: "সকল জেলা হাব" },
  { code: "Bogura", label: "বগুড়া" },
  { code: "Rangpur", label: "রংপুর" },
  { code: "Cumilla", label: "কুমিল্লা" },
  { code: "Mymensingh", label: "ময়মনসিংহ" },
  { code: "Khulna", label: "খুলনা" },
  { code: "Sylhet", label: "সিলেট" },
  { code: "Barishal", label: "বরিশাল" },
  { code: "Kushtia", label: "কুষ্টিয়া" },
  { code: "Dinajpur", label: "দিনাজপুর" },
];

// Dedicated Special Routes covering all requirements
export const ENRICHED_SPECIAL_ROUTES: AdmissionBusRoute[] = [
  // Dhaka University (DU)
  {
    id: "route-du-bogura-1",
    exam_id: "exam-du-ka",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    unit_name: "Ka Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Bogura",
    boarding_point: "Thonthonia Central Bus Stand, Bogura",
    campus_drop_point: "Curzon Hall Main Gate, DU Campus",
    departure_time: "11:00 PM (Night before exam)",
    campus_arrival_time: "06:30 AM (Exam day • Guaranteed 4.5h before exam)",
    return_departure_time: "04:00 PM (Post-exam from TSC)",
    bus_operator: "Shyamoli NR Travels (Special Exam Fleet)",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 12,
    regular_fare: 950,
    student_fare: 760, // 20% discount (950 * 0.8)
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801712003344",
  },
  {
    id: "route-du-rangpur-1",
    exam_id: "exam-du-ka",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    unit_name: "Ka Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Rangpur",
    boarding_point: "Modern Mor, Rangpur Hub",
    campus_drop_point: "Shahbagh / TSC Circle, DU Campus",
    departure_time: "09:30 PM (Night before exam)",
    campus_arrival_time: "06:00 AM (Exam day • Guaranteed 5h before exam)",
    return_departure_time: "04:30 PM (Post-exam from Curzon)",
    bus_operator: "Ena Transport (Student Express)",
    bus_type: "Hyundai Luxury AC",
    total_seats: 36,
    available_seats: 8,
    regular_fare: 1100,
    student_fare: 880, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801719223344",
  },
  {
    id: "route-du-mymensingh-1",
    exam_id: "exam-du-ka",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    unit_name: "Ka Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Mymensingh",
    boarding_point: "Maskanda Bus Stand, Mymensingh",
    campus_drop_point: "Curzon Hall / Shahidullah Hall Gate",
    departure_time: "05:00 AM (Exam day morning)",
    campus_arrival_time: "08:30 AM (Exam day • Guaranteed 2.5h before exam)",
    return_departure_time: "03:30 PM (Post-exam)",
    bus_operator: "Ena Student Fleet",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 16,
    regular_fare: 550,
    student_fare: 440, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801722889900",
  },
  {
    id: "route-du-cumilla-1",
    exam_id: "exam-du-ka",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    unit_name: "Ka Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Cumilla",
    boarding_point: "Paduar Bazar Biswa Road, Cumilla",
    campus_drop_point: "Shahbagh & DU Arts Faculty Gate",
    departure_time: "05:30 AM (Exam day morning)",
    campus_arrival_time: "08:15 AM (Exam day • Guaranteed 2h 45m before exam)",
    return_departure_time: "04:00 PM (Post-exam)",
    bus_operator: "Tisha Student Special",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 14,
    regular_fare: 500,
    student_fare: 400, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801715667788",
  },

  // BUET (বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়)
  {
    id: "route-buet-bogura-1",
    exam_id: "exam-buet-eng",
    university_name: "BUET (বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়)",
    short_code: "BUET",
    unit_name: "Engineering & Architecture (প্রকৌশল)",
    departure_district: "Bogura",
    boarding_point: "Charmatha Central Terminal, Bogura",
    campus_drop_point: "BUET Palashi Gate & ECE Building, Dhaka",
    departure_time: "11:30 PM (Night before exam)",
    campus_arrival_time: "06:30 AM (Exam day • Guaranteed 3.5h before exam)",
    return_departure_time: "03:30 PM (Post-exam from Palashi)",
    bus_operator: "Hanif Enterprise (BUET Aspirant Fleet)",
    bus_type: "Hyundai Luxury AC",
    total_seats: 38,
    available_seats: 11,
    regular_fare: 1000,
    student_fare: 800, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801711224466",
  },
  {
    id: "route-buet-cumilla-1",
    exam_id: "exam-buet-eng",
    university_name: "BUET (বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়)",
    short_code: "BUET",
    unit_name: "Engineering & Architecture (প্রকৌশল)",
    departure_district: "Cumilla",
    boarding_point: "Shashongachha Bus Terminal, Cumilla",
    campus_drop_point: "BUET Main Campus Gate, Palashi",
    departure_time: "05:00 AM (Exam day morning)",
    campus_arrival_time: "07:45 AM (Exam day • Guaranteed 2h 15m before exam)",
    return_departure_time: "03:30 PM (Post-exam from Palashi)",
    bus_operator: "Ashea Paribahan (BUET Special)",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 15,
    regular_fare: 550,
    student_fare: 440, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801819334455",
  },
  {
    id: "route-buet-kushtia-1",
    exam_id: "exam-buet-eng",
    university_name: "BUET (বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়)",
    short_code: "BUET",
    unit_name: "Engineering & Architecture (প্রকৌশল)",
    departure_district: "Kushtia",
    boarding_point: "Mojompur Railgate Bus Stand, Kushtia",
    campus_drop_point: "BUET ECE Building & Shahid Minar Road",
    departure_time: "10:30 PM (Night before exam)",
    campus_arrival_time: "06:00 AM (Exam day • Guaranteed 4h safe buffer)",
    return_departure_time: "04:00 PM (Post-exam)",
    bus_operator: "SB Super Deluxe (Engineer Special)",
    bus_type: "AC Hino",
    total_seats: 36,
    available_seats: 9,
    regular_fare: 850,
    student_fare: 680, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801712998877",
  },

  // RUET (রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়)
  {
    id: "route-ruet-bogura-1",
    exam_id: "exam-ruet-eng",
    university_name: "RUET (রাজশাহী প্রকৌশল বিশ্ববিদ্যালয়)",
    short_code: "RUET",
    unit_name: "Engineering Unit (KA & KHA)",
    departure_district: "Bogura",
    boarding_point: "Charmatha Central Terminal, Bogura",
    campus_drop_point: "RUET Gate 1, Kazla, Rajshahi",
    departure_time: "05:45 AM (Exam day morning)",
    campus_arrival_time: "07:50 AM (Exam day • Guaranteed 2h 10m before exam)",
    return_departure_time: "03:30 PM (Post-exam from RUET Gate 1)",
    bus_operator: "Desh Travels (RUET Express)",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 14,
    regular_fare: 450,
    student_fare: 360, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801733221100",
  },
  {
    id: "route-ruet-rangpur-1",
    exam_id: "exam-ruet-eng",
    university_name: "RUET (রাজশাহী প্রকৌশল বিশ্ববিদ্যালয়)",
    short_code: "RUET",
    unit_name: "Engineering Unit (KA & KHA)",
    departure_district: "Rangpur",
    boarding_point: "Modern Mor, Rangpur Hub",
    campus_drop_point: "RUET Campus Gate & Kazla Road",
    departure_time: "04:30 AM (Exam day morning)",
    campus_arrival_time: "07:45 AM (Exam day • Guaranteed 2h 15m before exam)",
    return_departure_time: "03:45 PM (Post-exam)",
    bus_operator: "Nabil Paribahan (Student Shuttle)",
    bus_type: "Non-AC Deluxe",
    total_seats: 45,
    available_seats: 20,
    regular_fare: 500,
    student_fare: 400, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801711887766",
  },
  {
    id: "route-ruet-dinajpur-1",
    exam_id: "exam-ruet-eng",
    university_name: "RUET (রাজশাহী প্রকৌশল বিশ্ববিদ্যালয়)",
    short_code: "RUET",
    unit_name: "Engineering Unit (KA & KHA)",
    departure_district: "Dinajpur",
    boarding_point: "Medical Mor, Dinajpur",
    campus_drop_point: "RUET Main Gate, Kazla, Rajshahi",
    departure_time: "04:00 AM (Exam day morning)",
    campus_arrival_time: "07:30 AM (Exam day • Guaranteed 2.5h before exam)",
    return_departure_time: "03:30 PM (Post-exam)",
    bus_operator: "Grameen Travels Special",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 13,
    regular_fare: 550,
    student_fare: 440, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801714556677",
  },

  // Chittagong University (CU)
  {
    id: "route-cu-cumilla-1",
    exam_id: "exam-cu-a",
    university_name: "Chittagong University (CU)",
    short_code: "CU",
    unit_name: "A Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Cumilla",
    boarding_point: "Shashongachha Central, Cumilla",
    campus_drop_point: "CU 1 No. Gate & Shuttle Station",
    departure_time: "05:30 AM (Exam day morning)",
    campus_arrival_time: "08:45 AM (Exam day • Guaranteed 2h 15m before exam)",
    return_departure_time: "03:00 PM (Post-exam from Campus Gate)",
    bus_operator: "Tisha Special Campus Express",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 15,
    regular_fare: 650,
    student_fare: 520, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801911778899",
  },
  {
    id: "route-cu-sylhet-1",
    exam_id: "exam-cu-a",
    university_name: "Chittagong University (CU)",
    short_code: "CU",
    unit_name: "A Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Sylhet",
    boarding_point: "Kadamtali Bus Terminal, Sylhet",
    campus_drop_point: "CU 1 No. Gate & Faculty of Science",
    departure_time: "10:30 PM (Night before exam)",
    campus_arrival_time: "06:30 AM (Exam day • Guaranteed 4.5h before exam)",
    return_departure_time: "04:00 PM (Post-exam)",
    bus_operator: "Hanif Enterprise (Campus Transit)",
    bus_type: "Hyundai Luxury AC",
    total_seats: 38,
    available_seats: 10,
    regular_fare: 1100,
    student_fare: 880, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801718334455",
  },

  // GST Cluster (গুচ্ছ ২৪ বিশ্ববিদ্যালয়)
  {
    id: "route-gst-bogura-1",
    exam_id: "exam-gst",
    university_name: "GST Cluster (গুচ্ছ ২৪ বিশ্ববিদ্যালয়)",
    short_code: "GST",
    unit_name: "A Unit (General Science & Tech)",
    departure_district: "Bogura",
    boarding_point: "Thonthonia Central Bus Stand, Bogura",
    campus_drop_point: "BRUR Rangpur Campus Center",
    departure_time: "06:00 AM (Exam day morning)",
    campus_arrival_time: "09:30 AM (Exam day • Guaranteed 2.5h before exam)",
    return_departure_time: "03:30 PM (Post-exam)",
    bus_operator: "Shyamoli NR Travels (GST Express)",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 18,
    regular_fare: 400,
    student_fare: 320, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801713445566",
  },
  {
    id: "route-gst-khulna-1",
    exam_id: "exam-gst",
    university_name: "GST Cluster (গুচ্ছ ২৪ বিশ্ববিদ্যালয়)",
    short_code: "GST",
    unit_name: "A Unit (General Science & Tech)",
    departure_district: "Khulna",
    boarding_point: "Sonadanga Central Bus Terminal, Khulna",
    campus_drop_point: "JUST Jashore Campus Center",
    departure_time: "07:00 AM (Exam day morning)",
    campus_arrival_time: "09:15 AM (Exam day • Guaranteed 2h 45m before exam)",
    return_departure_time: "03:00 PM (Post-exam)",
    bus_operator: "Sohag Elite (Campus Fleet)",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 16,
    regular_fare: 350,
    student_fare: 280, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801715889900",
  },
  {
    id: "route-gst-barishal-1",
    exam_id: "exam-gst",
    university_name: "GST Cluster (গুচ্ছ ২৪ বিশ্ববিদ্যালয়)",
    short_code: "GST",
    unit_name: "A Unit (General Science & Tech)",
    departure_district: "Barishal",
    boarding_point: "Nathullabad Central Terminal, Barishal",
    campus_drop_point: "PSTU Patuakhali Campus Center",
    departure_time: "06:30 AM (Exam day morning)",
    campus_arrival_time: "09:30 AM (Exam day • Guaranteed 2.5h before exam)",
    return_departure_time: "03:30 PM (Post-exam)",
    bus_operator: "Sakura Paribahan (Cluster Special)",
    bus_type: "Non-AC Deluxe",
    total_seats: 45,
    available_seats: 22,
    regular_fare: 300,
    student_fare: 240, // 20% discount
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801716990011",
  },
];

// Ensure Service Hook methods requirement 5: Query admissionBusService.getSpecialRoutes() and bookStudentTicket()
if (typeof (admissionBusService as any).getSpecialRoutes !== "function") {
  (admissionBusService as any).getSpecialRoutes = async (
    universityCode?: string,
    district?: string
  ): Promise<AdmissionBusRoute[]> => {
    let routes = [...ENRICHED_SPECIAL_ROUTES];
    try {
      const baseRoutes = await admissionBusService.getAdmissionRoutes(
        universityCode,
        district
      );
      if (baseRoutes && baseRoutes.length > 0) {
        const existingIds = new Set(routes.map((r) => r.id));
        baseRoutes.forEach((r) => {
          if (!existingIds.has(r.id)) {
            routes.push(r);
          }
        });
      }
    } catch (e) {
      console.warn("Base admission routes fetch fallback:", e);
    }

    if (universityCode && universityCode !== "ALL") {
      routes = routes.filter((r) => r.short_code === universityCode);
    }

    if (district && district !== "ALL") {
      routes = routes.filter(
        (r) => r.departure_district.toLowerCase() === district.toLowerCase()
      );
    }

    return routes;
  };
}

if (typeof (admissionBusService as any).bookStudentTicket !== "function") {
  (admissionBusService as any).bookStudentTicket = async (
    booking: Omit<AdmissionTicketBooking, "id" | "status" | "created_at">
  ): Promise<AdmissionTicketBooking> => {
    return admissionBusService.bookAdmissionTicket(booking);
  };
}

// Seat configuration
const SEAT_ROWS = [
  { row: "A", left: ["A1", "A2"], right: ["A3", "A4"], female: true },
  { row: "B", left: ["B1", "B2"], right: ["B3", "B4"], female: true },
  { row: "C", left: ["C1", "C2"], right: ["C3", "C4"], female: false },
  { row: "D", left: ["D1", "D2"], right: ["D3", "D4"], female: false },
  { row: "E", left: ["E1", "E2"], right: ["E3", "E4"], female: false },
  { row: "F", left: ["F1", "F2"], right: ["F3", "F4"], female: false },
];

// Helper to determine adjacent seat in standard 2x2 bus layout
const getAdjacentSeat = (seatId: string): string | null => {
  const row = seatId.charAt(0);
  const num = parseInt(seatId.slice(1), 10);
  if (num === 1) return `${row}2`;
  if (num === 2) return `${row}1`;
  if (num === 3) return `${row}4`;
  if (num === 4) return `${row}3`;
  return null;
};

export default function AdmissionBusScreen() {
  const [selectedUni, setSelectedUni] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [routes, setRoutes] = useState<AdmissionBusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAdvisoriesModal, setShowAdvisoriesModal] = useState(false);
  const [expandedAdvisory, setExpandedAdvisory] = useState<number | null>(null);

  // Seat Booking Modal State
  const [bookingRoute, setBookingRoute] = useState<AdmissionBusRoute | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [hscRoll, setHscRoll] = useState("");
  const [isHscVerified, setIsHscVerified] = useState(false);

  // Guardian Accompanying State
  const [hasGuardianSeat, setHasGuardianSeat] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("বাবা");
  const [guardianPhone, setGuardianPhone] = useState("");

  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<{
    booking: AdmissionTicketBooking;
    route: AdmissionBusRoute;
  } | null>(null);

  // Service Hook: Query admissionBusService.getSpecialRoutes()
  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await (admissionBusService as any).getSpecialRoutes(
        selectedUni,
        selectedDistrict
      );
      setRoutes(data);
    } catch (e: any) {
      console.warn("Failed to load admission routes:", e);
      setFetchError(e?.message || "ভর্তি পরীক্ষার স্পেশাল বাস রুট লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }, [selectedUni, selectedDistrict]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // HSC Roll Verification: Instant 20% subsidy calculation
  useEffect(() => {
    const clean = hscRoll.trim();
    if (clean.length >= 6) {
      setIsHscVerified(true);
    } else {
      setIsHscVerified(false);
    }
  }, [hscRoll]);

  // Active university object for exam tracker
  const activeUniObj = useMemo(() => {
    return TARGET_UNIVERSITIES.find((u) => u.code === selectedUni);
  }, [selectedUni]);

  // Handle seat toggling with adjacent guardian logic
  const toggleSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      // If guardian is accompanying and user deselects, remove the pair or individual seat
      if (hasGuardianSeat) {
        const adjacent = getAdjacentSeat(seatId);
        setSelectedSeats((prev) =>
          prev.filter((s) => s !== seatId && s !== adjacent)
        );
      } else {
        setSelectedSeats((prev) => prev.filter((s) => s !== seatId));
      }
    } else {
      if (hasGuardianSeat) {
        const adjacent = getAdjacentSeat(seatId);
        if (!adjacent) {
          Alert.alert("ত্রুটি", "সংলগ্ন সিট পাওয়া যায়নি।");
          return;
        }
        // Auto reserve adjacent seat for guardian
        const pair = [seatId, adjacent];
        setSelectedSeats(pair);
      } else {
        if (selectedSeats.length >= 4) {
          Alert.alert("সর্বোচ্চ সীমা", "একসাথে সর্বোচ্চ ৪টি সিট নির্বাচন করা যাবে।");
          return;
        }
        setSelectedSeats((prev) => [...prev, seatId]);
      }
    }
  };

  // Toggle guardian accompanying checkbox
  const handleToggleGuardianOption = (enable: boolean) => {
    setHasGuardianSeat(enable);
    if (enable) {
      if (selectedSeats.length > 0) {
        const primarySeat = selectedSeats[0];
        const adjacent = getAdjacentSeat(primarySeat);
        if (adjacent) {
          setSelectedSeats([primarySeat, adjacent]);
        }
      } else {
        // Automatically default to front accessible row A1 + A2
        setSelectedSeats(["A1", "A2"]);
      }
    } else {
      if (selectedSeats.length > 1) {
        setSelectedSeats([selectedSeats[0]]);
      }
    }
  };

  // Calculate pricing breakdown
  const pricing = useMemo(() => {
    if (!bookingRoute) {
      return {
        regularFarePerSeat: 0,
        studentFarePerSeat: 0,
        subsidyPerSeat: 0,
        studentSeatCount: 0,
        guardianSeatCount: 0,
        totalFare: 0,
        totalSavings: 0,
      };
    }

    const reg = bookingRoute.regular_fare;
    // Guaranteed 20% transit subsidy
    const subsidy = Math.round(reg * 0.2);
    const studentFare = reg - subsidy;

    let studentSeats = selectedSeats.length;
    let guardianSeats = 0;

    if (hasGuardianSeat && selectedSeats.length >= 2) {
      studentSeats = 1;
      guardianSeats = selectedSeats.length - 1;
    } else if (hasGuardianSeat && selectedSeats.length === 1) {
      studentSeats = 1;
      guardianSeats = 0;
    }

    // Apply student subsidy to student seat
    const studentTotal = studentSeats * (isHscVerified ? studentFare : studentFare);
    // Guardian seat pays regular or standard student fare
    const guardianTotal = guardianSeats * reg;
    const finalTotal = studentTotal + guardianTotal;
    const totalSavings = studentSeats * subsidy;

    return {
      regularFarePerSeat: reg,
      studentFarePerSeat: studentFare,
      subsidyPerSeat: subsidy,
      studentSeatCount: studentSeats,
      guardianSeatCount: guardianSeats,
      totalFare: finalTotal,
      totalSavings,
    };
  }, [bookingRoute, selectedSeats, hasGuardianSeat, isHscVerified]);

  // Service Hook: Reserve tickets via admissionBusService.bookStudentTicket()
  const handleBookingSubmit = async () => {
    if (!bookingRoute) return;
    if (selectedSeats.length === 0) {
      Alert.alert("সিট নির্বাচন করুন", "কমপক্ষে একটি সিট সিলেক্ট করুন।");
      return;
    }
    if (!studentName.trim() || !studentPhone.trim()) {
      Alert.alert(
        "প্রয়োজনীয় তথ্য",
        "শিক্ষার্থীর নাম এবং মোবাইল নম্বর দেওয়া বাধ্যতামূলক।"
      );
      return;
    }
    if (!hscRoll.trim()) {
      Alert.alert(
        "এইচএসসি তথ্য প্রয়োজন",
        "২০% স্টুডেন্ট ট্রানজিট সাবসিডির জন্য আপনার এইচএসসি রোল বা রেজিস্ট্রেশন নম্বর দিন।"
      );
      return;
    }

    if (hasGuardianSeat) {
      if (!guardianName.trim() || !guardianPhone.trim()) {
        Alert.alert(
          "অভিভাবকের তথ্য প্রয়োজন",
          "অভিভাবকের সহযাত্রী সিটের জন্য অভিভাবকের নাম এবং জরুরি ফোন নম্বর দিন।"
        );
        return;
      }
    }

    try {
      setSubmittingBooking(true);

      const guardianInfoString = hasGuardianSeat
        ? `${guardianName.trim()} (${guardianRelation}) - জরুরি ফোন: ${guardianPhone.trim()}`
        : undefined;

      // Invoking requirement 5: admissionBusService.bookStudentTicket()
      const newBooking = await (admissionBusService as any).bookStudentTicket({
        route_id: bookingRoute.id,
        university_name: bookingRoute.university_name,
        unit_name: bookingRoute.unit_name,
        student_name: studentName.trim(),
        student_phone: studentPhone.trim(),
        hsc_roll: hscRoll.trim(),
        guardian_name: guardianInfoString,
        selected_seats: selectedSeats,
        total_fare: pricing.totalFare,
        pickup_point: bookingRoute.boarding_point,
        drop_point: bookingRoute.campus_drop_point,
      });

      setBookingSuccessData({
        booking: newBooking,
        route: bookingRoute,
      });

      setBookingRoute(null);
    } catch {
      Alert.alert("ত্রুটি", "টিকিট বুকিং ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const closeSuccessModal = () => {
    setBookingSuccessData(null);
    setSelectedSeats([]);
    setStudentName("");
    setStudentPhone("");
    setHscRoll("");
    setGuardianName("");
    setGuardianPhone("");
    setHasGuardianSeat(false);
  };

    const openPhoneCall = (phoneNumber: string) => {
    openLink(`tel:${phoneNumber}`, {
      label: "অ্যাডমিশন বাস হেল্পলাইন",
      copyValue: phoneNumber,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />

      {/* HEADER SECTION */}
      <LinearGradient colors={["#1E1B4B", VIOLET_PURPLE]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginStart: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>Admission Exam Transit</Text>
              <View style={styles.examTag}>
                <Text style={styles.examTagText}>২০২৬ সেশন</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              বিশ্ববিদ্যালয় ভর্তি পরীক্ষা ডেডিকেটেড স্টুডেন্ট ক্যাম্পাস এক্সপ্রেস
            </Text>
          </View>

          {/* Advisories Button */}
          <TouchableOpacity
            style={styles.advisoryHeaderBtn}
            onPress={() => setShowAdvisoriesModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={16} color="#FBBF24" />
            <Text style={styles.advisoryHeaderBtnText}>নির্দেশিকা</Text>
          </TouchableOpacity>
        </View>

        {/* 1. UNIVERSITY EXAM TRACKER SELECTOR */}
        <View style={styles.trackerLabelRow}>
          <Ionicons name="calendar-outline" size={14} color="#E0E7FF" />
          <Text style={styles.trackerSectionLabel}>
            বিশ্ববিদ্যালয় ভর্তি পরীক্ষার সূচি ও ট্র্যাকার:
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.uniScroll}
        >
          {TARGET_UNIVERSITIES.map((uni) => {
            const active = selectedUni === uni.code;
            return (
              <TouchableOpacity
                key={uni.code}
                style={[styles.uniPill, active && styles.uniPillActive]}
                onPress={() => setSelectedUni(uni.code)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={uni.icon as any}
                  size={14}
                  color={active ? VIOLET_PURPLE : "#C7D2FE"}
                />
                <View>
                  <Text
                    style={[
                      styles.uniPillText,
                      active && styles.uniPillTextActive,
                    ]}
                  >
                    {uni.label}
                  </Text>
                  {uni.examDate && (
                    <Text
                      style={[
                        styles.uniPillSubText,
                        active && styles.uniPillSubTextActive,
                      ]}
                    >
                      {uni.examDate}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIVE EXAM SCHEDULE CALLOUT */}
        {activeUniObj && activeUniObj.code !== "ALL" && (
          <View style={styles.activeExamCard}>
            <LinearGradient
              colors={["#312E81", "#4338CA"]}
              style={styles.activeExamGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.examBadgeIcon}>
                <Ionicons name="school" size={24} color="#FBBF24" />
              </View>
              <View style={{ flex: 1, marginStart: 12 }}>
                <View style={styles.badgeRow}>
                  <Text style={styles.activeExamUniName}>
                    {activeUniObj.label} ({activeUniObj.subLabel})
                  </Text>
                </View>
                <Text style={styles.activeExamSchedule}>
                  📅 পরীক্ষার তারিখ: {activeUniObj.examDate} • ⏰ সময়: {activeUniObj.examTime}
                </Text>
                <Text style={styles.activeExamCenter}>
                  🏛️ কেন্দ্র: {activeUniObj.center}
                </Text>

                {/* Guaranteed 2 Hours Prior Arrival Callout */}
                <View style={styles.guaranteedArrivalBadge}>
                  <Ionicons name="time" size={13} color="#059669" />
                  <Text style={styles.guaranteedArrivalText}>
                    গ্যারান্টিযুক্ত আগমন: {activeUniObj.guaranteedArrival}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* DISTRICT HUB FILTER ROW */}
        <View style={styles.districtFilterBox}>
          <View style={styles.districtFilterHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="navigate" size={14} color="#4338CA" />
              <Text style={styles.districtFilterTitle}>
                জেলা বোর্ডিং হাব নির্বাচন করুন:
              </Text>
            </View>
            <Text style={styles.districtCountText}>
              ({DISTRICT_HUBS.length - 1} টি জেলা হাব)
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtScroll}
          >
            {DISTRICT_HUBS.map((dist) => {
              const active = selectedDistrict === dist.code;
              return (
                <TouchableOpacity
                  key={dist.code}
                  style={[
                    styles.districtPill,
                    active && styles.districtPillActive,
                  ]}
                  onPress={() => setSelectedDistrict(dist.code)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.districtPillText,
                      active && styles.districtPillTextActive,
                    ]}
                  >
                    {dist.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SPECIAL BENEFIT HIGHLIGHT CARD */}
        <View style={styles.featureCard}>
          <LinearGradient
            colors={["#064E3B", "#047857"]}
            style={styles.featureGradient}
          >
            <View style={{ flex: 1, paddingEnd: 8 }}>
              <View style={styles.studentBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FBBF24" />
                <Text style={styles.studentBadgeText}>
                  নিরাপদ ছাত্র ও অভিভাবক ট্রানজিট
                </Text>
              </View>
              <Text style={styles.featureTitle}>
                পরীক্ষা শুরুর ঠিক ২ ঘণ্টা পূর্বে সরাসরি অনুষদ গেটে পৌঁছানোর নিশ্চয়তা
              </Text>
              <Text style={styles.featureDesc}>
                • এইচএসসি রোল দিলেই তাৎক্ষণিক ২০% ট্রানজিট সাবসিডি{"\n"}
                • অভিভাবকের জন্য সংলগ্ন সহযাত্রী সিট বুকিং সুবিধা{"\n"}
                • ছাত্রীদের জন্য সংরক্ষিত সামনের সারি ও ২৪/৭ রুট কো-অর্ডিনেটর
              </Text>
            </View>
            <View style={styles.featureIconBox}>
              <Ionicons name="bus" size={36} color="#A7F3D0" />
            </View>
          </LinearGradient>
        </View>

        {/* EXAM DAY TRAVEL ADVISORIES BANNER */}
        <TouchableOpacity
          style={styles.advisoryBanner}
          onPress={() => setShowAdvisoriesModal(true)}
          activeOpacity={0.9}
        >
          <View style={styles.advisoryBannerIcon}>
            <Ionicons name="alert-circle" size={24} color="#D97706" />
          </View>
          <View style={{ flex: 1, marginStart: 10 }}>
            <Text style={styles.advisoryBannerTitle}>
              ভর্তি পরীক্ষার দিনের জরুরি ভ্রমণ নির্দেশিকা
            </Text>
            <Text style={styles.advisoryBannerSub}>
              এডমিট কার্ড, ইলেকট্রনিক ডিভাইস, রিপোর্টিং ও নিরাপত্তা সংক্রান্ত নির্দেশনা পড়ুন
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        {/* DEDICATED STUDENT ROUTES LISTING */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              উপলব্ধ ডেডিকেটেড স্টুডেন্ট বাস রুট ({routes.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              সরাসরি ক্যাম্পাস গেট ড্রপ ও পরীক্ষা শেষে ফেরার গ্যারান্টি
            </Text>
          </View>
          <View style={styles.subsidyBadge}>
            <Text style={styles.subsidyBadgeText}>২০% সাবসিডি ছাড়</Text>
          </View>
        </View>

        {/* LOADING STATE */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={VIOLET_PURPLE} />
            <Text style={styles.loadingText}>স্পেশাল বাস রুটসমূহ লোড হচ্ছে...</Text>
          </View>
        ) : fetchError ? (
          <View style={{ marginHorizontal: 16, marginVertical: 20 }}>
            <ErrorStateCard
              title="বাস রুট লোড করা সম্ভব হয়নি"
              message={fetchError}
              retryText="পুনরায় চেষ্টা করুন"
              onRetry={loadRoutes}
            />
          </View>
        ) : routes.length === 0 ? (
          <View style={{ marginHorizontal: 16, marginVertical: 20 }}>
            <EmptyStateView
              icon="bus-outline"
              title="কোনো বাস রুট পাওয়া যায়নি"
              description="অন্য কোনো বিশ্ববিদ্যালয় বা জেলা হাব নির্বাচন করে দেখুন।"
              actionText="ফিল্টার রিসেট করুন"
              onAction={() => {
                setSelectedUni("ALL");
                setSelectedDistrict("ALL");
              }}
            />
          </View>
        ) : (
          routes.map((route) => {
            const subsidyAmount = Math.round(route.regular_fare * 0.2);
            return (
              <View key={route.id} style={styles.routeCard}>
                {/* Route Header */}
                <View style={styles.routeCardHeader}>
                  <View style={styles.uniBadge}>
                    <Text style={styles.uniBadgeText}>{route.short_code}</Text>
                  </View>
                  <View style={{ flex: 1, marginStart: 10 }}>
                    <Text style={styles.uniFullName}>{route.university_name}</Text>
                    <Text style={styles.unitNameText}>{route.unit_name}</Text>
                  </View>
                  <View style={styles.busTypePill}>
                    <Text style={styles.busTypePillText}>{route.bus_type}</Text>
                  </View>
                </View>

                {/* Guaranteed 2-Hour Pre-Exam Indicator */}
                <View style={styles.guaranteeTagRow}>
                  <Ionicons name="time" size={13} color="#059669" />
                  <Text style={styles.guaranteeTagText}>
                    পরীক্ষার ২ ঘণ্টা পূর্বে ক্যাম্পাসে পৌঁছানোর নিশ্চয়তা
                  </Text>
                </View>

                {/* Route Timeline */}
                <View style={styles.journeyTimeline}>
                  <View style={styles.timelineRow}>
                    <Ionicons name="radio-button-on" size={16} color="#059669" />
                    <View style={{ flex: 1, marginStart: 10 }}>
                      <Text style={styles.pointLabel}>
                        বোর্ডিং পয়েন্ট ({route.departure_district} হাব):
                      </Text>
                      <Text style={styles.pointName}>{route.boarding_point}</Text>
                      <Text style={styles.timeText}>🕒 যাত্রা শুরু: {route.departure_time}</Text>
                    </View>
                  </View>

                  <View style={styles.timelineConnector} />

                  <View style={styles.timelineRow}>
                    <Ionicons name="location" size={16} color="#DC2626" />
                    <View style={{ flex: 1, marginStart: 10 }}>
                      <Text style={styles.pointLabel}>
                        ক্যাম্পাস ড্রপ (পরীক্ষা কেন্দ্র প্রাঙ্গণ):
                      </Text>
                      <Text style={styles.pointName}>{route.campus_drop_point}</Text>
                      <Text style={styles.arrivalTimeText}>
                        📍 আগমন: {route.campus_arrival_time}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Safety & Return Pill Badges */}
                <View style={styles.safetyBadgesWrap}>
                  <View style={styles.safetyPill}>
                    <Ionicons name="shield-checkmark" size={12} color="#059669" />
                    <Text style={styles.safetyPillText}>ছাত্রী সংরক্ষিত সামনের সারি</Text>
                  </View>
                  <View style={styles.guardianOptionPill}>
                    <Ionicons name="people" size={12} color="#D97706" />
                    <Text style={styles.guardianOptionPillText}>
                      অভিভাবক সহযাত্রী সিট অনুমোদিত
                    </Text>
                  </View>
                  <View style={styles.returnPill}>
                    <Ionicons name="repeat" size={12} color="#4338CA" />
                    <Text style={styles.returnPillText}>
                      ফিরতি যাত্রা: {route.return_departure_time}
                    </Text>
                  </View>
                </View>

                {/* Operator info & Coordinator */}
                <View style={styles.operatorRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                    <Ionicons name="bus-outline" size={14} color="#64748B" />
                    <Text style={styles.operatorText}>{route.bus_operator}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.coordinatorCallBtn}
                    onPress={() => openPhoneCall(route.coordinator_phone)}
                  >
                    <Ionicons name="call" size={11} color="#4338CA" />
                    <Text style={styles.coordinatorCallText}>কো-অর্ডিনেটর</Text>
                  </TouchableOpacity>

                  <Text style={styles.seatsLeftText}>
                    {route.available_seats} সিট বাকি
                  </Text>
                </View>

                {/* Footer with Price and Seat Selection */}
                <View style={styles.routeCardFooter}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.fareLabel}>স্টুডেন্ট সাবসিডি ভাড়া</Text>
                      <View style={styles.miniDiscountTag}>
                        <Text style={styles.miniDiscountTagText}>-২০%</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                      <Text style={styles.studentFare}>
                        ৳{route.regular_fare - subsidyAmount}
                      </Text>
                      <Text style={styles.regularFare}>৳{route.regular_fare}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.bookSeatsBtn}
                    onPress={() => {
                      setBookingRoute(route);
                      setSelectedSeats([]);
                      setHasGuardianSeat(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[VIOLET_PURPLE, "#6D28D9"]}
                      style={styles.bookSeatsGradient}
                    >
                      <Ionicons name="keypad" size={15} color="#FFFFFF" />
                      <Text style={styles.bookSeatsBtnText}>সিট নির্বাচন ও বুকিং</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 2. SEAT SELECTION & STUDENT RESERVATION MODAL */}
      <Modal
        visible={!!bookingRoute}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingRoute(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {bookingRoute && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>সিট নির্বাচন ও টিকিট বুকিং</Text>
                    <Text style={styles.modalSubHeader}>
                      {bookingRoute.university_name} • {bookingRoute.bus_operator}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBookingRoute(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Reporting Guarantee Banner */}
                  <View style={styles.modalGuaranteeBanner}>
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <Text style={styles.modalGuaranteeText}>
                      নিশ্চিত আগমন: পরীক্ষার ২ ঘণ্টা পূর্বে সরাসরি {bookingRoute.campus_drop_point}
                    </Text>
                  </View>

                  {/* 4. GUARDIAN ACCOMPANYING OPTION TOGGLE */}
                  <View style={styles.guardianToggleCard}>
                    <View style={{ flex: 1, paddingEnd: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="people" size={18} color="#D97706" />
                        <Text style={styles.guardianToggleTitle}>
                          অভিভাবকের সহযাত্রী সিট যোগ করুন
                        </Text>
                      </View>
                      <Text style={styles.guardianToggleSubtitle}>
                        পরীক্ষার্থীর পাশে অভিভাবকের সংলগ্ন সিট বুকিং করুন
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.customCheckbox,
                        hasGuardianSeat && styles.customCheckboxActive,
                      ]}
                      onPress={() => handleToggleGuardianOption(!hasGuardianSeat)}
                      activeOpacity={0.8}
                    >
                      {hasGuardianSeat && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* BUS SEAT LAYOUT */}
                  <View style={styles.busLayoutBox}>
                    <View style={styles.driverRow}>
                      <View style={styles.driverSeat}>
                        <Ionicons name="speedometer-outline" size={16} color="#64748B" />
                        <Text style={styles.driverText}>ড্রাইভার</Text>
                      </View>
                      <View style={styles.doorArea}>
                        <Text style={styles.doorText}>প্রবেশ পথ</Text>
                      </View>
                    </View>

                    {/* Seat Grid */}
                    {SEAT_ROWS.map((rowObj) => (
                      <View key={rowObj.row} style={styles.seatRow}>
                        {/* Left Pair */}
                        <View style={styles.seatPair}>
                          {rowObj.left.map((seatId) => {
                            const isSelected = selectedSeats.includes(seatId);
                            const isGuardianSeat =
                              hasGuardianSeat &&
                              selectedSeats.length >= 2 &&
                              seatId === selectedSeats[1];
                            return (
                              <TouchableOpacity
                                key={seatId}
                                style={[
                                  styles.seat,
                                  rowObj.female && styles.seatFemale,
                                  isSelected && styles.seatSelected,
                                  isGuardianSeat && styles.seatGuardianSelected,
                                ]}
                                onPress={() => toggleSeat(seatId)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={isGuardianSeat ? "people" : "person"}
                                  size={13}
                                  color={
                                    isSelected
                                      ? "#FFFFFF"
                                      : rowObj.female
                                      ? "#7C3AED"
                                      : "#64748B"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.seatText,
                                    isSelected && styles.seatTextSelected,
                                  ]}
                                >
                                  {seatId}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Aisle */}
                        <View style={styles.aisle} />

                        {/* Right Pair */}
                        <View style={styles.seatPair}>
                          {rowObj.right.map((seatId) => {
                            const isSelected = selectedSeats.includes(seatId);
                            const isGuardianSeat =
                              hasGuardianSeat &&
                              selectedSeats.length >= 2 &&
                              seatId === selectedSeats[1];
                            return (
                              <TouchableOpacity
                                key={seatId}
                                style={[
                                  styles.seat,
                                  rowObj.female && styles.seatFemale,
                                  isSelected && styles.seatSelected,
                                  isGuardianSeat && styles.seatGuardianSelected,
                                ]}
                                onPress={() => toggleSeat(seatId)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={isGuardianSeat ? "people" : "person"}
                                  size={13}
                                  color={
                                    isSelected
                                      ? "#FFFFFF"
                                      : rowObj.female
                                      ? "#7C3AED"
                                      : "#64748B"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.seatText,
                                    isSelected && styles.seatTextSelected,
                                  ]}
                                >
                                  {seatId}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}

                    {/* Seat Legend */}
                    <View style={styles.seatLegendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, { backgroundColor: PRIMARY_BLUE }]} />
                        <Text style={styles.legendLabel}>শিক্ষার্থী</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, { backgroundColor: AMBER_GOLD }]} />
                        <Text style={styles.legendLabel}>অভিভাবক</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendBox,
                            {
                              backgroundColor: "#F3E8FF",
                              borderColor: "#7C3AED",
                              borderWidth: 1,
                            },
                          ]}
                        />
                        <Text style={styles.legendLabel}>ছাত্রী সংরক্ষিত</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, { backgroundColor: "#F1F5F9" }]} />
                        <Text style={styles.legendLabel}>খালি</Text>
                      </View>
                    </View>
                  </View>

                  {/* 3. STUDENT VERIFICATION & DISCOUNT INPUT */}
                  <View style={styles.verificationCard}>
                    <View style={styles.verificationHeader}>
                      <Ionicons name="school-outline" size={16} color="#4338CA" />
                      <Text style={styles.verificationTitle}>
                        শিক্ষার্থী ভেরিফিকেশন ও ২০% সাবসিডি
                      </Text>
                    </View>

                    <Text style={styles.inputLabel}>
                      এইচএসসি রোল বা রেজিস্ট্রেশন নম্বর * (২০% ছাড় সক্রিয় করতে)
                    </Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput
                        style={styles.textInputWithIcon}
                        placeholder="যেমন: 123456 বা 1810987654"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={hscRoll}
                        onChangeText={setHscRoll}
                      />
                      {isHscVerified ? (
                        <View style={styles.verifiedCheck}>
                          <Ionicons name="checkmark-circle" size={20} color="#059669" />
                        </View>
                      ) : null}
                    </View>

                    {/* Subsidy notification banner */}
                    {isHscVerified ? (
                      <View style={styles.subsidyAppliedBanner}>
                        <Ionicons name="checkmark-done" size={14} color="#059669" />
                        <Text style={styles.subsidyAppliedText}>
                          ✓ এইচএসসি রোল যাচাইকৃত! ২০% সরকারি ও স্পেশাল ট্রানজিট সাবসিডি প্রযোজ্য (-৳{pricing.subsidyPerSeat})
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.subsidyPromptText}>
                        💡 আপনার এইচএসসি রোল/রেজিস্ট্রেশন নম্বর লিখলে টিকিটে তাৎক্ষণিক ২০% ট্রানজিট ভর্তুকি পাবেন।
                      </Text>
                    )}
                  </View>

                  {/* STUDENT CONTACT DETAILS */}
                  <Text style={styles.inputLabel}>শিক্ষার্থীর পুরো নাম *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="অ্যাডমিট কার্ড অনুযায়ী পুরো নাম লিখুন"
                    placeholderTextColor="#94A3B8"
                    value={studentName}
                    onChangeText={setStudentName}
                  />

                  <Text style={styles.inputLabel}>শিক্ষার্থীর মোবাইল নম্বর *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="টিকিট কনফার্মেশন ও বাস আপডেট পেতে নম্বর দিন"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={studentPhone}
                    onChangeText={setStudentPhone}
                  />

                  {/* 4. EMERGENCY GUARDIAN CONTACT INPUTS */}
                  {hasGuardianSeat && (
                    <View style={styles.guardianFormCard}>
                      <View style={styles.guardianFormHeader}>
                        <Ionicons name="shield-half" size={16} color="#D97706" />
                        <Text style={styles.guardianFormTitle}>
                          অভিভাবক সহযাত্রী ও জরুরি যোগাযোগ তথ্য
                        </Text>
                      </View>

                      <Text style={styles.inputLabel}>অভিভাবকের পুরো নাম *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="সহযাত্রী অভিভাবকের নাম"
                        placeholderTextColor="#94A3B8"
                        value={guardianName}
                        onChangeText={setGuardianName}
                      />

                      <Text style={styles.inputLabel}>সম্পর্ক নির্বাচন করুন</Text>
                      <View style={styles.relationPillRow}>
                        {["বাবা", "মা", "ভাই", "বোন", "অন্যান্য"].map((rel) => (
                          <TouchableOpacity
                            key={rel}
                            style={[
                              styles.relationPill,
                              guardianRelation === rel && styles.relationPillActive,
                            ]}
                            onPress={() => setGuardianRelation(rel)}
                          >
                            <Text
                              style={[
                                styles.relationPillText,
                                guardianRelation === rel &&
                                  styles.relationPillTextActive,
                              ]}
                            >
                              {rel}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.inputLabel}>
                        জরুরি অভিভাবক মোবাইল নম্বর * (২৪/৭ চালু নম্বর)
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="জরুরি যোগাযোগের ফোন নম্বর"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={guardianPhone}
                        onChangeText={setGuardianPhone}
                      />
                    </View>
                  )}

                  {/* FARE SUMMARY */}
                  <View style={styles.fareSummaryCard}>
                    <Text style={styles.fareSummaryTitle}>ভাড়ার বিবরণী</Text>

                    <View style={styles.fareRow}>
                      <Text style={styles.fareRowLabel}>
                        নির্বাচিত সিট ({selectedSeats.length} টি)
                      </Text>
                      <Text style={styles.fareRowValue}>
                        {selectedSeats.length > 0
                          ? selectedSeats.join(", ")
                          : "কোনোটি নির্বাচিত নয়"}
                      </Text>
                    </View>

                    {/* Subsidized student seat */}
                    <View style={styles.fareRow}>
                      <Text style={styles.fareRowLabel}>
                        শিক্ষার্থী সিট (২০% ভর্তুকিসহ)
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                        <Text style={styles.fareRowValue}>
                          ৳{pricing.studentFarePerSeat}
                        </Text>
                        <Text style={styles.strikethroughFare}>
                          ৳{pricing.regularFarePerSeat}
                        </Text>
                      </View>
                    </View>

                    {/* Guardian seat if accompanying */}
                    {hasGuardianSeat && pricing.guardianSeatCount > 0 && (
                      <View style={styles.fareRow}>
                        <Text style={styles.fareRowLabel}>
                          অভিভাবক সহযাত্রী সিট ({pricing.guardianSeatCount} টি)
                        </Text>
                        <Text style={styles.fareRowValue}>
                          ৳{pricing.regularFarePerSeat * pricing.guardianSeatCount}
                        </Text>
                      </View>
                    )}

                    {/* Instant Savings Callout */}
                    <View style={styles.savingsBannerRow}>
                      <Ionicons name="sparkles" size={13} color="#059669" />
                      <Text style={styles.savingsBannerText}>
                        মোট শিক্ষার্থী ট্রানজিট সাবসিডি সাশ্রয়: ৳{pricing.totalSavings}
                      </Text>
                    </View>

                    <View style={styles.fareDivider} />

                    <View style={styles.fareRow}>
                      <Text style={styles.totalFareLabel}>মোট প্রদেয় ভাড়া</Text>
                      <Text style={styles.totalFareValue}>
                        ৳{pricing.totalFare.toLocaleString("en-BD")}
                      </Text>
                    </View>
                  </View>

                  {/* Pre-Exam Checklist Reminder */}
                  <View style={styles.quickAdvisoryNotice}>
                    <Ionicons name="information-circle" size={16} color="#4338CA" />
                    <Text style={styles.quickAdvisoryText}>
                      মূল প্রবেশপত্র ও এইচএসসি রেজিস্ট্রেশন কার্ড সঙ্গে রাখুন। বাসের নির্ধারিত ছাড়ার সময়ের ২০ মিনিট পূর্বে বোর্ডিং পয়েন্টে উপস্থিত থাকুন।
                    </Text>
                  </View>

                  {/* SUBMIT BUTTON */}
                  <TouchableOpacity
                    style={styles.confirmTicketBtn}
                    onPress={handleBookingSubmit}
                    disabled={submittingBooking}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[VIOLET_PURPLE, "#5B21B6"]}
                      style={styles.confirmGradient}
                    >
                      {submittingBooking ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.confirmTicketBtnText}>
                            টিকিট বুকিং নিশ্চিত করুন (৳{pricing.totalFare})
                          </Text>
                        </View>
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

      {/* 3. BOOKING SUCCESS CONFIRMATION MODAL */}
      <Modal
        visible={!!bookingSuccessData}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successCheckCircle}>
              <Ionicons name="checkmark-done" size={36} color="#FFFFFF" />
            </View>

            <Text style={styles.successTitle}>ভর্তি পরীক্ষার বাস টিকিট কনফার্ম!</Text>
            <Text style={styles.successSubtitle}>
              আপনার সিট সফলভাবে সংরক্ষিত হয়েছে। এসএমএসের মাধ্যমে ডিজিটাল পাস পাঠানো হয়েছে।
            </Text>

            {bookingSuccessData && (
              <View style={styles.ticketSummaryBox}>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>বিশ্ববিদ্যালয়:</Text>
                  <Text style={styles.ticketValue}>
                    {bookingSuccessData.route.university_name}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>পরীক্ষা ইউনিট:</Text>
                  <Text style={styles.ticketValue}>
                    {bookingSuccessData.route.unit_name}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>শিক্ষার্থীর নাম:</Text>
                  <Text style={styles.ticketValue}>
                    {bookingSuccessData.booking.student_name}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>এইচএসসি রোল:</Text>
                  <Text style={styles.ticketValue}>
                    {bookingSuccessData.booking.hsc_roll}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>বরাদ্দকৃত সিট:</Text>
                  <Text style={[styles.ticketValue, { color: VIOLET_PURPLE, fontWeight: "800" }]}>
                    {bookingSuccessData.booking.selected_seats.join(", ")}
                  </Text>
                </View>

                {bookingSuccessData.booking.guardian_name && (
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>অভিভাবক:</Text>
                    <Text style={styles.ticketValue}>
                      {bookingSuccessData.booking.guardian_name}
                    </Text>
                  </View>
                )}

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>ক্যাম্পাস ড্রপ:</Text>
                  <Text style={styles.ticketValue}>
                    {bookingSuccessData.route.campus_drop_point}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>নিশ্চিত রিপোর্টিং:</Text>
                  <Text style={[styles.ticketValue, { color: "#059669", fontWeight: "700" }]}>
                    {bookingSuccessData.route.campus_arrival_time}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>মোট পরিশোধিত:</Text>
                  <Text style={[styles.ticketValue, { fontWeight: "800", color: "#0F172A" }]}>
                    ৳{bookingSuccessData.booking.total_fare}
                  </Text>
                </View>

                {/* Coordinator Hotline */}
                <TouchableOpacity
                  style={styles.hotlineBtn}
                  onPress={() =>
                    openPhoneCall(bookingSuccessData.route.coordinator_phone)
                  }
                >
                  <Ionicons name="call" size={14} color="#4338CA" />
                  <Text style={styles.hotlineBtnText}>
                    বাস কো-অর্ডিনেটর সহায়তা: {bookingSuccessData.route.coordinator_phone}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.successCloseBtn} onPress={closeSuccessModal}>
              <Text style={styles.successCloseBtnText}>সম্পূর্ণ ও বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. EXAM DAY TRAVEL ADVISORIES MODAL */}
      <Modal
        visible={showAdvisoriesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdvisoriesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.advisoryModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={22} color={EMERALD_GREEN} />
                <Text style={styles.modalTitle}>ভর্তি পরীক্ষার জরুরি ভ্রমণ নির্দেশিকা</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAdvisoriesModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.advisoryLeadText}>
                ভর্তি পরীক্ষার দিন নিরাপদ ও মানসিক চাপমুক্তভাবে কেন্দ্রে পৌঁছানোর জন্য নিম্নোক্ত নিয়মাবলি কঠোরভাবে অনুসরণ করুন:
              </Text>

              {ADVISORY_LIST.map((item, idx) => {
                const isExpanded = expandedAdvisory === idx;
                return (
                  <TouchableOpacity
                    key={item.id || item.title || `advisory-${idx}`}
                    style={styles.advisoryItemCard}
                    onPress={() =>
                      setExpandedAdvisory(isExpanded ? null : idx)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.advisoryItemHeader}>
                      <View style={styles.advisoryIconCircle}>
                        <Ionicons name={item.icon as any} size={18} color="#4338CA" />
                      </View>
                      <View style={{ flex: 1, marginStart: 10 }}>
                        <Text style={styles.advisoryItemTitle}>{item.title}</Text>
                        <Text style={styles.advisoryItemShort}>{item.short}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#64748B"
                      />
                    </View>
                    {isExpanded && (
                      <View style={styles.advisoryItemBody}>
                        <Text style={styles.advisoryItemDetail}>{item.detail}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.emergencyHelplineCard}>
                <Ionicons name="headset" size={24} color="#059669" />
                <View style={{ flex: 1, marginStart: 10 }}>
                  <Text style={styles.emergencyHelplineTitle}>
                    কেন্দ্রীয় স্টুডেন্ট ট্রানজিট কন্ট্রোল রুম
                  </Text>
                  <Text style={styles.emergencyHelplineSub}>
                    জরুরি ট্রানজিট ও সহায়তায় ২৪/৭ যোগাযোগ করুন: ০৯৬১২-৮৮৯৯০০
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeAdvisoryModalBtn}
                onPress={() => setShowAdvisoriesModal(false)}
              >
                <Text style={styles.closeAdvisoryModalBtnText}>বুঝেছি</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Comprehensive Exam Day Travel Advisories
const ADVISORY_LIST = [
  {
    icon: "document-text-outline",
    title: "১. মূল এডমিট কার্ড ও ফটো আইডি ডকুমেন্টস",
    short: "প্রবেশপত্র ও এইচএসসি রেজিস্ট্রেশন কার্ড বাধ্যতামূলক",
    detail:
      "বিশ্ববিদ্যালয়ের মূল এডমিট কার্ড, এইচএসসি রেজিস্ট্রেশন কার্ডের মূল কপি এবং কমপক্ষে ২ কপি সত্যায়িত পাসপোর্ট সাইজ ছবি অবশ্যই সঙ্গে রাখতে হবে। এডমিট কার্ডের কোনো অংশ দাগানো বা ছেঁড়া থাকলে তাৎক্ষণিক বাতিল হতে পারে।",
  },
  {
    icon: "time-outline",
    title: "২. পরীক্ষার ২ ঘণ্টা পূর্বে রিপোর্টিং ও ক্যাম্পাসে আগমন",
    short: "যানজট এড়াতে পর্যাপ্ত বাফার টাইম নিয়ে সরাসরি কেন্দ্রে ড্রপ",
    detail:
      "ক্যাম্পাসে প্রবেশ, চেকিং এবং সিট নম্বর খোঁজার জন্য প্রতিটি স্পেশাল বাস পরীক্ষা শুরুর ঠিক ২ ঘণ্টা পূর্বে সংশ্লিষ্ট অনুষদ ভবনের প্রধান ফটকে পৌঁছাবে। নিজ নিজ জেলার বোর্ডিং পয়েন্টে বাসের নির্ধারিত সময়ের কমপক্ষে ২০ মিনিট পূর্বে উপস্থিত হন।",
  },
  {
    icon: "phone-portrait-outline",
    title: "৩. ডিজিটাল ডিভাইস ও ঘড়ি সংক্রান্ত কঠোর নিষেধাজ্ঞা",
    short: "স্মার্টওয়াচ, ব্লুটুথ ও ক্যালকুলেটর হলে সম্পূর্ণ নিষিদ্ধ",
    detail:
      "অনুমোদিত সাধারণ অ্যানালগ ঘড়ি ব্যতীত যেকোনো ধরনের ডিজিটাল ঘড়ি, স্মার্টব্যান্ড, মোবাইল ফোন ও ক্যালকুলেটর (যেসব ইউনিটে নিষিদ্ধ) পরীক্ষার হলে নেওয়া সম্পূর্ণ নিষেধ। এগুলো বাস কো-অর্ডিনেটরের নিকট অথবা অভিভাবকের কাছে নিরাপদে রাখার ব্যবস্থা থাকবে।",
  },
  {
    icon: "shield-checkmark-outline",
    title: "৪. ছাত্রী পরীক্ষার্থীদের নিরাপত্তা ও সংরক্ষিত সেবা",
    short: "সামনের সারির আসন সংরক্ষণ ও নারী ভলান্টিয়ার সহায়তা",
    detail:
      "ছাত্রী পরীক্ষার্থীদের জন্য বাসের সম্মুখ সারির আসনসমূহ নিবেদিত। ক্যাম্পাস গেট ও হল চত্বরে সার্বক্ষণিক নারী ভলান্টিয়ার টিম সহায়তা প্রদান করবে। যেকোনো জরুরি প্রয়োজনে বাসের সাথে সার্বক্ষণিক যোগাযোগ বুথ চালু থাকবে।",
  },
  {
    icon: "people-outline",
    title: "৫. অভিভাবকের সহযাত্রী সিট ও জরুরি সমন্বয়",
    short: "ছাত্র-ছাত্রীর মানসিক সাপোর্টে অভিভাবকের জন্য সংলগ্ন সিট",
    detail:
      "পরীক্ষার্থীদের মানসিক স্বস্তি ও দূরপাল্লার যাত্রায় নিরাপত্তার স্বার্থে অভিভাবকগণ একই বাসে সংলগ্ন সিটে ভ্রমণ করতে পারবেন। প্রতিটি বাসে সার্বক্ষণিক ফার্স্ট-এইড কিট এবং সুপেয় পানির ব্যবস্থা থাকবে।",
  },
  {
    icon: "repeat-outline",
    title: "৬. পরীক্ষা সমাপ্তির পর সমন্বিত ফিরতি যাত্রা",
    short: "পরীক্ষা শেষের ১ ঘণ্টার মধ্যে নির্ধারিত স্থান থেকে ফিরতি বাস",
    detail:
      "পরীক্ষা শেষ হওয়ার পর ট্রাফিক জ্যাম ও ভিড় এড়াতে পূর্বনির্ধারিত ক্যাম্পাস পয়েন্ট থেকেই জেলা ভিত্তিক বাস ফিরতি যাত্রা শুরু করবে। কোনো শিক্ষার্থী যেন পথ না হারায় সেজন্য কো-অর্ডিনেটর টিম সার্বক্ষণিক মাইকিং ও ফোনে সহায়তা করবেন।",
  },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  examTag: {
    backgroundColor: "#FBBF24",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  examTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: "#C7D2FE",
    marginTop: 2,
  },
  advisoryHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  advisoryHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  trackerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    marginBottom: 6,
  },
  trackerSectionLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#E0E7FF",
  },
  uniScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  uniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  uniPillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  uniPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E0E7FF",
  },
  uniPillTextActive: {
    color: VIOLET_PURPLE,
    fontWeight: "800",
  },
  uniPillSubText: {
    fontSize: 9.5,
    color: "#C7D2FE",
    marginTop: 1,
  },
  uniPillSubTextActive: {
    color: "#6D28D9",
    fontWeight: "600",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  activeExamCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 6px rgba(15, 23, 42, 0.1)" } : {}),
  },
  activeExamGradient: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
  },
  examBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeExamUniName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  activeExamSchedule: {
    fontSize: 12,
    color: "#FDE68A",
    marginTop: 3,
    fontWeight: "600",
  },
  activeExamCenter: {
    fontSize: 11.5,
    color: "#E0E7FF",
    marginTop: 2,
  },
  guaranteedArrivalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  guaranteedArrivalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  districtFilterBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  districtFilterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  districtFilterTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  districtCountText: {
    fontSize: 11,
    color: "#64748B",
  },
  districtScroll: {
    gap: 6,
  },
  districtPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  districtPillActive: {
    backgroundColor: "#4338CA",
    borderColor: "#4338CA",
  },
  districtPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  districtPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  featureCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.1)" } : {}),
  },
  featureGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  studentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  studentBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FBBF24",
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 19,
  },
  featureDesc: {
    fontSize: 11,
    color: "#D1FAE5",
    marginTop: 5,
    lineHeight: 16,
  },
  featureIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  advisoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  advisoryBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  advisoryBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  advisoryBannerSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  subsidyBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  subsidyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13.5,
    color: "#64748B",
    marginTop: 8,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  resetFilterBtn: {
    marginTop: 12,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.05)" } : {}),
  },
  routeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  uniBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  uniBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: VIOLET_PURPLE,
  },
  uniFullName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  unitNameText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  busTypePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  busTypePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  guaranteeTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  guaranteeTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  journeyTimeline: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineConnector: {
    width: 2,
    height: 16,
    backgroundColor: "#CBD5E1",
    marginStart: 7,
    marginVertical: 2,
  },
  pointLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  pointName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  timeText: {
    fontSize: 11.5,
    color: "#4338CA",
    fontWeight: "600",
    marginTop: 2,
  },
  arrivalTimeText: {
    fontSize: 11.5,
    color: "#059669",
    fontWeight: "700",
    marginTop: 2,
  },
  safetyBadgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  safetyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  safetyPillText: {
    fontSize: 10.5,
    color: "#059669",
    fontWeight: "600",
  },
  guardianOptionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guardianOptionPillText: {
    fontSize: 10.5,
    color: "#B45309",
    fontWeight: "600",
  },
  returnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  returnPillText: {
    fontSize: 10.5,
    color: "#4338CA",
    fontWeight: "600",
  },
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  operatorText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  coordinatorCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginEnd: 6,
  },
  coordinatorCallText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#4338CA",
  },
  seatsLeftText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "700",
  },
  routeCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  fareLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  miniDiscountTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniDiscountTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#166534",
  },
  studentFare: {
    fontSize: 19,
    fontWeight: "800",
    color: VIOLET_PURPLE,
  },
  regularFare: {
    fontSize: 13,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  bookSeatsBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  bookSeatsGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bookSeatsBtnText: {
    fontSize: 13,
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubHeader: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
  },
  modalGuaranteeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalGuaranteeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  guardianToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  guardianToggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  guardianToggleSubtitle: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
  },
  customCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D97706",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  customCheckboxActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  busLayoutBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 10,
  },
  driverSeat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  driverText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  doorArea: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  doorText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  seatPair: {
    flexDirection: "row",
    gap: 8,
  },
  seat: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  seatFemale: {
    backgroundColor: "#F5F3FF",
    borderColor: "#C4B5FD",
  },
  seatSelected: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  seatGuardianSelected: {
    backgroundColor: AMBER_GOLD,
    borderColor: AMBER_GOLD,
  },
  seatText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  seatTextSelected: {
    color: "#FFFFFF",
  },
  aisle: {
    width: 24,
  },
  seatLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendBox: {
    width: 13,
    height: 13,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  verificationCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 12,
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  verificationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#312E81",
  },
  inputWithIcon: {
    position: "relative",
    justifyContent: "center",
  },
  textInputWithIcon: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingEnd: 38,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0F172A",
  },
  verifiedCheck: {
    position: "absolute",
    right: 10,
  },
  subsidyAppliedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
  },
  subsidyAppliedText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "700",
    flex: 1,
  },
  subsidyPromptText: {
    fontSize: 11,
    color: "#4338CA",
    marginTop: 6,
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 5,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: "#0F172A",
  },
  guardianFormCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 12,
    marginBottom: 8,
  },
  guardianFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  guardianFormTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  relationPillRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  relationPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  relationPillActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  relationPillText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  relationPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  fareSummaryCard: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  fareSummaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: VIOLET_PURPLE,
    marginBottom: 8,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fareRowLabel: {
    fontSize: 12.5,
    color: "#475569",
  },
  fareRowValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  strikethroughFare: {
    fontSize: 11,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  savingsBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  savingsBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  fareDivider: {
    height: 1,
    backgroundColor: "#C4B5FD",
    marginVertical: 6,
  },
  totalFareLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: VIOLET_PURPLE,
  },
  totalFareValue: {
    fontSize: 17,
    fontWeight: "800",
    color: VIOLET_PURPLE,
  },
  quickAdvisoryNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EEF2FF",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  quickAdvisoryText: {
    fontSize: 11,
    color: "#3730A3",
    flex: 1,
    lineHeight: 16,
  },
  confirmTicketBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 14,
  },
  confirmGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTicketBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 18,
    alignItems: "center",
  },
  successCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
  ticketSummaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  ticketLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  ticketValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
    maxWidth: "60%",
    textAlign: "right",
  },
  hotlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  hotlineBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4338CA",
  },
  successCloseBtn: {
    width: "100%",
    backgroundColor: VIOLET_PURPLE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  successCloseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  advisoryModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    padding: 18,
  },
  advisoryLeadText: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 12,
  },
  advisoryItemCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  advisoryItemHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  advisoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  advisoryItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  advisoryItemShort: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  advisoryItemBody: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  advisoryItemDetail: {
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 17,
  },
  emergencyHelplineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  emergencyHelplineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
  },
  emergencyHelplineSub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  closeAdvisoryModalBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeAdvisoryModalBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
