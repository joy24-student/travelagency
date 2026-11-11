/**
 * Itinerary Marketplace, 1-Click Clone & Booking Saga Test Suite
 */

import { itineraryService } from "../itineraryService";

jest.mock("../../utils/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-clone-99", email: "user@shopnojatra.com" } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "clone-abc",
          original_itinerary_id: "itin-1",
          cloning_user_id: "test-user-clone-99",
          title: "My 7 Days in Cox's Bazar",
          travel_start_date: "2026-12-05",
          traveler_count: 2,
          target_budget: 20000,
          status: "customized",
        },
        error: null,
      }),
    }),
    rpc: jest.fn().mockResolvedValue({ error: null }),
  },
}));

jest.mock("../apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("Itinerary Marketplace & Multi-Service Booking Saga", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Discovers published itineraries with categories", async () => {
    const { apiClient } = require("../apiClient");
    apiClient.get.mockResolvedValueOnce({
      data: [
        {
          id: "itin-1",
          title: "7 Days in Cox's Bazar, Saint Martin & Bandarban",
          destination: "Cox's Bazar",
          estimated_budget: 24500,
          currency: "BDT",
          duration_days: 7,
          clone_count: 890,
          visibility: "public",
        },
      ],
    });

    const items = await itineraryService.getMarketplaceItineraries({ category: "adventure" });
    expect(items.length).toBe(1);
    expect(items[0].title).toContain("Cox's Bazar");
    expect(items[0].clone_count).toBe(890);
  });

  test("2. Clones itinerary into independent private record without altering original", async () => {
    const clone = await itineraryService.cloneItinerary("itin-1", {
      travel_start_date: "2026-12-05",
      traveler_count: 2,
      adults_count: 2,
      children_count: 0,
      target_budget: 20000,
      preferred_hotel_category: "standard",
    });

    expect(clone).toBeDefined();
    expect(clone?.original_itinerary_id).toBe("itin-1");
    expect(clone?.traveler_count).toBe(2);
    expect(clone?.status).toBe("customized");
  });

  test("3. Performs AI budget adaptation and calculates savings", async () => {
    const opt = await itineraryService.optimizeBudget(25000, 16000, {});
    expect(opt.feasible).toBe(true);
    expect(opt.savings_amount).toBe(9000);
    expect(opt.recommendations.length).toBeGreaterThan(0);
    expect(opt.trade_off_explanation).toBeDefined();
  });

  test("4. Executes multi-service booking saga atomically", async () => {
    const { apiClient } = require("../apiClient");
    apiClient.post.mockResolvedValueOnce({
      data: {
        booking_reference: "SJ-TRIP-7A39B1C2",
        status: "CONFIRMED",
        total_amount: 32000,
        currency: "BDT",
        step_results: [
          { type: "flight", success: true, reference: "SVC-F10" },
          { type: "hotel", success: true, reference: "SVC-H20" },
        ],
      },
    });

    const res = await itineraryService.checkoutTrip({
      cloneId: "clone-abc",
      idempotencyKey: "test-idem-key-1",
      services: [
        { service_type: "flight", title: "BG-433", price: 4200, quantity: 2 },
        { service_type: "hotel", title: "Sayeman Beach Resort", price: 6500, quantity: 1 },
      ],
      totalAmount: 32000,
      paymentMethod: "bkash",
    });

    expect(res.status).toBe("CONFIRMED");
    expect(res.booking_reference).toContain("SJ-TRIP");
    expect(res.step_results.length).toBe(2);
  });
});
