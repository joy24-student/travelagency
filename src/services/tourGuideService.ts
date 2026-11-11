import { getSecureJson, setSecureJson } from "./secureStorage";
import { supabase } from "../utils/supabase";
import { TourGuide, TourGuideApplication, GuideBookingRequest, TourGuideReview } from "../types/tourGuide";

const GUIDES_STORAGE_KEY = "@tour_guides_list_v1";
const BOOKINGS_STORAGE_KEY = "@guide_bookings_v1";

export const INITIAL_TOUR_GUIDES: TourGuide[] = [
  {
    id: "guide-1",
    full_name: "Mahmud Hasan Niloy",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
    phone: "+8801711223344",
    email: "mahmud.guide@gmail.com",
    bio: "Certified local tour guide with 6+ years of experience across Cox's Bazar sea beach, Saint Martin Island, and Inani. Fluent in English and local dialects.",
    rating: 4.9,
    reviews_count: 142,
    total_tours: 260,
    daily_rate: 1800,
    hourly_rate: 300,
    verified: true,
    badge: "Top Rated",
    primary_area: "Cox's Bazar",
    covered_areas: ["Cox's Bazar", "Inani Beach", "Saint Martin", "Himchari", "Ramu"],
    languages: ["Bangla", "English", "Chatgaya"],
    experience_years: 6,
    specialties: ["Beach Trails", "Photography", "Seafood Spots", "Local History"],
    is_available: true,
    nid_verified: true,
    photos: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800"
    ]
  },
  {
    id: "guide-2",
    full_name: "Pritom Chakma",
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400",
    phone: "+8801819556677",
    email: "pritom.sajek@gmail.com",
    bio: "Indigenous local explorer from Rangamati. Expert in Sajek Valley clouds, Konglak Para trekking, and tribal cultural immersion.",
    rating: 4.95,
    reviews_count: 198,
    total_tours: 310,
    daily_rate: 2200,
    hourly_rate: 350,
    verified: true,
    badge: "Local Expert",
    primary_area: "Sajek Valley",
    covered_areas: ["Sajek Valley", "Konglak Para", "Ruilui Para", "Khagrachari", "Alutila Cave"],
    languages: ["Bangla", "English", "Chakma"],
    experience_years: 8,
    specialties: ["Mountain Trekking", "Indigenous Culture", "Cloud Photography", "Campfire Stargazing"],
    is_available: true,
    nid_verified: true,
    photos: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800"
    ]
  },
  {
    id: "guide-3",
    full_name: "Tanvir Ahmed Khondokar",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    phone: "+8801912345678",
    email: "tanvir.sylhet@gmail.com",
    bio: "Sylhet & Sreemangal naturalist. I guide travelers through lush tea estates, Ratargul Swamp Forest, Jaflong, and Bisnakhandi waterfalls safely.",
    rating: 4.85,
    reviews_count: 86,
    total_tours: 140,
    daily_rate: 1600,
    hourly_rate: 250,
    verified: true,
    badge: "Verified Guide",
    primary_area: "Sylhet",
    covered_areas: ["Sylhet", "Sreemangal", "Ratargul", "Jaflong", "Bisnakhandi", "Bichnakhandi"],
    languages: ["Bangla", "English", "Sylheti"],
    experience_years: 5,
    specialties: ["Tea Garden Walks", "Swamp Boating", "Waterfall Hikes", "Eco Tourism"],
    is_available: true,
    nid_verified: true
  },
  {
    id: "guide-4",
    full_name: "Golam Rasul (Bawali Master)",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    phone: "+8801733445566",
    email: "rasul.sundarban@gmail.com",
    bio: "3rd generation forest expert licensed by Bangladesh Forest Dept. Safely exploring Kotka, Kochikhali, and river channels for Royal Bengal Tigers and wildlife.",
    rating: 4.92,
    reviews_count: 215,
    total_tours: 420,
    daily_rate: 2500,
    hourly_rate: 400,
    verified: true,
    badge: "Local Expert",
    primary_area: "Sundarbans",
    covered_areas: ["Sundarbans", "Mongla", "Kotka", "Karamjal", "Hiron Point"],
    languages: ["Bangla", "English", "Khulna Local"],
    experience_years: 12,
    specialties: ["Wildlife Tracking", "Forest Safety", "Bird Watching", "Boat Navigation"],
    is_available: true,
    nid_verified: true
  },
  {
    id: "guide-5",
    full_name: "Ayesha Siddiqua",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
    phone: "+8801555667788",
    email: "ayesha.dhaka@gmail.com",
    bio: "Archaeology graduate & heritage storyteller. Leading heritage tours across Lalbagh Fort, Ahsan Manzil, Shankhari Bazar, and authentic street food crawls.",
    rating: 4.97,
    reviews_count: 175,
    total_tours: 290,
    daily_rate: 2000,
    hourly_rate: 350,
    verified: true,
    badge: "Top Rated",
    primary_area: "Old Dhaka",
    covered_areas: ["Old Dhaka", "Lalbagh", "Ahsan Manzil", "Shankhari Bazar", "Sadarghat"],
    languages: ["Bangla", "English", "Dhakaiya"],
    experience_years: 4,
    specialties: ["Mughal History", "Heritage Architecture", "Street Food Crawls", "Female Friendly Tours"],
    is_available: true,
    nid_verified: true
  },
  {
    id: "guide-6",
    full_name: "Mang Shwe Marma",
    avatar_url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400",
    phone: "+8801822334455",
    email: "marma.bandarban@gmail.com",
    bio: "Bandarban high-altitude trekking guide. Leading trails to Keokradong, Saka Haphong, Nafakhum, and Amiakhum waterfalls with government rescue safety gear.",
    rating: 4.88,
    reviews_count: 110,
    total_tours: 195,
    daily_rate: 2300,
    hourly_rate: 350,
    verified: true,
    badge: "Local Expert",
    primary_area: "Bandarban",
    covered_areas: ["Bandarban", "Nilgiri", "Keokradong", "Nafakhum", "Amiakhum", "Boga Lake"],
    languages: ["Bangla", "English", "Marma"],
    experience_years: 7,
    specialties: ["Extreme Trekking", "Waterfall Expedition", "Camping", "Wilderness Survival"],
    is_available: true,
    nid_verified: true
  }
];

