export interface AdmissionExam {
  id: string;
  university_name: string;
  short_code: "DU" | "RU" | "CU" | "JU" | "GST" | "BUET" | "MEDICAL";
  campus_location: string;
  unit_name: string; // e.g. "Ka Unit (Science)", "Kha Unit (Humanities)", "Ga Unit (Business)"
  exam_date: string;
  exam_time: string;
  logo_url: string;
}

export interface AdmissionBusRoute {
  id: string;
  exam_id: string;
  university_name: string;
  short_code: string;
  unit_name: string;
  departure_district: string;
  boarding_point: string;
  campus_drop_point: string;
  departure_time: string; // e.g. "11:30 PM (Night before exam)"
  campus_arrival_time: string; // e.g. "07:30 AM (Exam day morning)"
  return_departure_time: string; // e.g. "04:30 PM (After exam)"
  bus_operator: string;
  bus_type: "AC Hino" | "Non-AC Deluxe" | "Hyundai Luxury AC";
  total_seats: number;
  available_seats: number;
  regular_fare: number;
  student_fare: number; // Discounted fare
  includes_guardian_seat: boolean;
  female_section_available: boolean;
  coordinator_phone: string;
}

export interface AdmissionTicketBooking {
  id: string;
  route_id: string;
  university_name: string;
  unit_name: string;
  student_name: string;
  student_phone: string;
  hsc_roll: string;
  guardian_name?: string;
  selected_seats: string[];
  total_fare: number;
  pickup_point: string;
  drop_point: string;
  status: "confirmed" | "completed" | "cancelled";
  created_at: string;
}
