/**
 * Verified Local Guide & Boatman Marketplace Service - Shopno Jatra
 * Provides discovery, atomic bookings, live GPS tracking, OTP check-in, and SOS dispatch.
 */

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";
import {
  ProviderProfile,
  ProviderService,
  MarketplaceBooking,
  TripSession,
  TripLocationBreadcrumb,
  TripEmergencyEvent,
  MarketplaceReview,
  MarketplaceDestination,
  ProviderCategory,
  TidalIntelligence,
  TidalStation,
} from "../types/marketplace";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const OFFLINE_MARKETPLACE_STORAGE = "@mkt_providers_cache_v1";
const OFFLINE_TRIP_SESSION_STORAGE = "@mkt_trip_session_v1";

// Curated verified initial providers for fallback / offline readiness
export const CURATED_PROVIDERS: ProviderProfile[] = [
  {
    id: "p-cox-1",
    user_id: "u-cox-1",
    provider_category: "tour_guide",
    business_name: "Cox's Beach Explorers",
    full_name: "Mahmud Hasan Niloy",
    phone: "+8801711223344",
    bio: "Certified Tourist Police registered guide with 8 years experience across Inani, Himchari and Saint Martin Island.",
    bio_bn: "কক্সবাজার সমুদ্র সৈকত ও ইনানী প্রবাল দ্বীপের ৮ বছরের অভিজ্ঞতাসম্পন্ন সার্টিফাইড গাইড।",
    experience_years: 8,
    daily_rate: 1800,
    hourly_rate: 300,
    currency: "BDT",
    primary_destination: "Cox's Bazar",
    covered_destinations: ["Cox's Bazar", "Inani Beach", "Saint Martin"],
    languages: ["Bangla", "English", "Chatgaya"],
    specialties: ["Coral Walking", "Coastal Safety", "Sunset Photography"],
    badge: "Top Rated",
    verification_status: "approved",
    nid_verified: true,
    license_verified: true,
    boat_permit_verified: false,
    police_clearance_verified: true,
    is_available: true,
    rating: 4.95,
    reviews_count: 142,
    total_trips: 260,
  },
  {
    id: "p-sun-2",
    user_id: "u-sun-2",
    provider_category: "boatman",
    business_name: "Sundarbans Green Trawler Association",
    full_name: "Golam Rasul (Bawali Master)",
    phone: "+8801733445566",
    bio: "3rd generation licensed boatman and wildlife tracker for Kotka, Kochikhali and Karamjal channels.",
    bio_bn: "সুন্দরবনের নদী ও ক্যানাল নৌরুট বিশেষজ্ঞ এবং বনবিভাগ অনুমোদিত মাস্টার বোটম্যান।",
    experience_years: 14,
    daily_rate: 2600,
    hourly_rate: 400,
    currency: "BDT",
    primary_destination: "Sundarbans",
    covered_destinations: ["Sundarbans", "Mongla", "Kotka", "Karamjal"],
    languages: ["Bangla", "English", "Khulna Local"],
    specialties: ["Tidal Navigation", "Tiger Tracking", "Mangrove Birdwatching"],
    badge: "Master Boatman",
    verification_status: "approved",
    nid_verified: true,
    license_verified: true,
    boat_permit_verified: true,
    police_clearance_verified: true,
    is_available: true,
    rating: 4.98,
    reviews_count: 215,
    total_trips: 420,
  },
  {
    id: "p-saj-3",
    user_id: "u-saj-3",
    provider_category: "trekking_guide",
    business_name: "Sajek Cloud Trails",
    full_name: "Pritom Chakma",
    phone: "+8801819556677",
    bio: "Indigenous mountain guide for Konglak Para hiking, Ruilui cloud views, and Alutila Cave expeditions.",
    bio_bn: "সাজেক ভ্যালির আদিবাসী ট্র্যাকিং গাইড। কংলাক পাহাড় ও পাহাড়ি সংস্কৃতির সাথে পরিচয় করিয়ে দিই।",
    experience_years: 9,
    daily_rate: 2200,
    hourly_rate: 350,
    currency: "BDT",
    primary_destination: "Sajek",
    covered_destinations: ["Sajek", "Konglak Para", "Ruilui Para", "Khagrachari"],
    languages: ["Bangla", "English", "Chakma"],
    specialties: ["Mountain Trekking", "Stargazing", "Tribal Culture"],
    badge: "Local Expert",
    verification_status: "approved",
    nid_verified: true,
    license_verified: true,
    boat_permit_verified: false,
    police_clearance_verified: true,
    is_available: true,
    rating: 4.92,
    reviews_count: 198,
    total_trips: 310,
  },
  {
    id: "p-syl-4",
    user_id: "u-syl-4",
    provider_category: "nature_guide",
    business_name: "Sylhet Eco Guide Co.",
    full_name: "Tanvir Ahmed Khondokar",
    phone: "+8801912345678",
    bio: "Naturalist guiding Ratargul Swamp Forest boat rides, Jaflong stone beds, and Sreemangal tea trails.",
    bio_bn: "রাতারগুল সোয়াম্প ফরেস্ট, জাফলং ও শ্রীমঙ্গলের চা বাগান ইকো ট্যুরিস্ট গাইড।",
    experience_years: 6,
    daily_rate: 1800,
    hourly_rate: 280,
    currency: "BDT",
    primary_destination: "Sylhet",
    covered_destinations: ["Sylhet", "Ratargul", "Jaflong", "Sreemangal"],
    languages: ["Bangla", "English", "Sylheti"],
    specialties: ["Swamp Boating", "Tea Estate Hikes", "Waterfall Trails"],
    badge: "Verified Guide",
    verification_status: "approved",
    nid_verified: true,
    license_verified: true,
    boat_permit_verified: true,
    police_clearance_verified: true,
    is_available: true,
    rating: 4.88,
    reviews_count: 110,
    total_trips: 180,
  },
  {
    id: "p-ban-5",
    user_id: "u-ban-5",
    provider_category: "adventure_operator",
    business_name: "Bandarban Summit Squad",
    full_name: "Lalram Sang Bawm",
    phone: "+8801822334455",
    bio: "High altitude trekking specialist for Keokradong, Saka Haphong, and Boga Lake camping.",
    bio_bn: "কেওক্রাডং ও বগালেক হাই-অল্টিটিউড ট্র্যাকিং বিশেষজ্ঞ গাইড।",
    experience_years: 11,
    daily_rate: 2500,
    hourly_rate: 400,
    currency: "BDT",
    primary_destination: "Bandarban",
    covered_destinations: ["Bandarban", "Keokradong", "Boga Lake", "Thanchi"],
    languages: ["Bangla", "English", "Bawm"],
    specialties: ["Peak Climbing", "Jungle Survival", "Camp Setup"],
    badge: "Local Expert",
    verification_status: "approved",
    nid_verified: true,
    license_verified: true,
    boat_permit_verified: false,
    police_clearance_verified: true,
    is_available: true,
    rating: 4.96,
    reviews_count: 175,
    total_trips: 290,
  },
];