export const tourGuideService = {
  /**
   * Fetch all tour guides with optional filters
   */
  async getTourGuides(filters?: { area?: string; searchQuery?: string; maxRate?: number }): Promise<TourGuide[]> {
    try {
      // 1. Try fetching from Supabase if online
      const { data: remoteData, error } = await supabase
        .from("tour_guides")
        .select("*")
        .order("rating", { ascending: false });

      let guides: TourGuide[] = [];

      if (!error && remoteData && remoteData.length > 0) {
        guides = remoteData;
      } else {
        // Fallback to locally persisted guides + initial seeds
        const localData = await getSecureJson<TourGuide[]>(GUIDES_STORAGE_KEY);
        if (localData) {
          guides = localData;
        } else {
          guides = INITIAL_TOUR_GUIDES;
          await setSecureJson(GUIDES_STORAGE_KEY, INITIAL_TOUR_GUIDES);
        }
      }

      // Apply filtering
      let result = [...guides];

      if (filters?.area && filters.area !== "All") {
        const areaLower = filters.area.toLowerCase();
        result = result.filter(
          (g) =>
            g.primary_area.toLowerCase().includes(areaLower) ||
            g.covered_areas.some((a) => a.toLowerCase().includes(areaLower))
        );
      }

      if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
        const queryLower = filters.searchQuery.toLowerCase().trim();
        result = result.filter(
          (g) =>
            g.full_name.toLowerCase().includes(queryLower) ||
            g.primary_area.toLowerCase().includes(queryLower) ||
            g.bio.toLowerCase().includes(queryLower) ||
            g.specialties.some((s) => s.toLowerCase().includes(queryLower)) ||
            g.languages.some((l) => l.toLowerCase().includes(queryLower))
        );
      }

      if (filters?.maxRate && filters.maxRate > 0) {
        result = result.filter((g) => g.daily_rate <= filters.maxRate!);
      }

      return result;
    } catch (err) {
      console.warn("getTourGuides fallback error:", err);
      return INITIAL_TOUR_GUIDES;
    }
  },

  /**
   * Fetch a single guide by ID
   */
  async getTourGuideById(id: string): Promise<TourGuide | null> {
    const guides = await this.getTourGuides();
    return guides.find((g) => g.id === id) || null;
  },

  /**
   * Register as a new tour guide (মানুষ ট্যুর গাইড হিসেবে জয়েন করতে পারবে)
   */
  async registerAsTourGuide(application: TourGuideApplication): Promise<TourGuide> {
    const newGuide: TourGuide = {
      id: `guide-${Date.now()}`,
      full_name: application.full_name,
      avatar_url: application.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      phone: application.phone,
      email: application.email,
      bio: application.bio,
      rating: 5.0,
      reviews_count: 1,
      total_tours: 0,
      daily_rate: Number(application.daily_rate) || 1500,
      verified: true,
      badge: "Rising Star",
      primary_area: application.primary_area,
      covered_areas: application.covered_areas.length > 0 ? application.covered_areas : [application.primary_area],
      languages: application.languages.length > 0 ? application.languages : ["Bangla", "English"],
      experience_years: Number(application.experience_years) || 1,
      specialties: application.specialties.length > 0 ? application.specialties : ["Local Sightseeing", "Photography"],
      is_available: true,
      nid_verified: true,
      created_at: new Date().toISOString()
    };

    try {
      // Attempt remote save in Supabase
      await supabase.from("tour_guides").insert([newGuide]);
    } catch (err) {
      console.warn("Remote guide insert ignored, saving locally:", err);
    }

    // Persist in local storage so it immediately shows up in the app
    const existing: TourGuide[] = (await getSecureJson<TourGuide[]>(GUIDES_STORAGE_KEY)) || INITIAL_TOUR_GUIDES;
    const updated = [newGuide, ...existing];
    await setSecureJson(GUIDES_STORAGE_KEY, updated);

    return newGuide;
  },

  /**
   * Create a booking request for a guide
   */
  async createGuideBooking(bookingData: Omit<GuideBookingRequest, "id" | "created_at" | "status" | "total_amount">): Promise<GuideBookingRequest> {
    const totalAmount = bookingData.daily_rate * bookingData.duration_days;
    const newBooking: GuideBookingRequest = {
      ...bookingData,
      id: `booking-guide-${Date.now()}`,
      total_amount: totalAmount,
      status: "confirmed",
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from("guide_bookings").insert([newBooking]);
    } catch (err) {
      console.warn("Remote booking insert ignored, saving locally:", err);
    }

    // Persist to local bookings storage
    const existing: GuideBookingRequest[] = (await getSecureJson(BOOKINGS_STORAGE_KEY)) || [];
    const updated = [newBooking, ...existing];
    await setSecureJson(BOOKINGS_STORAGE_KEY, updated);

    return newBooking;
  },

  /**
   * Get user's guide bookings
   */
  async getMyGuideBookings(): Promise<GuideBookingRequest[]> {
    try {
      const bookings = await getSecureJson<GuideBookingRequest[]>(BOOKINGS_STORAGE_KEY);
      return bookings || [];
    } catch {
      return [];
    }
  }
};
