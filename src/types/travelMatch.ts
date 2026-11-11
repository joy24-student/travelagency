export type BudgetTier = "budget" | "standard" | "luxury";

export type TravelStyle =
  | "Adventure & Trekking"
  | "Beach & Sunset"
  | "Photography & Vlogging"
  | "Foodie & Street Food"
  | "Nature & Silence"
  | "Camping & Stargazing"
  | "Historical Heritage"
  | "Female Squad Only";

export interface TravelProfile {
  id: string;
  name: string;
  avatar_url: string;
  age: number;
  gender: "male" | "female" | "other";
  hometown: string;
  bio: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_tier: BudgetTier;
  approx_budget: number; // in BDT
  travel_styles: TravelStyle[];
  group_size: number;
  looking_for: string;
  verified: boolean;
  languages: string[];
}

export interface MatchResult {
  candidate: TravelProfile;
  match_percentage: number;
  common_interests: string[];
  destination_match: boolean;
  date_match: boolean;
  budget_match: boolean;
  match_reason: string;
}

export interface TripInvitation {
  id: string;
  sender_name: string;
  sender_avatar?: string;
  receiver_id: string;
  destination: string;
  proposed_date: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}
