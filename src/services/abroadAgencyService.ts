import AsyncStorage from "@react-native-async-storage/async-storage";
import { AbroadAgency, AbroadGoal, CandidateAssessmentInput, AssessmentResult, ConsultationBooking } from "../types/abroadAgency";
import { supabase } from "../utils/supabase";

const CONSULTATIONS_STORAGE_KEY = "@abroad_consultations_v1";

export const INITIAL_ABROAD_AGENCIES: AbroadAgency[] = [
  {
    id: "agency-1",
    name: "Global EduPathway Bangladesh",
    logo_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400",
    license_number: "RL-1940 / British Council Certified",
    verified: true,
    rating: 4.9,
    reviews_count: 320,
    success_rate: 98,
    visas_processed: 2450,
    destinations: ["United Kingdom", "Canada", "Australia", "United States", "Germany"],
    services: ["University Admission", "Scholarship Guidance", "Visa Processing", "SOP Writing", "Mock Embassy Interview"],
    primary_goal: "study",
    office_address: "Gulshan-2, Road 45, House 12, Dhaka",
    phone: "+8801711998877",
    email: "info@globaledupathway.com",
    consultation_fee: 0, // Free initial consultation
    description: "Official recruitment partner of 120+ Russell Group and top universities in UK, Canada and Australia with 98% visa success track record.",
    popular_intakes: ["January 2027", "May 2027", "September 2027"]
  },
  {
    id: "agency-2",
    name: "Euro Bangla Overseas & Careers",
    logo_url: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=400",
    license_number: "Govt. Recruiting License RL-1682",
    verified: true,
    rating: 4.8,
    reviews_count: 275,
    success_rate: 96,
    visas_processed: 1890,
    destinations: ["Romania", "Croatia", "Poland", "Portugal", "Saudi Arabia"],
    services: ["Work Permit Attestation", "BMET Smart Card", "Medical Testing Assistance", "Flight Booking", "Airport Pickup"],
    primary_goal: "work",
    office_address: "Bijoy Nagar, Kakrail, Dhaka-1000",
    phone: "+8801812334455",
    email: "careers@eurobanglaoverseas.com",
    consultation_fee: 0,
    description: "Government approved recruiting agency providing legally verified work permits and employment visas for European Schengen nations and Middle East.",
    popular_intakes: ["Ongoing Work Permits", "Factory & Hospitality Batch"]
  },
  {
    id: "agency-3",
    name: "Aero Medical & Health Assist",
    logo_url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400",
    license_number: "T-Trade-7821 / Apollo India Partner",
    verified: true,
    rating: 4.95,
    reviews_count: 410,
    success_rate: 99,
    visas_processed: 3120,
    destinations: ["India", "Thailand", "Singapore", "Malaysia"],
    services: ["Doctor Appointment", "Medical Visa Invitation Letter", "Hospital Cost Estimation", "Air Ambulance", "Attendant Stay"],
    primary_goal: "medical",
    office_address: "Dhanmondi 27, Rangs Fortune Square, Dhaka",
    phone: "+8801919887766",
    email: "help@aeromedical.com.bd",
    consultation_fee: 0,
    description: "Official facilitator for Apollo Hospitals Chennai/Delhi, Fortis, CMC Vellore, and Bumrungrad Bangkok. Complete medical visa in 48-72 hours.",
    popular_intakes: ["Immediate Priority Appointments"]
  },
  {
    id: "agency-4",
    name: "Crown Travel & Schengen Visa Hub",
    logo_url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400",
    license_number: "ATAB Registered #4490",
    verified: true,
    rating: 4.75,
    reviews_count: 190,
    success_rate: 94,
    visas_processed: 1420,
    destinations: ["France", "Italy", "Switzerland", "Japan", "United Arab Emirates"],
    services: ["Tourist Visa Consultancy", "Cover Letter Preparation", "Flight Itinerary", "Travel Insurance", "VFS Appointment Booking"],
    primary_goal: "visit",
    office_address: "Banani 11, Green Heritage Tower, Dhaka",
    phone: "+8801733667788",
    email: "visa@crowntravelbd.com",
    consultation_fee: 500,
    description: "Expert tourist & family visit visa consulting for Schengen European countries, UK visitor visas, and Japan tourism.",
    popular_intakes: ["Spring & Summer Holidays 2027"]
  }
];

