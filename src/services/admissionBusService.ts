import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdmissionExam, AdmissionBusRoute, AdmissionTicketBooking } from "../types/admissionBus";
import { supabase } from "../utils/supabase";

const ADMISSION_BOOKINGS_KEY = "@admission_bus_bookings_v1";

export const ADMISSION_EXAMS: AdmissionExam[] = [
  {
    id: "exam-du-ka",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    campus_location: "Curzon Hall & Arts Faculty, Dhaka",
    unit_name: "Ka Unit (বিজ্ঞান অনুষদ)",
    exam_date: "2026-11-28",
    exam_time: "11:00 AM - 12:30 PM",
    logo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200",
  },
  {
    id: "exam-du-kha",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    campus_location: "Arts Faculty & TSC, Dhaka",
    unit_name: "Kha Unit (কলা ও সামাজিক বিজ্ঞান)",
    exam_date: "2026-12-05",
    exam_time: "11:00 AM - 12:30 PM",
    logo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200",
  },
  {
    id: "exam-ru-a",
    university_name: "Rajshahi University (RU)",
    short_code: "RU",
    campus_location: "Paris Road & Shahid Minar, Rajshahi",
    unit_name: "A Unit (মানবিক ও আইন অনুষদ)",
    exam_date: "2026-12-12",
    exam_time: "10:00 AM - 11:30 AM",
    logo_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=200",
  },
  {
    id: "exam-cu-a",
    university_name: "Chittagong University (CU)",
    short_code: "CU",
    campus_location: "1 No. Gate & Central Field, Chittagong",
    unit_name: "A Unit (বিজ্ঞান অনুষদ)",
    exam_date: "2026-12-18",
    exam_time: "11:00 AM - 12:00 PM",
    logo_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200",
  },
  {
    id: "exam-gst",
    university_name: "GST Cluster (গুচ্ছভুক্ত ২৪ বিশ্ববিদ্যালয়)",
    short_code: "GST",
    campus_location: "Various Divisional Center Campuses",
    unit_name: "A Unit (General Science)",
    exam_date: "2026-12-22",
    exam_time: "12:00 PM - 01:00 PM",
    logo_url: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=200",
  },
];

export const INITIAL_ADMISSION_ROUTES: AdmissionBusRoute[] = [
  {
    id: "route-du-bogura-1",
    exam_id: "exam-du-ka",
    university_name: "Dhaka University (DU)",
    short_code: "DU",
    unit_name: "Ka Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Bogura",
    boarding_point: "Thonthonia Bus Stand, Bogura",
    campus_drop_point: "Curzon Hall Main Gate, DU Campus",
    departure_time: "11:00 PM (Night before exam)",
    campus_arrival_time: "06:30 AM (Exam day morning)",
    return_departure_time: "04:00 PM (Post-exam from TSC)",
    bus_operator: "Shyamoli NR Travels (Special Exam Fleet)",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 12,
    regular_fare: 950,
    student_fare: 750,
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
    boarding_point: "Modern Mor, Rangpur",
    campus_drop_point: "Shahbagh / TSC Circle, DU Campus",
    departure_time: "09:30 PM (Night before exam)",
    campus_arrival_time: "06:00 AM (Exam day morning)",
    return_departure_time: "04:30 PM (Post-exam from Curzon)",
    bus_operator: "Ena Transport (Student Express)",
    bus_type: "Hyundai Luxury AC",
    total_seats: 36,
    available_seats: 8,
    regular_fare: 1100,
    student_fare: 850,
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801719223344",
  },
  {
    id: "route-ru-bogura-1",
    exam_id: "exam-ru-a",
    university_name: "Rajshahi University (RU)",
    short_code: "RU",
    unit_name: "A Unit (মানবিক অনুষদ)",
    departure_district: "Bogura",
    boarding_point: "Charmatha Central Bus Terminal, Bogura",
    campus_drop_point: "RU Main Gate, Paris Road, Rajshahi",
    departure_time: "06:00 AM (Exam day morning)",
    campus_arrival_time: "08:15 AM (Safe arrival 1.5h before exam)",
    return_departure_time: "03:30 PM (Post-exam from Kazla Gate)",
    bus_operator: "Shyama Express Special",
    bus_type: "Non-AC Deluxe",
    total_seats: 45,
    available_seats: 19,
    regular_fare: 400,
    student_fare: 300,
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801811445566",
  },
  {
    id: "route-cu-cumilla-1",
    exam_id: "exam-cu-a",
    university_name: "Chittagong University (CU)",
    short_code: "CU",
    unit_name: "A Unit (বিজ্ঞান অনুষদ)",
    departure_district: "Cumilla",
    boarding_point: "Shashongachha, Cumilla",
    campus_drop_point: "CU 1 No. Gate & Shuttle Station",
    departure_time: "05:30 AM (Exam day morning)",
    campus_arrival_time: "08:45 AM (Exam day morning)",
    return_departure_time: "03:00 PM (Post-exam from Campus Gate)",
    bus_operator: "Tisha Special Campus Express",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 15,
    regular_fare: 650,
    student_fare: 500,
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801911778899",
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
    campus_arrival_time: "08:00 AM (Exam day morning)",
    return_departure_time: "03:30 PM (Post-exam)",
    bus_operator: "Ena Student Fleet",
    bus_type: "AC Hino",
    total_seats: 40,
    available_seats: 16,
    regular_fare: 550,
    student_fare: 400,
    includes_guardian_seat: true,
    female_section_available: true,
    coordinator_phone: "+8801722889900",
  },
];

export const admissionBusService = {
  /**
   * Get admission exams
   */
  getAdmissionExams(): AdmissionExam[] {
    return ADMISSION_EXAMS;
  },

  /**
   * Get admission routes with optional university and district filters
   */
  async getAdmissionRoutes(universityCode?: string, district?: string): Promise<AdmissionBusRoute[]> {
    let routes = INITIAL_ADMISSION_ROUTES;

    if (universityCode && universityCode !== "ALL") {
      routes = routes.filter((r) => r.short_code === universityCode);
    }

    if (district && district !== "All Districts") {
      routes = routes.filter(
        (r) => r.departure_district.toLowerCase() === district.toLowerCase()
      );
    }

    return routes;
  },

  /**
   * Book admission bus tickets
   */
  async bookAdmissionTicket(
    booking: Omit<AdmissionTicketBooking, "id" | "status" | "created_at">
  ): Promise<AdmissionTicketBooking> {
    const newBooking: AdmissionTicketBooking = {
      ...booking,
      id: `adm-ticket-${Date.now()}`,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("bookings").insert([
        {
          booking_type: "admission_bus",
          total_price: booking.total_fare,
          status: "confirmed",
          metadata: newBooking,
        },
      ]);
    } catch {}

    const raw = await AsyncStorage.getItem(ADMISSION_BOOKINGS_KEY);
    const existing: AdmissionTicketBooking[] = raw ? JSON.parse(raw) : [];
    const updated = [newBooking, ...existing];
    await AsyncStorage.setItem(ADMISSION_BOOKINGS_KEY, JSON.stringify(updated));

    return newBooking;
  },

  /**
   * Get user's admission tickets
   */
  async getMyAdmissionTickets(): Promise<AdmissionTicketBooking[]> {
    try {
      const raw = await AsyncStorage.getItem(ADMISSION_BOOKINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
