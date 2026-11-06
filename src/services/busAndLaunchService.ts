import AsyncStorage from "@react-native-async-storage/async-storage";
import { BusTrip, LaunchTrip, TransportBooking } from "../types/busAndLaunch";
import { supabase } from "../utils/supabase";

const TRANSPORT_BOOKINGS_KEY = "@transport_tickets_v1";

export const INITIAL_BUS_TRIPS: BusTrip[] = [
  {
    id: "bus-gl-1",
    operator_name: "Green Line Paribahan",
    bus_type: "AC Scania Sleeper",
    from_city: "Dhaka",
    to_city: "Cox's Bazar",
    boarding_point: "Rajarbagh / Arambagh, Dhaka",
    dropping_point: "Kolatoli Beach Point, Cox's Bazar",
    departure_time: "10:30 PM",
    arrival_time: "07:00 AM (Next day)",
    duration: "8h 30m",
    fare: 2200,
    total_seats: 30,
    available_seats: 8,
    amenities: ["Flat Sleeper Bed", "Blanket & Pillow", "Snack Pack", "Charging Port", "WiFi"],
  },
  {
    id: "bus-hanif-1",
    operator_name: "Hanif Enterprise",
    bus_type: "AC Business Class",
    from_city: "Dhaka",
    to_city: "Chittagong",
    boarding_point: "Sayedabad Bus Terminal, Dhaka",
    dropping_point: "Dampara, Chittagong",
    departure_time: "08:00 AM",
    arrival_time: "01:30 PM",
    duration: "5h 30m",
    fare: 1100,
    total_seats: 36,
    available_seats: 14,
    amenities: ["Reclining Leather Seats", "Mineral Water", "AC", "USB Port"],
  },
  {
    id: "bus-shyamoli-1",
    operator_name: "Shyamoli NR Travels",
    bus_type: "Hyundai Universe",
    from_city: "Dhaka",
    to_city: "Sylhet",
    boarding_point: "Mohakhali Terminal, Dhaka",
    dropping_point: "Kadamtali, Sylhet",
    departure_time: "11:00 PM",
    arrival_time: "05:30 AM",
    duration: "6h 30m",
    fare: 950,
    total_seats: 38,
    available_seats: 12,
    amenities: ["AC", "Audio/Video Entertainment", "Free Water", "Luggage Safety"],
  },
  {
    id: "bus-saintmartin-1",
    operator_name: "Saintmartin Paribahan",
    bus_type: "AC Scania Sleeper",
    from_city: "Dhaka",
    to_city: "Cox's Bazar",
    boarding_point: "Kallayanpur, Dhaka",
    dropping_point: "Sugandha Beach Point, Cox's Bazar",
    departure_time: "11:15 PM",
    arrival_time: "07:45 AM",
    duration: "8h 30m",
    fare: 2000,
    total_seats: 32,
    available_seats: 11,
    amenities: ["Sleeper Bunk", "Water & Juice", "AC", "Fast Express"],
  },
  {
    id: "bus-ena-1",
    operator_name: "Ena Transport",
    bus_type: "Non-AC Deluxe",
    from_city: "Dhaka",
    to_city: "Bogura",
    boarding_point: "Mohakhali Bus Terminal, Dhaka",
    dropping_point: "Charmatha Central Bus Stand, Bogura",
    departure_time: "09:00 AM",
    arrival_time: "02:00 PM",
    duration: "5h 00m",
    fare: 550,
    total_seats: 45,
    available_seats: 19,
    amenities: ["Clean High Seats", "Direct Nonstop via Jamuna Bridge"],
  },
];

