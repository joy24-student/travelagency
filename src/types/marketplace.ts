/**
 * Verified Local Guide & Boatman Marketplace: TypeScript Contracts
 * Target Regions: Cox's Bazar, Sundarbans, Bandarban, Sylhet, Sajek
 */

export type ProviderCategory =
  | "tour_guide"
  | "local_guide"
  | "boatman"
  | "trekking_guide"
  | "nature_guide"
  | "photographer"
  | "adventure_operator";

export type MarketplaceDestination =
  | "Cox's Bazar"
  | "Sundarbans"
  | "Bandarban"
  | "Sylhet"
  | "Sajek"
  | "Dhaka Heritage"
  | "Rangamati"
  | "Sreemangal";

export type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "additional_information_required"
  | "approved"
  | "rejected"
  | "suspended"
  | "expired";

export type DocumentType =
  | "nid_front"
  | "nid_back"
  | "passport"
  | "tourist_police_license"
  | "tour_guide_cert"
  | "boat_registration"
  | "boat_fitness_cert"
  | "police_clearance"
  | "first_aid_cert"
  | "other";

export interface ProviderProfile {
  id: string;
  user_id: string;
  provider_category: ProviderCategory;
  business_name?: string;
  full_name: string;
  phone: string;
  emergency_phone?: string;
  email?: string;
  avatar_url?: string;
  bio: string;
  bio_bn?: string;
  experience_years: number;
  daily_rate: number;
  hourly_rate: number;
  currency: string;
  primary_destination: MarketplaceDestination;
  covered_destinations: string[];
  languages: string[];
  specialties: string[];
  badge: "Top Rated" | "Local Expert" | "Rising Star" | "Verified Guide" | "Master Boatman";
  verification_status: VerificationStatus;
  nid_verified: boolean;
  license_verified: boolean;
  boat_permit_verified: boolean;
  police_clearance_verified: boolean;
  is_available: boolean;
  rating: number;
  reviews_count: number;
  total_trips: number;
  admin_notes?: string;
  rejection_reason?: string;
  verified_at?: string;
  created_at?: string;
}

export interface ProviderDocument {
  id: string;
  provider_id: string;
  document_type: DocumentType;
  document_number?: string;
  file_url: string;
  storage_path: string;
  expiry_date?: string;
  verification_status: "pending" | "verified" | "rejected" | "expired";
  rejection_reason?: string;
  uploaded_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  title: string;
  title_bn?: string;
  description: string;
  description_bn?: string;
  category:
    | "day_tour"
    | "boat_safari"
    | "trekking_expedition"
    | "wildlife_tracking"
    | "sunset_cruise"
    | "photography_walk"
    | "cultural_walk"
    | "custom_package";
  destination: MarketplaceDestination;
  price_model: "hourly" | "daily" | "fixed_package" | "per_person";
  price: number;
  currency: string;
  duration_hours: number;
  max_capacity: number;
  included_services: string[];
  excluded_services: string[];
  meeting_point: string;
  meeting_point_lat?: number;
  meeting_point_lng?: number;
  cancellation_policy: string;
  is_published: boolean;
  provider?: ProviderProfile;
}

export interface ProviderAvailabilitySlot {
  id: string;
  provider_id: string;
  available_date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking_id?: string;
}

export type MarketplaceBookingStatus =
  | "pending"
  | "confirmed"
  | "check_in_pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export interface MarketplaceBooking {
  id: string;
  booking_reference: string;
  traveler_id: string;
  provider_id: string;
  service_id: string;
  status: MarketplaceBookingStatus;
  tour_date: string;
  start_time: string;
  duration_days: number;
  number_of_guests: number;
  total_price: number;
  platform_fee: number;
  provider_earnings: number;
  currency: string;
  meeting_point: string;
  special_requests?: string;
  otp_code: string;
  otp_verified_at?: string;
  provider?: ProviderProfile;
  service?: ProviderService;
  created_at: string;
}

export interface TripSession {
  id: string;
  booking_id: string;
  provider_id: string;
  traveler_id: string;
  status: "scheduled" | "checked_in" | "active" | "paused" | "completed" | "aborted";
  otp_verified: boolean;
  started_at?: string;
  ended_at?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_ping_at?: string;
  total_distance_km: number;
}

export interface TripLocationBreadcrumb {
  id: string;
  session_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  recorded_at: string;
}

export interface TripEmergencyEvent {
  id: string;
  session_id: string;
  triggered_by: string;
  event_type: "sos_panic" | "route_deviation" | "prolonged_stationary" | "medical_assistance" | "weather_hazard";
  latitude: number;
  longitude: number;
  accuracy?: number;
  address_context?: string;
  status: "active" | "acknowledged" | "dispatched" | "resolved" | "false_alarm";
  notes?: string;
  dispatch_target?: string;
  trusted_contacts_notified: boolean;
  triggered_at: string;
  resolved_at?: string;
}

export interface MarketplaceReview {
  id: string;
  booking_id: string;
  provider_id: string;
  reviewer_id: string;
  rating: number;
  title?: string;
  comment: string;
  photos: string[];
  is_verified_booking: boolean;
  created_at: string;
}

export interface TidalStation {
  id: string;
  name: string;
  bangla_name: string;
  type: "oceanic_semidiurnal" | "estuarine_semidiurnal" | "riverine_hydrology";
  latitude: number;
  longitude: number;
  tidal_range_m?: number;
  danger_level_m?: number;
  current_level_m?: number;
  max_safe_draft_m?: number;
}

export interface TidalIntelligence {
  station_id: string;
  station_name: string;
  station_name_bn: string;
  calculated_at: string;
  type: "oceanic_tide" | "riverine_hydrology";
  current_water_level_m: number;
  tidal_range_m?: number;
  danger_level_m?: number;
  margin_to_danger_m?: number;
  current_state: "high_tide" | "low_tide" | "flood_tide" | "ebb_tide" | "freshwater_flow";
  state_label_bn: string;
  next_high_tide?: {
    time: string;
    time_formatted: string;
    hours_remaining: number;
    height_m: number;
  };
  next_low_tide?: {
    time: string;
    time_formatted: string;
    hours_remaining: number;
    height_m: number;
  };
  navigation: {
    is_safe_to_sail: boolean;
    status: string;
    advice_bn: string;
    required_draft_m: number;
  };
  forecast_24h?: Array<{
    time: string;
    hour_label: string;
    height_m: number;
    is_high: boolean;
    is_low: boolean;
  }>;
}
