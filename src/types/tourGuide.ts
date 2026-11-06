export interface TourGuide {
  id: string;
  user_id?: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  email?: string;
  bio: string;
  rating: number;
  reviews_count: number;
  total_tours: number;
  daily_rate: number; // In BDT (৳)
  hourly_rate?: number;
  verified: boolean;
  badge: "Top Rated" | "Local Expert" | "Rising Star" | "Verified Guide";
  primary_area: string;
  covered_areas: string[];
  languages: string[];
  experience_years: number;
  specialties: string[];
  is_available: boolean;
  nid_verified: boolean;
  photos?: string[];
  created_at?: string;
}

export interface TourGuideApplication {
  full_name: string;
  phone: string;
  email: string;
  nid_number: string;
  primary_area: string;
  covered_areas: string[];
  languages: string[];
  experience_years: number;
  daily_rate: number;
  bio: string;
  specialties: string[];
  avatar_url?: string;
}

export interface GuideBookingRequest {
  id: string;
  guide_id: string;
  guide_name: string;
  guide_avatar?: string;
  tourist_name: string;
  tourist_phone: string;
  tourist_email?: string;
  destination: string;
  tour_date: string;
  duration_days: number;
  guests_count: number;
  daily_rate: number;
  total_amount: number;
  meeting_point: string;
  special_requests?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
}

export interface TourGuideReview {
  id: string;
  guide_id: string;
  author_name: string;
  author_avatar?: string;
  rating: number;
  comment: string;
  tour_date: string;
  created_at: string;
}
