export type TransportType = "bus" | "launch";

export interface BusTrip {
  id: string;
  operator_name: string;
  bus_type: "AC Scania Sleeper" | "AC Business Class" | "Non-AC Deluxe" | "Hyundai Universe";
  from_city: string;
  to_city: string;
  boarding_point: string;
  dropping_point: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  fare: number;
  total_seats: number;
  available_seats: number;
  amenities: string[];
}

export type LaunchCabinType = "Single AC" | "Double AC" | "VIP Suite" | "Family Cabin" | "Deck";

export interface LaunchCabin {
  id: string;
  type: LaunchCabinType;
  fare: number; // in BDT
  available_count: number;
  capacity_persons: number;
  amenities: string[];
}

export interface LaunchTrip {
  id: string;
  vessel_name: string; // e.g. "MV Manami", "MV Sundarban 12"
  terminal_from: string; // "Dhaka Sadarghat"
  terminal_to: string; // "Barishal Launch Ghat"
  departure_time: string; // e.g. "08:30 PM"
  arrival_time: string; // e.g. "05:00 AM (Dawn)"
  duration: string;
  cabins: LaunchCabin[];
  amenities: string[];
  banner_url?: string;
}

export interface TransportBooking {
  id: string;
  transport_type: TransportType;
  trip_id: string;
  operator_or_vessel: string;
  from: string;
  to: string;
  departure_date: string;
  departure_time: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_nid?: string;
  booked_items: string[]; // e.g. ["A1", "A2"] or ["Single AC Cabin #204"]
  total_fare: number;
  status: "confirmed" | "completed" | "cancelled";
  created_at: string;
}
