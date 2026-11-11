/**
 * Itinerary Marketplace & One-Click Clone Types
 * Strict TypeScript types for Shopno Jatra Itinerary Platform
 */

export type TravelCategory =
  | "all"
  | "adventure"
  | "budget"
  | "luxury"
  | "family"
  | "couple"
  | "solo"
  | "photography"
  | "weekend"
  | "nature";

export type ItineraryItemCategory =
  | "transport"
  | "hotel"
  | "restaurant"
  | "attraction"
  | "activity"
  | "guide"
  | "shopping"
  | "boat"
  | "transfer"
  | "other";

export interface ItineraryItem {
  id: string;
  itinerary_day_id: string;
  title: string;
  subtitle?: string;
  category: ItineraryItemCategory;
  start_time?: string; // e.g. "09:00 AM"
  end_time?: string; // e.g. "10:30 AM"
  duration_minutes?: number;
  transit_instruction?: string; // e.g. "Take bus 15, 125, 86 - 2 stops", "Walk 533m"
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  estimated_cost: number;
  currency: string;
  image_url?: string;
  order_index: number;
  booking_required?: boolean;
  provider_type?: string;
  metadata?: Record<string, any>;
}

export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_number: number;
  title: string; // e.g. "Day 1: Arrival & Sunset Beach"
  subtitle?: string; // e.g. "Dhaka to Cox's Bazar & Beachside Check-in"
  day_start_time?: string; // e.g. "08:00 AM"
  cover_image?: string;
  stops_count: number;
  notes?: string;
  items: ItineraryItem[];
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  location?: string;
  verified: boolean;
  badges: string[];
  total_clones: number;
  total_saves: number;
  rating: number;
  commission_rate: number;
}

export interface Itinerary {
  id: string;
  creator_id: string;
  creator?: CreatorProfile;
  title: string;
  slug: string;
  description?: string;
  cover_image: string;
  destination: string;
  destination_country: string;
  start_location: string;
  end_location: string;
  duration_days: number;
  estimated_budget: number;
  currency: string;
  travel_category: TravelCategory;
  difficulty_level: "easy" | "moderate" | "challenging";
  visibility: "public" | "unlisted" | "private";
  is_featured: boolean;
  clone_count: number;
  save_count: number;
  view_count: number;
  rating: number;
  review_count: number;
  tags: string[];
  highlights: string[];
  included_services: string[];
  excluded_services: string[];
  days: ItineraryDay[];
  created_at: string;
  updated_at: string;
}

export interface ItineraryCloneRequest {
  travel_start_date: string;
  traveler_count: number;
  adults_count: number;
  children_count: number;
  target_budget?: number;
  preferred_hotel_category?: "budget" | "standard" | "boutique" | "luxury";
  transport_preference?: "public" | "private" | "express" | "balanced";
  pace_of_travel?: "relaxed" | "moderate" | "fast_paced";
  dietary_preferences?: string[];
  accessibility_needs?: string[];
}

export interface ItineraryClone {
  id: string;
  original_itinerary_id: string;
  original_creator_id?: string;
  cloning_user_id: string;
  title: string;
  travel_start_date: string;
  travel_end_date?: string;
  traveler_count: number;
  adults_count: number;
  children_count: number;
  target_budget: number;
  currency: string;
  preferred_hotel_category: string;
  transport_preference: string;
  pace_of_travel: string;
  customized_schedule: any;
  ai_optimizations: any[];
  status: "draft" | "customized" | "quoted" | "booked";
  created_at: string;
}

export interface AIBudgetOptimization {
  feasible: boolean;
  optimized_budget: number;
  original_budget: number;
  savings_amount: number;
  recommendations: Array<{
    action: string;
    estimated_saving: number;
  }>;
  trade_off_explanation: string;
}