export const INITIAL_LAUNCH_TRIPS: LaunchTrip[] = [
  {
    id: "launch-manami-1",
    vessel_name: "MV Manami (ভিআইপি বিলাসবহুল লঞ্চ)",
    terminal_from: "Dhaka Sadarghat",
    terminal_to: "Barishal Launch Ghat",
    departure_time: "08:30 PM",
    arrival_time: "05:00 AM (ভোর)",
    duration: "8h 30m (নৈসর্গিক নৌপথ)",
    banner_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800",
    amenities: ["River View Balcony", "Central AC", "Restaurant & Cafe", "Free Wi-Fi", "Mosque", "24/7 Security"],
    cabins: [
      {
        id: "cab-single-ac",
        type: "Single AC",
        fare: 1400,
        available_count: 15,
        capacity_persons: 1,
        amenities: ["1 Single Bed", "AC", "LED TV", "Complimentary Water"],
      },
      {
        id: "cab-double-ac",
        type: "Double AC",
        fare: 2500,
        available_count: 10,
        capacity_persons: 2,
        amenities: ["1 Queen Bed", "River Balcony", "Attached Bath", "AC", "Breakfast"],
      },
      {
        id: "cab-vip-suite",
        type: "VIP Suite",
        fare: 7500,
        available_count: 3,
        capacity_persons: 4,
        amenities: ["Luxury Living Room", "King Bed", "Smart TV", "Mini Fridge", "Bathtub", "VIP Deck"],
      },
      {
        id: "cab-deck",
        type: "Deck",
        fare: 350,
        available_count: 85,
        capacity_persons: 1,
        amenities: ["Spacious Open Deck", "Fan Cooling", "Clean Washroom Access"],
      },
    ],
  },
  {
    id: "launch-sundarban-1",
    vessel_name: "MV Sundarban 12",
    terminal_from: "Dhaka Sadarghat",
    terminal_to: "Bhola (Elisha Ghat)",
    departure_time: "09:00 PM",
    arrival_time: "04:30 AM",
    duration: "7h 30m",
    banner_url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800",
    amenities: ["AC Cabins", "Traditional Dining", "Family Friendly", "Life Safety Equipment"],
    cabins: [
      {
        id: "cab-sb-single",
        type: "Single AC",
        fare: 1200,
        available_count: 12,
        capacity_persons: 1,
        amenities: ["1 Bed", "AC", "Attached Bath"],
      },
      {
        id: "cab-sb-double",
        type: "Double AC",
        fare: 2200,
        available_count: 8,
        capacity_persons: 2,
        amenities: ["2 Person Bed", "River Window", "AC"],
      },
      {
        id: "cab-sb-deck",
        type: "Deck",
        fare: 300,
        available_count: 110,
        capacity_persons: 1,
        amenities: ["Open River Breeze Deck"],
      },
    ],
  },
  {
    id: "launch-parabat-1",
    vessel_name: "MV Parabat 12",
    terminal_from: "Dhaka Sadarghat",
    terminal_to: "Barishal Launch Ghat",
    departure_time: "09:15 PM",
    arrival_time: "05:15 AM",
    duration: "8h 00m",
    banner_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    amenities: ["Modern Cabins", "Generator Backup", "Restaurant"],
    cabins: [
      {
        id: "cab-pb-single",
        type: "Single AC",
        fare: 1300,
        available_count: 18,
        capacity_persons: 1,
        amenities: ["Single AC Bed", "TV"],
      },
      {
        id: "cab-pb-double",
        type: "Double AC",
        fare: 2400,
        available_count: 12,
        capacity_persons: 2,
        amenities: ["Double AC Bed", "Balcony View"],
      },
      {
        id: "cab-pb-deck",
        type: "Deck",
        fare: 350,
        available_count: 90,
        capacity_persons: 1,
        amenities: ["General Deck Ticket"],
      },
    ],
  },
];

export const busAndLaunchService = {
  /**
   * Get bus trips
   */
  async getBusTrips(fromCity?: string, toCity?: string): Promise<BusTrip[]> {
    let trips = INITIAL_BUS_TRIPS;

    if (toCity && toCity !== "All") {
      trips = trips.filter((t) =>
        t.to_city.toLowerCase().includes(toCity.toLowerCase())
      );
    }

    return trips;
  },

  /**
   * Get launch trips
   */
  async getLaunchTrips(toTerminal?: string): Promise<LaunchTrip[]> {
    let trips = INITIAL_LAUNCH_TRIPS;

    if (toTerminal && toTerminal !== "All") {
      trips = trips.filter((t) =>
        t.terminal_to.toLowerCase().includes(toTerminal.toLowerCase())
      );
    }

    return trips;
  },

  /**
   * Book a bus or launch ticket
   */
  async bookTransportTicket(
    booking: Omit<TransportBooking, "id" | "status" | "created_at">
  ): Promise<TransportBooking> {
    const newBooking: TransportBooking = {
      ...booking,
      id: `ticket-${booking.transport_type}-${Date.now()}`,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("bookings").insert([
        {
          booking_type: booking.transport_type,
          total_price: booking.total_fare,
          status: "confirmed",
          metadata: newBooking,
        },
      ]);
    } catch {}

    const raw = await AsyncStorage.getItem(TRANSPORT_BOOKINGS_KEY);
    const existing: TransportBooking[] = raw ? JSON.parse(raw) : [];
    const updated = [newBooking, ...existing];
    await AsyncStorage.setItem(TRANSPORT_BOOKINGS_KEY, JSON.stringify(updated));

    return newBooking;
  },

  /**
   * Get all user tickets
   */
  async getMyTickets(): Promise<TransportBooking[]> {
    try {
      const raw = await AsyncStorage.getItem(TRANSPORT_BOOKINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
