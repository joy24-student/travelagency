/**
 * Travel Intelligence & Disruption Engine Types
 * Strict TypeScript types for Shopno Jatra Travel Intelligence
 */

export type ServiceType = "flight" | "train" | "bus" | "hotel" | "ferry";

export type DisruptionSeverity = "low" | "medium" | "high" | "critical";

export type DisruptionEventType =
  | "FLIGHT_DELAYED"
  | "FLIGHT_CANCELLED"
  | "FLIGHT_GATE_CHANGED"
  | "TRAIN_DELAYED"
  | "TRAIN_CANCELLED"
  | "BUS_CANCELLED"
  | "ROUTE_DISRUPTED"
  | "WEATHER_WARNING"
  | "CONNECTION_AT_RISK"
  | "HOTEL_CHECKIN_AT_RISK";

export interface JourneyMonitor {
  id: string;
  user_id: string;
  booking_id?: string;
  trip_booking_id?: string;
  service_type: ServiceType;
  provider_code: string;
  service_number: string;
  origin: string;
  destination: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  estimated_departure?: string;
  estimated_arrival?: string;
  current_status: "on_time" | "delayed" | "cancelled" | "gate_change" | "rescheduled";
  delay_minutes: number;
  terminal?: string;
  gate?: string;
  platform?: string;
  is_active: boolean;
  notification_enabled: boolean;
  max_alternative_budget?: number;
  preferred_transport_types: string[];
  last_checked_at?: string;
  confidence_score: number;
  data_source: string;
  created_at: string;
}

export interface DisruptionImpact {
  id: string;
  event_id: string;
  affected_booking_id?: string;
  affected_service_type: string;
  impact_summary: string;
  connection_missed: boolean;
  hotel_checkin_missed: boolean;
  severity: DisruptionSeverity;
  ai_explanation?: string;
  requires_user_approval: boolean;
  resolved: boolean;
}

export interface AlternativeRecommendation {
  id: string;
  event_id: string;
  transport_type: "flight" | "train" | "bus" | "hotel_reschedule" | "ferry";
  title: string;
  operator_name: string;
  route_description: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
  estimated_price?: number;
  price_difference: number;
  currency: string;
  verified_availability: boolean;
  verification_timestamp?: string;
  reliability_score: number;
  booking_action: "instant_book" | "search" | "request_confirmation" | "contact_hotel";
  action_payload?: Record<string, any>;
  user_decision: "pending" | "accepted" | "rejected" | "expired";
}

export interface DisruptionEvent {
  id: string;
  monitor_id: string;
  user_id: string;
  event_type: DisruptionEventType;
  severity: DisruptionSeverity;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  delay_minutes: number;
  source: string;
  confidence: number;
  event_timestamp: string;
  processing_status: "pending" | "analyzed" | "notified" | "action_taken" | "resolved";
  impacts?: DisruptionImpact[];
  alternatives?: AlternativeRecommendation[];
  created_at: string;
}

export interface DisruptionTimelineEntry {
  id: string;
  monitor_id: string;
  event_id?: string;
  title: string;
  description: string;
  entry_type: "scheduled" | "detected_change" | "ai_analyzed" | "notification_sent" | "alternative_presented" | "user_action" | "confirmed";
  actor_id?: string;
  created_at: string;
}
