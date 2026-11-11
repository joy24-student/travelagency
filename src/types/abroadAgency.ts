export type AbroadGoal = "study" | "work" | "medical" | "visit";

export interface AbroadAgency {
  id: string;
  name: string;
  logo_url: string;
  license_number: string; // Gov RL / Trade License
  verified: boolean;
  rating: number;
  reviews_count: number;
  success_rate: number; // e.g. 98%
  visas_processed: number;
  destinations: string[]; // e.g. ["UK", "Canada", "USA", "Australia"]
  services: string[];
  primary_goal: AbroadGoal;
  office_address: string;
  phone: string;
  email: string;
  consultation_fee: number; // in BDT (0 for free)
  description: string;
  popular_intakes?: string[];
}

export interface CandidateAssessmentInput {
  full_name: string;
  phone: string;
  email: string;
  goal: AbroadGoal;
  target_country: string;
  education_level: "HSC" | "Bachelor" | "Masters" | "Diploma" | "Vocational";
  ielts_score?: string; // "No IELTS", "5.5", "6.0", "6.5", "7.0+"
  work_experience_years?: number;
  budget_bdt: number;
}

export interface AssessmentResult {
  eligibility_score: number; // 0-100%
  recommended_countries: string[];
  recommended_agencies: AbroadAgency[];
  summary: string;
  next_steps: string[];
}

export interface ConsultationBooking {
  id: string;
  agency_id: string;
  agency_name: string;
  candidate_name: string;
  candidate_phone: string;
  candidate_email: string;
  goal: AbroadGoal;
  target_country: string;
  appointment_date: string;
  appointment_time: string;
  consultation_type: "online_video" | "in_person";
  status: "confirmed" | "completed" | "cancelled";
  created_at: string;
}
