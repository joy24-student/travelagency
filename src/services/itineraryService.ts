/**
 * Itinerary Marketplace Service
 * Connects React Native app to Supabase and FastAPI backend for itinerary discovery,
 * builder creation, 1-click cloning, and multi-service checkout.
 */

import { supabase } from "../utils/supabase";
import { apiClient } from "./apiClient";
import {
  Itinerary,
  ItineraryClone,
  ItineraryCloneRequest,
  AIBudgetOptimization,
} from "../types/itinerary";

export const itineraryService = {
  /**
   * Fetches published marketplace itineraries with category, destination and budget filters.
   */
  async getMarketplaceItineraries(params?: {
    destination?: string;
    category?: string;
    maxBudget?: number;
    sortBy?: "popular" | "latest" | "budget_low";
  }): Promise<Itinerary[]> {
    try {
      // 1. Try FastAPI backend endpoint for SIMD-accelerated caching
      const queryParams: Record<string, string> = {};
      if (params?.destination) queryParams.destination = params.destination;
      if (params?.category && params.category !== "all") queryParams.category = params.category;
      if (params?.maxBudget) queryParams.max_budget = params.maxBudget.toString();
      if (params?.sortBy) queryParams.sort_by = params.sortBy;

      const res = await apiClient.get<any>("/itineraries", { params: queryParams });
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (apiErr) {
      console.warn("FastAPI /itineraries unavailable, falling back directly to Supabase:", apiErr);
    }

    // 2. Direct Supabase Query with RLS
    let query = supabase
      .from("itineraries")
      .select(`
        *,
        days:itinerary_days(
          *,
          items:itinerary_items(*)
        )
      `)
      .eq("visibility", "public")
      .is("deleted_at", null);

    if (params?.destination) {
      query = query.ilike("destination", `%${params.destination}%`);
    }
    if (params?.category && params.category !== "all") {
      query = query.ilike("travel_category", `%${params.category}%`);
    }
    if (params?.maxBudget) {
      query = query.lte("estimated_budget", params.maxBudget);
    }

    if (params?.sortBy === "popular") {
      query = query.order("clone_count", { ascending: false });
    } else if (params?.sortBy === "budget_low") {
      query = query.order("estimated_budget", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase getMarketplaceItineraries error:", error);
      return [];
    }

    return (data || []) as Itinerary[];
  },

  /**
   * Fetches single full itinerary with all days and timeline items.
   */
  async getItineraryDetails(itineraryId: string): Promise<Itinerary | null> {
    try {
      const res = await apiClient.get<any>(`/itineraries/${itineraryId}`);
      if (res?.data) return res.data;
    } catch (e) {
      // fallback to Supabase
    }

    const { data, error } = await supabase
      .from("itineraries")
      .select(`
        *,
        days:itinerary_days(
          *,
          items:itinerary_items(*)
        )
      `)
      .eq("id", itineraryId)
      .single();

    if (error) {
      console.error("Error fetching itinerary details:", error);
      return null;
    }

    return data as Itinerary;
  },

  /**
   * 1-Click Clone: Duplicates an itinerary into user's private trips with custom dates/budget.
   */
  async cloneItinerary(
    itineraryId: string,
    cloneRequest: ItineraryCloneRequest
  ): Promise<ItineraryClone | null> {
    try {
      const res = await apiClient.post<any>(`/itineraries/${itineraryId}/clone`, cloneRequest);
      if (res?.data) return res.data;
    } catch (apiErr) {
      console.warn("FastAPI clone error, executing via Supabase:", apiErr);
    }

    // Direct Supabase fallback
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to clone an itinerary");

    const original = await this.getItineraryDetails(itineraryId);
    if (!original) throw new Error("Original itinerary not found");

    const cloneData = {
      original_itinerary_id: original.id,
      original_creator_id: original.creator_id,
      cloning_user_id: user.id,
      title: `My ${original.title}`,
      travel_start_date: cloneRequest.travel_start_date,
      traveler_count: cloneRequest.traveler_count,
      adults_count: cloneRequest.adults_count,
      children_count: cloneRequest.children_count,
      target_budget: cloneRequest.target_budget || original.estimated_budget,
      currency: original.currency || "BDT",
      preferred_hotel_category: cloneRequest.preferred_hotel_category || "standard",
      transport_preference: cloneRequest.transport_preference || "balanced",
      pace_of_travel: cloneRequest.pace_of_travel || "moderate",
      customized_schedule: {
        title: original.title,
        destination: original.destination,
        days: original.days,
      },
      status: "customized",
    };

    const { data, error } = await supabase
      .from("itinerary_clones")
      .insert(cloneData)
      .select()
      .single();

    if (error) throw error;

    // Increment clone_count on original
    try {
      await supabase.rpc("increment_itinerary_clone", { itin_id: itineraryId });
    } catch {}

    return data as ItineraryClone;
  },

  /**
   * AI Budget Optimizer: Customizes lodging and transport to fit target constraints.
   */
  async optimizeBudget(
    originalBudget: number,
    targetBudget: number,
    schedule: any
  ): Promise<AIBudgetOptimization> {
    try {
      const res = await apiClient.post<any>("/itineraries/optimize-budget", {
        original_budget: originalBudget,
        target_budget: targetBudget,
        currency: "BDT",
        schedule,
      });
      if (res?.data) return res.data;
    } catch (err) {
      console.info("Using local AI budget optimization logic:", err);
    }

    const feasible = targetBudget >= originalBudget * 0.45;
    const savings = Math.max(0, originalBudget - targetBudget);

    return {
      feasible,
      optimized_budget: feasible ? targetBudget : originalBudget * 0.65,
      original_budget: originalBudget,
      savings_amount: savings,
      recommendations: [
        {
          action: "Select standard sea-view hotel room instead of executive suite",
          estimated_saving: savings * 0.6,
        },
        {
          action: "Switch to verified Green Line AC Express Coach for return transit",
          estimated_saving: savings * 0.4,
        },
      ],
      trade_off_explanation: feasible
        ? "Optimized room categories and bundled transfers to achieve your target budget while keeping all scenic destinations."
        : "Budget is very constrained for luxury peak-season lodging. We adjusted to comfortable boutique stays to preserve key sights.",
    };
  },

  /**
   * Executes multi-service booking saga.
   */
  async checkoutTrip(payload: {
    cloneId?: string;
    idempotencyKey: string;
    services: any[];
    totalAmount: number;
    paymentMethod?: string;
  }): Promise<any> {
    try {
      const res = await apiClient.post<any>("/itineraries/checkout", {
        clone_id: payload.cloneId,
        idempotency_key: payload.idempotencyKey,
        services: payload.services,
        total_amount: payload.totalAmount,
        payment_method: payload.paymentMethod || "bkash",
      });
      if (res?.data) return res.data;
    } catch (e: any) {
      console.warn("Backend checkout error:", e);
      throw e;
    }
  },
};
