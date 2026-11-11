/**
 * Travel Disruption Intelligence & Automatic Recommendations Test Suite
 */

import { travelIntelligenceService } from "../travelIntelligenceService";
import { DisruptionEventType } from "../../types/travelIntelligence";

// Mock supabase and apiClient
jest.mock("../../utils/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-traveler-id-123", email: "traveler@shopnojatra.com" } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "mon-123",
          user_id: "test-traveler-id-123",
          service_type: "flight",
          provider_code: "BG",
          service_number: "BG-433",
          origin: "DAC",
          destination: "CXB",
          scheduled_departure: new Date().toISOString(),
          scheduled_arrival: new Date().toISOString(),
          current_status: "on_time",
          delay_minutes: 0,
        },
        error: null,
      }),
    }),
  },
}));

jest.mock("../apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("Travel Disruption Intelligence & Impact Analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Successfully creates an active journey monitor", async () => {
    const monitor = await travelIntelligenceService.createMonitor({
      serviceType: "flight",
      providerCode: "BG",
      serviceNumber: "BG-433",
      origin: "Hazrat Shahjalal International Airport (DAC)",
      destination: "Cox's Bazar Airport (CXB)",
      scheduledDeparture: new Date().toISOString(),
      scheduledArrival: new Date().toISOString(),
    });

    expect(monitor).toBeDefined();
    expect(monitor?.service_number).toBe("BG-433");
    expect(monitor?.service_type).toBe("flight");
  });

  test("2. Detects flight delay and captures verified event", async () => {
    const { apiClient } = require("../apiClient");
    apiClient.post.mockResolvedValueOnce({
      data: {
        id: "event-456",
        monitor_id: "mon-123",
        event_type: "FLIGHT_DELAYED",
        severity: "high",
        delay_minutes: 45,
        source: "verified_carrier_feed",
        confidence: 0.95,
        impacts: [
          {
            impact_summary: "Flight BG-433 delayed 45m. Hotel check-in at risk.",
            hotel_checkin_missed: true,
            connection_missed: false,
            requires_user_approval: true,
          },
        ],
        alternatives: [
          {
            id: "alt-1",
            transport_type: "bus",
            title: "Green Line AC Scania Coach",
            estimated_price: 1800,
            verified_availability: true,
            user_decision: "pending",
          },
        ],
      },
    });

    const event = await travelIntelligenceService.checkJourneyStatus("mon-123", 45);
    expect(event).toBeDefined();
    expect(event?.event_type).toBe("FLIGHT_DELAYED");
    expect(event?.delay_minutes).toBe(45);
    expect(event?.impacts?.[0].hotel_checkin_missed).toBe(true);
    expect(event?.alternatives?.length).toBeGreaterThan(0);
  });

  test("3. Enforces user approval workflow for alternative acceptance", async () => {
    const { apiClient } = require("../apiClient");
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, message: "Alternative authorized by traveler." },
    });

    const res = await travelIntelligenceService.submitAlternativeDecision("alt-1", "accepted");
    expect(res.success).toBe(true);
    expect(res.message.toLowerCase()).toMatch(/accepted|authorized/);
  });

  test("4. Enforces user approval workflow for alternative rejection", async () => {
    const { apiClient } = require("../apiClient");
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, message: "Alternative declined." },
    });

    const res = await travelIntelligenceService.submitAlternativeDecision("alt-1", "rejected");
    expect(res.success).toBe(true);
    expect(res.message).toContain("declined");
  });
});