class MarketplaceService {
  /**
   * Fetch approved providers with filters (Destination, Category, Keyword)
   */
  async getProviders(filters?: {
    destination?: MarketplaceDestination | "All";
    category?: ProviderCategory | "All";
    search?: string;
  }): Promise<ProviderProfile[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.destination && filters.destination !== "All") {
        params.append("destination", filters.destination);
      }
      if (filters?.category && filters.category !== "All") {
        params.append("category", filters.category);
      }
      if (filters?.search) {
        params.append("search", filters.search);
      }

      const res = await axios.get(`${API_BASE_URL}/marketplace/providers?${params.toString()}`, {
        timeout: 4000,
      });

      if (res.data?.items && res.data.items.length > 0) {
        await AsyncStorage.setItem(OFFLINE_MARKETPLACE_STORAGE, JSON.stringify(res.data.items));
        return res.data.items;
      }
    } catch (e) {
      // Backend unavailable; fallback to local cache or curated list
    }

    // Offline / fallback filtering
    let list = [...CURATED_PROVIDERS];
    if (filters?.destination && filters.destination !== "All") {
      list = list.filter(
        (p) =>
          p.primary_destination === filters.destination ||
          p.covered_destinations.includes(filters.destination!)
      );
    }
    if (filters?.category && filters.category !== "All") {
      list = list.filter((p) => p.provider_category === filters.category);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          (p.business_name && p.business_name.toLowerCase().includes(q))
      );
    }
    return list;
  }

  /**
   * Get single provider by ID
   */
  async getProviderById(id: string): Promise<ProviderProfile | null> {
    try {
      const res = await axios.get(`${API_BASE_URL}/marketplace/providers/${id}`, { timeout: 3000 });
      if (res.data?.data) return res.data.data;
    } catch {}

    const local = CURATED_PROVIDERS.find((p) => p.id === id);
    return local || null;
  }

  /**
   * Request booking quote
   */
  async getBookingQuote(params: {
    provider_id: string;
    service_id: string;
    tour_date: string;
    duration_days: number;
    number_of_guests: number;
  }) {
    try {
      const res = await axios.post(`${API_BASE_URL}/marketplace/bookings/quote`, params, { timeout: 4000 });
      return res.data?.data;
    } catch {
      // Offline fallback quotation calculation
      const dailyRate = 2000;
      const subtotal = dailyRate * params.duration_days;
      const platformFee = Math.round(subtotal * 0.05);
      return {
        subtotal,
        platform_fee: platformFee,
        total_price: subtotal + platformFee,
        currency: "BDT",
        cancellation_policy: "Free cancellation up to 24 hours before tour start.",
      };
    }
  }

  /**
   * Create confirmed booking and get 6-digit Trip OTP
   */
  async createBooking(bookingData: {
    provider_id: string;
    service_id: string;
    tour_date: string;
    duration_days: number;
    number_of_guests: number;
    meeting_point: string;
    special_requests?: string;
  }): Promise<MarketplaceBooking> {
    const res = await axios.post(`${API_BASE_URL}/marketplace/bookings`, bookingData, { timeout: 5000 });
    return res.data.data;
  }

  /**
   * Verify Traveler OTP and Check-in Trip (Image 1 Workflow)
   */
  async checkInTrip(bookingId: string, otpCode: string): Promise<TripSession> {
    const res = await axios.post(
      `${API_BASE_URL}/trips/${bookingId}/check-in`,
      { booking_id: bookingId, otp_code: otpCode },
      { timeout: 5000 }
    );
    const session = res.data.data;
    await AsyncStorage.setItem(OFFLINE_TRIP_SESSION_STORAGE, JSON.stringify(session));
    return session;
  }

  /**
   * Start Live GPS Tracking Session
   */
  async startTrip(sessionId: string, initialLat: number, initialLng: number): Promise<TripSession> {
    const res = await axios.post(
      `${API_BASE_URL}/trips/${sessionId}/start`,
      { session_id: sessionId, initial_latitude: initialLat, initial_longitude: initialLng },
      { timeout: 5000 }
    );
    return res.data.data;
  }

  /**
   * Ingest GPS coordinate breadcrumb
   */
  async sendLocationPing(
    sessionId: string,
    coords: {
      latitude: number;
      longitude: number;
      altitude?: number;
      accuracy?: number;
      speed?: number;
      battery_level?: number;
    }
  ) {
    try {
      await axios.post(
        `${API_BASE_URL}/trips/${sessionId}/location`,
        { session_id: sessionId, ...coords },
        { timeout: 3000 }
      );
    } catch (e) {
      // In offline scenario, coordinates can be queued locally for replay
    }
  }

  /**
   * Trigger SOS panic event with live coordinates
   */
  async triggerTripSOS(
    sessionId: string,
    coords: { latitude: number; longitude: number; accuracy?: number; addressContext?: string }
  ): Promise<TripEmergencyEvent> {
    const res = await axios.post(
      `${API_BASE_URL}/trips/${sessionId}/sos`,
      {
        session_id: sessionId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        address_context: coords.addressContext,
      },
      { timeout: 5000 }
    );
    return res.data.data;
  }

  /**
   * Finalize trip
   */
  async completeTrip(sessionId: string): Promise<TripSession> {
    const res = await axios.post(`${API_BASE_URL}/trips/${sessionId}/complete`, {}, { timeout: 5000 });
    return res.data.data;
  }

  /**
   * List all geodetic observation tidal stations in Bangladesh
   */
  async getTidalStations(): Promise<TidalStation[]> {
    try {
      const res = await axios.get(`${API_BASE_URL}/marketplace/tides/stations`, { timeout: 4000 });
      return res.data.data;
    } catch {
      return [
        { id: "coxs_bazar", name: "Cox's Bazar", bangla_name: "কক্সবাজার সৈকত", type: "oceanic_semidiurnal", latitude: 21.4272, longitude: 92.0058 },
        { id: "saint_martin", name: "Saint Martin", bangla_name: "সেন্টমার্টিন দ্বীপ", type: "oceanic_semidiurnal", latitude: 20.6277, longitude: 92.3225 },
        { id: "sundarbans_hiron_point", name: "Sundarbans Hiron Point", bangla_name: "সুন্দরবন হিরন পয়েন্ট", type: "estuarine_semidiurnal", latitude: 21.7833, longitude: 89.4667 },
        { id: "sylhet_tanguar_haor", name: "Tanguar Haor", bangla_name: "টাঙ্গুয়ার হাওর (সুনামগঞ্জ)", type: "riverine_hydrology", latitude: 25.1200, longitude: 91.0700 },
        { id: "sylhet_ratargul", name: "Ratargul Swamp Forest", bangla_name: "রাতারগুল সোয়াম্প ফরেস্ট", type: "riverine_hydrology", latitude: 25.0022, longitude: 91.9317 },
      ];
    }
  }

  /**
   * Get precise tidal calculation and safe-navigation advisory for station
   */
  async getTidalIntelligence(stationId: string): Promise<TidalIntelligence> {
    const res = await axios.get(`${API_BASE_URL}/marketplace/tides/${stationId}`, { timeout: 4000 });
    return res.data.data;
  }

  /**
   * Get tidal calculations by coordinates
   */
  async getNearbyTides(lat: number, lng: number): Promise<TidalIntelligence> {
    const res = await axios.get(`${API_BASE_URL}/marketplace/tides/nearby?lat=${lat}&lng=${lng}`, { timeout: 4000 });
    return res.data.data;
  }
}

export const marketplaceService = new MarketplaceService();
