import { getSecureJson, setSecureJson } from "./secureStorage";
import { TravelProfile, MatchResult, TripInvitation, TravelStyle, BudgetTier } from "../types/travelMatch";
import { supabase } from "../utils/supabase";

const MATCH_INVITATIONS_KEY = "@vromon_invitations_v1";
const MY_TRAVEL_PROFILE_KEY = "@my_travel_intent_v1";

export const SAMPLE_TRAVELERS: TravelProfile[] = [
  {
    id: "traveler-1",
    name: "Tanvir Rahman",
    avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400",
    age: 24,
    gender: "male",
    hometown: "Dhaka",
    bio: "Tech enthusiast & photographer. Looking for 2 travel buddies to split Chander Gari cost and hike Konglak Para at sunrise!",
    destination: "Sajek Valley",
    start_date: "2026-11-15",
    end_date: "2026-11-18",
    budget_tier: "standard",
    approx_budget: 8500,
    travel_styles: ["Adventure & Trekking", "Photography & Vlogging", "Camping & Stargazing"],
    group_size: 2,
    looking_for: "Co-travelers to share jeep and explore remote trails",
    verified: true,
    languages: ["Bangla", "English"]
  },
  {
    id: "traveler-2",
    name: "Nabila Tabassum",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    age: 23,
    gender: "female",
    hometown: "Chittagong",
    bio: "Architecture student. Searching for fellow female travelers for a safe, relaxed weekend enjoying Himchari cliffs and Inani sunset.",
    destination: "Cox's Bazar",
    start_date: "2026-11-20",
    end_date: "2026-11-23",
    budget_tier: "budget",
    approx_budget: 6000,
    travel_styles: ["Beach & Sunset", "Photography & Vlogging", "Female Squad Only"],
    group_size: 1,
    looking_for: "Female companions for a peaceful weekend get-together",
    verified: true,
    languages: ["Bangla", "English"]
  },
  {
    id: "traveler-3",
    name: "Fahim Shahriar",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    age: 27,
    gender: "male",
    hometown: "Sylhet",
    bio: "Tea lover and trekker. Want to form a squad for Ratargul boating and Jaflong Zero point exploration. Authentic local food guaranteed!",
    destination: "Sylhet",
    start_date: "2026-11-14",
    end_date: "2026-11-17",
    budget_tier: "standard",
    approx_budget: 7000,
    travel_styles: ["Nature & Silence", "Foodie & Street Food", "Adventure & Trekking"],
    group_size: 3,
    looking_for: "1 or 2 friends to complete our car rental team",
    verified: true,
    languages: ["Bangla", "Sylheti", "English"]
  },
  {
    id: "traveler-4",
    name: "Sadia & Farzana",
    avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
    age: 25,
    gender: "female",
    hometown: "Rajshahi",
    bio: "Two university friends planning a dream trip to Sajek. We love slow mornings with cloud views and campfire night talks.",
    destination: "Sajek Valley",
    start_date: "2026-11-16",
    end_date: "2026-11-19",
    budget_tier: "standard",
    approx_budget: 9000,
    travel_styles: ["Adventure & Trekking", "Nature & Silence", "Photography & Vlogging"],
    group_size: 2,
    looking_for: "Couple or female travelers to book a combined cottage",
    verified: true,
    languages: ["Bangla", "English"]
  },
  {
    id: "traveler-5",
    name: "Rifat Chowdhury",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    age: 29,
    gender: "male",
    hometown: "Khulna",
    bio: "Wilderness explorer. Organizing a 3-day deep Sundarbans launch cruise for birding, deer watching and quiet photography.",
    destination: "Sundarbans",
    start_date: "2026-11-25",
    end_date: "2026-11-28",
    budget_tier: "luxury",
    approx_budget: 16000,
    travel_styles: ["Nature & Silence", "Photography & Vlogging", "Camping & Stargazing"],
    group_size: 4,
    looking_for: "Nature photographers and bird lovers to join the vessel",
    verified: true,
    languages: ["Bangla", "English"]
  },
  {
    id: "traveler-6",
    name: "Zubayer & Friends",
    avatar_url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400",
    age: 26,
    gender: "male",
    hometown: "Dhaka",
    bio: "Bandarban extreme trail enthusiasts heading to Nafakhum & Amiakhum waterfalls. High endurance required!",
    destination: "Bandarban",
    start_date: "2026-11-22",
    end_date: "2026-11-26",
    budget_tier: "budget",
    approx_budget: 6500,
    travel_styles: ["Adventure & Trekking", "Camping & Stargazing"],
    group_size: 3,
    looking_for: "Fit hikers to tackle the remote waterfall trails",
    verified: true,
    languages: ["Bangla", "English"]
  }
];