export const abroadAgencyService = {
  /**
   * Fetch agencies filtered by category and country
   */
  async getAgencies(goal?: AbroadGoal, country?: string): Promise<AbroadAgency[]> {
    let list = INITIAL_ABROAD_AGENCIES;

    if (goal) {
      list = list.filter((a) => a.primary_goal === goal);
    }

    if (country && country !== "All") {
      list = list.filter((a) =>
        a.destinations.some((d) => d.toLowerCase().includes(country.toLowerCase()))
      );
    }

    return list;
  },

  /**
   * Calculate Candidate Eligibility
   */
  assessCandidateEligibility(input: CandidateAssessmentInput): AssessmentResult {
    let score = 70;
    const recommendedCountries: string[] = [];
    const nextSteps: string[] = [];

    if (input.goal === "study") {
      if (input.education_level === "Bachelor" || input.education_level === "Masters") {
        score += 15;
      }
      if (input.ielts_score && input.ielts_score !== "No IELTS" && parseFloat(input.ielts_score) >= 6.0) {
        score += 15;
        recommendedCountries.push("United Kingdom", "Canada", "Australia", "United States");
        nextSteps.push("পাসপোর্ট ও ট্রান্সক্রিপ্ট প্রস্তুত করুন");
        nextSteps.push("অফার লেটারের জন্য এসওপি (SOP) প্রস্তুত করুন");
      } else {
        recommendedCountries.push("United Kingdom (MOI Accepted)", "Malaysia", "Cyprus");
        nextSteps.push("IELTS প্রস্তুতি নিন অথবা MOI দিয়ে আবেদন করতে যোগাযোগ করুন");
      }
    } else if (input.goal === "work") {
      score += 10;
      if (input.work_experience_years && input.work_experience_years >= 2) {
        score += 15;
        recommendedCountries.push("Romania", "Croatia", "Poland", "Saudi Arabia");
        nextSteps.push("কাজের অভিজ্ঞতা সনদ ও পুলিশ ক্লিয়ারেন্স নিন");
        nextSteps.push("সরকারি বিএমইটি (BMET) ডাটাবেজে রেজিস্ট্রেশন করুন");
      } else {
        recommendedCountries.push("Gulf Work Permits (UAE, Qatar, Saudi Arabia)");
        nextSteps.push("টেকনিক্যাল ট্রেনিং অথবা ড্রাইভিং লাইসেন্স সম্পন্ন করুন");
      }
    } else if (input.goal === "medical") {
      score = 98;
      recommendedCountries.push("India (Apollo, CMC Vellore, Fortis)", "Thailand (Bumrungrad)");
      nextSteps.push("বাংলাদেশি ডাক্তারের সাম্প্রতিক প্রেসক্রিপশন ও রিপোর্ট রেডি রাখুন");
      nextSteps.push("হাসপাতাল থেকে ভিসা ইনভাইটেশন লেটার সংগ্রহ করুন");
    } else {
      score = 85;
      recommendedCountries.push("Schengen Europe", "Japan", "Thailand", "UAE");
      nextSteps.push("গত ৬ মাসের ব্যাংক স্টেটমেন্ট ও ট্যাক্স রিটার্ন রেডি করুন");
    }

    const matchedAgencies = INITIAL_ABROAD_AGENCIES.filter((a) => a.primary_goal === input.goal);

    return {
      eligibility_score: Math.min(99, score),
      recommended_countries: recommendedCountries,
      recommended_agencies: matchedAgencies,
      summary: `আপনার প্রোফাইল অনুযায়ী ${input.target_country || "নির্দিষ্ট গন্তব্যে"} যাওয়ার সম্ভাবনা প্রায় ${score}%!`,
      next_steps: nextSteps,
    };
  },

  /**
   * Book a 1-on-1 Consultation
   */
  async bookConsultation(booking: Omit<ConsultationBooking, "id" | "status" | "created_at">): Promise<ConsultationBooking> {
    const newBooking: ConsultationBooking = {
      ...booking,
      id: `consult-${Date.now()}`,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("agency_enquiries").insert([
        {
          agency_id: booking.agency_id,
          name: booking.candidate_name,
          email: booking.candidate_email,
          phone: booking.candidate_phone,
          message: `Consultation booked for ${booking.target_country} (${booking.goal}) on ${booking.appointment_date} at ${booking.appointment_time}`,
        },
      ]);
    } catch {}

    const raw = await AsyncStorage.getItem(CONSULTATIONS_STORAGE_KEY);
    const existing: ConsultationBooking[] = raw ? JSON.parse(raw) : [];
    const updated = [newBooking, ...existing];
    await AsyncStorage.setItem(CONSULTATIONS_STORAGE_KEY, JSON.stringify(updated));

    return newBooking;
  },

  async getMyConsultations(): Promise<ConsultationBooking[]> {
    try {
      const raw = await AsyncStorage.getItem(CONSULTATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
