/**
 * Travel Intelligence & Disruption Engine Service
 * Connects React Native app to 24/7 AI travel monitoring,
 * schedule verification, impact analysis, and alternative recommendations.
 */

import { supabase } from "../utils/supabase";
import { apiClient } from "./apiClient";
import {
  JourneyMonitor,
  DisruptionEvent,
  AlternativeRecommendation,
} from "../types/travelIntelligence";

export const travelIntelligenceService = {
  /**
   * Retrieves all active journey monitors for the logged-in traveler.
   */
  async getActiveMonitors(): Promise<JourneyMonitor[]> {
    try {
      const res = await apiClient.get<any>("/travel-intelligence/monitors");
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn("FastAPI monitors endpoint fallback to Supabase:", e);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("journey_monitors")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("scheduled_departure", { ascending: true });

    if (error) {
      console.error("Error loading journey monitors:", error);
      return [];
    }

    return (data || []) as JourneyMonitor[];
  },

  /**
   * Registers a new trip for active surveillance.
   */
  async createMonitor(payload: {
    bookingId?: string;
    serviceType: "flight" | "train" | "bus" | "hotel";
    providerCode: string;
    serviceNumber: string;
    origin: string;
    destination: string;
    scheduledDeparture: string;
    scheduledArrival: string;
    terminal?: string;
    gate?: string;
    platform?: string;
  }): Promise<JourneyMonitor | null> {
    try {
      const res = await apiClient.post<any>("/travel-intelligence/monitors", {
        booking_id: payload.bookingId,
        service_type: payload.serviceType,
        provider_code: payload.providerCode,
        service_number: payload.serviceNumber,
        origin: payload.origin,
        destination: payload.destination,
        scheduled_departure: payload.scheduledDeparture,
        scheduled_arrival: payload.scheduledArrival,
        terminal: payload.terminal,
        gate: payload.gate,
        platform: payload.platform,
      });
      if (res?.data) return res.data;
    } catch (e) {
      console.warn("FastAPI create monitor fallback:", e);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to monitor a journey");

    const row = {
      user_id: user.id,
      booking_id: payload.bookingId,
      service_type: payload.serviceType,
      provider_code: payload.providerCode,
      service_number: payload.serviceNumber,
      origin: payload.origin,
      destination: payload.destination,
      scheduled_departure: payload.scheduledDeparture,
      scheduled_arrival: payload.scheduledArrival,
      terminal: payload.terminal,
      gate: payload.gate,
      platform: payload.platform,
      is_active: true,
      current_status: "on_time",
      delay_minutes: 0,
    };

    const { data, error } = await supabase
      .from("journey_monitors")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return data as JourneyMonitor;
  },

  /**
   * Triggers an immediate status verification against authorized transport providers.
   * forceDelayMinutes allows testing the disruption engine on demand.
   */
  async checkJourneyStatus(
    monitorId: string,
    forceDelayMinutes?: number
  ): Promise<DisruptionEvent | null> {
    try {
      const url = `/travel-intelligence/monitors/${monitorId}/check${
        forceDelayMinutes !== undefined ? `?force_delay_minutes=${forceDelayMinutes}` : ""
      }`;
      const res = await apiClient.post<any>(url);
      if (res?.data) return res.data;
      return null;
    } catch (e) {
      console.warn("Error running checkJourneyStatus:", e);
      return null;
    }
  },

  /**
   * Retrieves disruption alerts and AI recommendations for the traveler.
   */
  async getDisruptionEvents(): Promise<DisruptionEvent[]> {
    try {
      const res = await apiClient.get<any>("/travel-intelligence/events");
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn("FastAPI disruption events fallback:", e);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("disruption_events")
      .select(`
        *,
        impacts:disruption_impacts(*),
        alternatives:alternative_recommendations(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading disruption events:", error);
      return [];
    }

    return (data || []) as DisruptionEvent[];
  },

  /**
   * Traveler explicitly approves or rejects an alternative recommendation.
   */
  async submitAlternativeDecision(
    alternativeId: string,
    decision: "accepted" | "rejected"
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<any>(
        `/travel-intelligence/alternatives/${alternativeId}/decision`,
        { decision, alternative_id: alternativeId }
      );
      if (res?.data) return res.data;
    } catch (e) {
      console.warn("FastAPI decision submit fallback:", e);
    }

    const { error } = await supabase
      .from("alternative_recommendations")
      .update({
        user_decision: decision,
        user_decision_at: new Date().toISOString(),
      })
      .eq("id", alternativeId);

    if (error) throw error;
    return {
      success: true,
      message: decision === "accepted" ? "Alternative accepted" : "Alternative declined",
    };
  },
};