export const travelMatchingService = {
  /**
   * Save or update current user's travel plan
   */
  async saveMyTravelPlan(plan: Partial<TravelProfile>): Promise<TravelProfile> {
    const fullProfile: TravelProfile = {
      id: "my-profile",
      name: plan.name || "My Travel Self",
      avatar_url: plan.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      age: plan.age || 25,
      gender: plan.gender || "male",
      hometown: plan.hometown || "Dhaka",
      bio: plan.bio || "Passionate traveler looking for great companions",
      destination: plan.destination || "Sajek Valley",
      start_date: plan.start_date || "2026-11-15",
      end_date: plan.end_date || "2026-11-18",
      budget_tier: plan.budget_tier || "standard",
      approx_budget: plan.approx_budget || 8000,
      travel_styles: plan.travel_styles || ["Adventure & Trekking", "Photography & Vlogging"],
      group_size: plan.group_size || 1,
      looking_for: plan.looking_for || "Travel buddies to share memorable experiences",
      verified: true,
      languages: ["Bangla", "English"]
    };

    await setSecureJson(MY_TRAVEL_PROFILE_KEY, fullProfile);
    return fullProfile;
  },

  /**
   * Get user's current travel plan
   */
  async getMyTravelPlan(): Promise<TravelProfile> {
    try {
      const profile = await getSecureJson<TravelProfile>(MY_TRAVEL_PROFILE_KEY);
      if (profile) return profile;
    } catch {}
    return {
      id: "my-profile",
      name: "Travel Explorer",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      age: 24,
      gender: "male",
      hometown: "Dhaka",
      bio: "Excited for an upcoming weekend trip",
      destination: "Sajek Valley",
      start_date: "2026-11-15",
      end_date: "2026-11-18",
      budget_tier: "standard",
      approx_budget: 8000,
      travel_styles: ["Adventure & Trekking", "Photography & Vlogging"],
      group_size: 1,
      looking_for: "Fun companions to share travel costs and good vibes",
      verified: true,
      languages: ["Bangla", "English"]
    };
  },

  /**
   * The Vromon Matching Algorithm:
   * Computes a match score from 0% to 100% based on:
   * 1. Destination (40%)
   * 2. Travel Dates (25%)
   * 3. Travel Styles / Vibes (20%)
   * 4. Budget Compatibility (15%)
   */
  calculateMatch(myProfile: TravelProfile, candidate: TravelProfile): MatchResult {
    let score = 0;
    const reasons: string[] = [];

    // 1. Destination Match (Weight: 40 points)
    const myDest = myProfile.destination.toLowerCase().trim();
    const candDest = candidate.destination.toLowerCase().trim();
    let destMatch = false;

    if (myDest === candDest || myDest.includes(candDest) || candDest.includes(myDest)) {
      score += 40;
      destMatch = true;
      reasons.push(`উভয়ের গন্তব্য "${candidate.destination}"`);
    } else {
      score += 10; // partial baseline
    }

    // 2. Dates Overlap (Weight: 25 points)
    let dateMatch = false;
    const myStart = new Date(myProfile.start_date).getTime();
    const myEnd = new Date(myProfile.end_date).getTime();
    const candStart = new Date(candidate.start_date).getTime();
    const candEnd = new Date(candidate.end_date).getTime();

    // Check interval overlap: max(start1, start2) <= min(end1, end2)
    const hasOverlap = Math.max(myStart, candStart) <= Math.min(myEnd, candEnd);
    if (hasOverlap) {
      score += 25;
      dateMatch = true;
      reasons.push("একই সময়ে ভ্রমণের শিডিউল মিলছে");
    } else {
      // Check if dates are within 3 days
      const diffDays = Math.abs(myStart - candStart) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3) {
        score += 15;
        reasons.push("তারিখ প্রায় কাছাকাছি (±৩ দিন)");
      } else {
        score += 5;
      }
    }

    // 3. Travel Style / Vibes (Weight: 20 points)
    const myStyles = new Set(myProfile.travel_styles);
    const commonStyles = candidate.travel_styles.filter((s) => myStyles.has(s));
    if (candidate.travel_styles.length > 0) {
      const jaccardRatio = commonStyles.length / Math.max(1, myProfile.travel_styles.length);
      const styleScore = Math.min(20, Math.round(jaccardRatio * 20));
      score += styleScore;
      if (commonStyles.length > 0) {
        reasons.push(`মিল পাওয়া আগ্রহ: ${commonStyles.join(", ")}`);
      }
    }

    // 4. Budget Match (Weight: 15 points)
    let budgetMatch = false;
    if (myProfile.budget_tier === candidate.budget_tier) {
      score += 15;
      budgetMatch = true;
      reasons.push(`বাজেট ক্যাটাগরি (${candidate.budget_tier.toUpperCase()}) হুবহু মিল`);
    } else {
      score += 8;
    }

    const finalPercentage = Math.min(99, Math.max(45, score));

    return {
      candidate,
      match_percentage: finalPercentage,
      common_interests: commonStyles,
      destination_match: destMatch,
      date_match: dateMatch,
      budget_match: budgetMatch,
      match_reason: reasons.join(" • ")
    };
  },

  /**
   * Fetch all travelers and rank them using the matching algorithm
   */
  async getTopMatches(myProfile: TravelProfile): Promise<MatchResult[]> {
    const list = SAMPLE_TRAVELERS;
    const results = list
      .map((traveler) => this.calculateMatch(myProfile, traveler))
      .sort((a, b) => b.match_percentage - a.match_percentage);

    return results;
  },

  /**
   * Send a trip invite / match request
   */
  async sendTripInvitation(invite: Omit<TripInvitation, "id" | "status" | "created_at">): Promise<TripInvitation> {
    const newInvitation: TripInvitation = {
      ...invite,
      id: `invite-${Date.now()}`,
      status: "pending",
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from("match_requests").insert([newInvitation]);
    } catch {}

    const existing: TripInvitation[] = (await getSecureJson<TripInvitation[]>(MATCH_INVITATIONS_KEY)) || [];
    const updated = [newInvitation, ...existing];
    await setSecureJson(MATCH_INVITATIONS_KEY, updated);

    return newInvitation;
  },

  /**
   * Get sent invitations
   */
  async getMyInvitations(): Promise<TripInvitation[]> {
    try {
      const invitations = await getSecureJson<TripInvitation[]>(MATCH_INVITATIONS_KEY);
      return invitations || [];
    } catch {
      return [];
    }
  }
};
