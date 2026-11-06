/**
 * Unit & Integration Tests for Algorithmic Dynamic Pricing & Inventory Countdown Service.
 * Validates:
 * 1. Demand Elasticity Modeling (Quota scarcity, Eid/Puja/New Year proximity, BMD weather warnings)
 * 2. Fair Price Ceiling (hard 1.25x cap, anti-predatory freeze at 1.00x)
 * 3. Transparent Pricing Breakdown (human-readable line items and explanations)
 * 4. Client Consumption & Real-Time Countdown (15-minute guarantee, store integration)
 */

import {
  DynamicPricingEngine,
  dynamicPricingService,
  MAX_PLATFORM_SURGE_MULTIPLIER,
  MIN_PLATFORM_PRICE_FLOOR,
  EMERGENCY_WEATHER_CEILING,
  DEFAULT_GUARANTEE_SECONDS,
  DynamicPricingRequest,
  DynamicPricingQuote,
} from "../dynamicPricing";

// Mock the apiClient module
jest.mock("../../apiClient", () => ({
  apiRequest: jest.fn(),
}));

// Mock the booking store to test integration cleanly
jest.mock("../../../store/bookingStore", () => {
  let state = {
    pricing: {
      basePrice: 0,
      taxAmount: 0,
      serviceFee: 0,
      discountAmount: 0,
      finalPrice: 0,
      currency: "BDT",
    },
  };
  return {
    useBookingStore: {
      getState: jest.fn(() => state),
      setState: jest.fn((newState) => {
        state = { ...state, ...newState };
      }),
    },
  };
});

import { useBookingStore } from "../../../store/bookingStore";
import { apiRequest } from "../../apiClient";

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("Dynamic Pricing & Fair Surge Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dynamicPricingService.releasePriceLock();
  });

  // ============================================================================
  // 1. DEMAND ELASTICITY MODELING
  // ============================================================================
  describe("Requirement 1: Demand Elasticity Modeling", () => {
    it("should increase fare when remaining quota is critical (<= 8% or <= 2 items)", () => {
      // 2 seats left out of 36
      const result = DynamicPricingEngine.evaluateQuotaElasticity(2, 36, "bus");
      expect(result.delta).toBe(0.14);
      expect(result.label).toContain("Critical Scarcity Surge");
      expect(result.explanation).toContain("Less than");
    });

    it("should provide an early booking saver discount when inventory is ample (> 75% remaining)", () => {
      // 32 seats left out of 36
      const result = DynamicPricingEngine.evaluateQuotaElasticity(32, 36, "bus");
      expect(result.delta).toBe(-0.05);
      expect(result.label).toContain("Early Booking Saver");
      expect(result.explanation).toContain("Ample seats/cabins available");
    });

    it("should apply Eid-ul-Fitr peak surge for bus transit and holiday resort stays", () => {
      const eidTravelDate = new Date(2026, 2, 19); // March 19, 2026 (1 day before Eid)
      
      // Bus transit surge (+12%)
      const busFest = DynamicPricingEngine.evaluateFestivalProximity(eidTravelDate, "bus");
      expect(busFest.delta).toBe(0.12);
      expect(busFest.label).toContain("Eid-ul-Fitr Transit Demand +12%");
      expect(busFest.explanation).toContain("Peak homecoming travel rush");

      // Hotel / Resort holiday stay surge (+14%)
      const hotelFest = DynamicPricingEngine.evaluateFestivalProximity(eidTravelDate, "hotel");
      expect(hotelFest.delta).toBe(0.14);
      expect(hotelFest.label).toContain("Eid-ul-Fitr Holiday Rush +14%");
      expect(hotelFest.explanation).toContain("Peak vacation occupancy");
    });

    it("should apply Durga Puja and Bangla New Year proximity adjustments", () => {
      // Durga Puja 2026: October 20
      const pujaTravelDate = new Date(2026, 9, 20); // October 20
      const pujaFest = DynamicPricingEngine.evaluateFestivalProximity(pujaTravelDate, "launch");
      expect(pujaFest.delta).toBe(0.12);
      expect(pujaFest.label).toContain("Durga Puja (Dashami)");

      // Pohela Boishakh: April 14
      const boishakhDate = new Date(2026, 3, 14); // April 14
      const boishakhFest = DynamicPricingEngine.evaluateFestivalProximity(boishakhDate, "bus");
      expect(boishakhFest.delta).toBe(0.12);
      expect(boishakhFest.label).toContain("Pohela Boishakh (Bangla New Year)");
    });

    it("should apply weather safety warnings and freeze surges during severe storm signals", () => {
      const travelDate = new Date(2026, 2, 20);
      const severeAlert = DynamicPricingEngine.evaluateWeatherImpact(
        {
          condition: "cyclone_warning",
          warning_signal: 3,
          severity: "severe",
          description: "River danger signal 3 hoisted by BMD",
        },
        "launch",
        travelDate
      );

      expect(severeAlert.isSevereDanger).toBe(true);
      expect(severeAlert.delta).toBe(-0.05); // -5% disaster safety relief
      expect(severeAlert.label).toContain("Disaster Weather Advisory Fare Protection -5%");
    });

    it("should apply winter fog navigation buffer for launch and highway routes in Dec/Jan", () => {
      const winterDate = new Date(2026, 0, 10); // January 10
      const fogBuffer = DynamicPricingEngine.evaluateWeatherImpact(undefined, "launch", winterDate);
      expect(fogBuffer.delta).toBe(-0.02);
      expect(fogBuffer.label).toContain("Winter Fog Advisory Buffer -2%");
    });
  });

  // ============================================================================
  // 2. FAIR PRICE CEILING (HARD PLATFORM CAP AT 1.25X)
  // ============================================================================
  describe("Requirement 2: Fair Price Ceiling & Anti-Gouging Caps", () => {
    it("should enforce the 1.25x hard cap when compounding factors exceed ceiling", () => {
      // Compounding: critical scarcity (+14%) + Eid peak (+12%) + Thursday night (+4%) = raw 1.30
      const quote = DynamicPricingEngine.calculateFairQuote(
        {
          category: "bus",
          productId: "bus-gl-cox",
          basePrice: 2000,
          remainingQuota: 1, // critical scarcity
          totalQuota: 30,
          travelDate: "2026-03-19", // Thursday before Eid
        },
        new Date(2026, 2, 19, 10, 0, 0)
      );

      expect(quote.rawMultiplier).toBeGreaterThan(1.25);
      expect(quote.surgeMultiplier).toBe(1.25);
      expect(quote.finalPrice).toBe(2500); // 2000 * 1.25
      expect(quote.isCapped).toBe(true);
      expect(quote.capSavingsAmount).toBeGreaterThan(0);

      // Verify transparent breakdown contains fair price ceiling explanation
      const capItem = quote.breakdown.find((b) => b.code === "FAIR_PRICE_CEILING_CAP");
      expect(capItem).toBeDefined();
      expect(capItem?.label).toContain("Fair Price Ceiling (1.25x Platform Cap)");
      expect(capItem?.description).toContain("Consumer Fair Price Protection");
    });

    it("should strictly freeze surge to <= 1.00x during severe weather signals", () => {
      const quote = DynamicPricingEngine.calculateFairQuote(
        {
          category: "launch",
          productId: "launch-manami-101",
          basePrice: 2400,
          remainingQuota: 1, // critical scarcity
          totalQuota: 12,
          travelDate: "2026-03-19", // During Eid!
          weather: {
            condition: "storm_signal_3",
            warning_signal: 3,
            severity: "severe",
          },
        },
        new Date(2026, 2, 19, 10, 0, 0)
      );

      expect(quote.surgeMultiplier).toBeLessThanOrEqual(1.0);
      expect(quote.isCapped).toBe(true);
      expect(quote.breakdown.some((b) => b.code === "EMERGENCY_WEATHER_CAP")).toBe(true);
    });

    it("should not drop below platform floor (0.85x)", () => {
      const quote = DynamicPricingEngine.calculateFairQuote(
        {
          category: "bus",
          productId: "bus-empty",
          basePrice: 1000,
          remainingQuota: 38,
          totalQuota: 40, // high vacancy
          weather: {
            condition: "cyclone",
            warning_signal: 4,
            severity: "severe",
          },
        },
        new Date(2026, 5, 10)
      );

      expect(quote.surgeMultiplier).toBeGreaterThanOrEqual(0.85);
    });
  });

  // ============================================================================
  // 3. TRANSPARENT PRICING BREAKDOWN
  // ============================================================================
  describe("Requirement 3: Transparent Pricing Breakdown", () => {
    it("should return itemized explanations with label, factor percentage, and BDT amounts", () => {
      const quote = DynamicPricingEngine.calculateFairQuote({
        category: "launch",
        productId: "cab-vip-1",
        basePrice: 5000,
        remainingQuota: 2,
        totalQuota: 10, // 20% remaining -> +9%
        travelDate: "2026-11-15",
      });

      expect(quote.breakdown.length).toBeGreaterThan(0);
      quote.breakdown.forEach((item) => {
        expect(item.code).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(typeof item.percentage).toBe("number");
        expect(item.factorStr).toMatch(/^[+-]\d+\.\d+%/);
        expect(typeof item.amount).toBe("number");
        expect(item.description).toBeTruthy();
      });
    });
  });

  // ============================================================================
  // 4. CLIENT CONSUMPTION & COUNTDOWN TIMER INTEGRATION
  // ============================================================================
  describe("Requirement 4: Client Consumption & Countdown Timer with useBookingStore", () => {
    it("should initialize a 15:00 minute (900 second) price guarantee window", () => {
      const quote = DynamicPricingEngine.calculateFairQuote({
        category: "bus",
        productId: "bus-hanif-1",
        basePrice: 1500,
        remainingQuota: 5,
        totalQuota: 36,
      });

      expect(quote.guaranteeWindowSeconds).toBe(900);
      expect(quote.guaranteeText).toBe("Price guaranteed for 15:00 minutes");

      const created = new Date(quote.createdAt).getTime();
      const expires = new Date(quote.expiresAt).getTime();
      expect(expires - created).toBe(900 * 1000);
    });

    it("should apply quote to useBookingStore and update basePrice, tax, and serviceFee", () => {
      const testQuote: DynamicPricingQuote = {
        quoteId: "SJ-Q-TEST-1",
        productId: "bus-1",
        category: "bus",
        basePrice: 1000,
        finalPrice: 1200, // 1.2x surge
        surgeMultiplier: 1.2,
        rawMultiplier: 1.2,
        isCapped: false,
        capSavingsAmount: 0,
        currency: "BDT",
        guaranteeWindowSeconds: 900,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        breakdown: [],
        guaranteeText: "Price guaranteed for 15:00 minutes",
      };

      dynamicPricingService.applyQuoteToBookingStore(testQuote);

      expect(useBookingStore.setState).toHaveBeenCalled();
      const calls = (useBookingStore.setState as jest.Mock).mock.calls;
      const lastCallArg = calls[calls.length - 1][0];

      // Base price should be the dynamic guaranteed final price (1200 BDT)
      expect(lastCallArg.pricing.basePrice).toBe(1200);
      // Tax: 5% of 1200 = 60 BDT
      expect(lastCallArg.pricing.taxAmount).toBe(60);
      // Service fee: 2% of 1200 = 24 BDT
      expect(lastCallArg.pricing.serviceFee).toBe(24);
      // Final total = 1200 + 60 + 24 = 1284 BDT
      expect(lastCallArg.pricing.finalPrice).toBe(1284);
    });

    it("should track real-time countdown subscription and active state", () => {
      const quote = DynamicPricingEngine.calculateFairQuote({
        category: "bus",
        productId: "bus-hanif-1",
        basePrice: 1500,
        remainingQuota: 5,
        totalQuota: 36,
      });

      dynamicPricingService.applyQuoteToBookingStore(quote);
      expect(dynamicPricingService.isPriceLockActive()).toBe(true);

      const snapshot = dynamicPricingService.getCurrentCountdownState();
      expect(snapshot.secondsRemaining).toBeGreaterThanOrEqual(899);
      expect(snapshot.isExpired).toBe(false);
      expect(snapshot.guaranteeText).toContain("Price guaranteed for");

      // Release lock
      dynamicPricingService.releasePriceLock();
      expect(dynamicPricingService.isPriceLockActive()).toBe(false);
    });

    it("should consume backend /pricing/surge-quote when available", async () => {
      mockedApiRequest.mockResolvedValueOnce({
        success: true,
        message: "Success",
        data: {
          quote_id: "SJ-Q-BACKEND-1",
          product_id: "bus-hanif-1",
          category: "bus",
          base_price: 1000,
          final_price: 1200,
          surge_multiplier: 1.2,
          raw_multiplier: 1.2,
          is_capped: false,
          cap_savings_amount: 0,
          currency: "BDT",
          guarantee_window_seconds: 900,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 900000).toISOString(),
          breakdown: [
            {
              code: "QUOTA_ELASTICITY",
              label: "High Demand Surge +10%",
              percentage: 10.0,
              factor_str: "+10.0%",
              amount: 100.0,
              description: "Quota scarcity",
            },
          ],
          guarantee_text: "Price guaranteed for 15:00 minutes",
          signature: "hmac-sig-123",
        },
      });

      const quote = await dynamicPricingService.getSurgeQuote({
        category: "bus",
        productId: "bus-hanif-1",
        basePrice: 1000,
        remainingQuota: 5,
        totalQuota: 36,
      });

      expect(quote.quoteId).toBe("SJ-Q-BACKEND-1");
      expect(quote.finalPrice).toBe(1200);
      expect(quote.signature).toBe("hmac-sig-123");
      expect(quote.isClientCalculated).toBe(false);
    });
  });
});
