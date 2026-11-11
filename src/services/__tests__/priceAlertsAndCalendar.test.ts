/**
 * Test Suite: Price Alerts, Fare Calendar & Push Deep-Linking.
 */

// Mock AsyncStorage for Jest
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock Supabase
jest.mock("../../utils/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { priceAlertService } from "../priceAlertService";
import { deepLinkingService } from "../navigation/deepLinkingService";

describe("Price Alerts & Fare Calendar Client Suite", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe("Requirement 1 & 4: Integer Paisa Precision & 10-Alert Active Cap", () => {
    it("converts target BDT to integer paisa without floats", async () => {
      const res = await priceAlertService.createPriceAlert({
        origin: "DAC",
        destination: "CXB",
        travelDate: "2026-11-20",
        serviceType: "flight",
        targetPriceBDT: 4850,
      });

      expect(res.success).toBe(true);
      expect(res.alert).toBeDefined();
      expect(res.alert?.targetPricePaisa).toBe(485000);
      expect(Number.isInteger(res.alert?.targetPricePaisa)).toBe(true);
      expect(res.alert?.status).toBe("active");
    });

    it("enforces maximum 10 active alerts per user", async () => {
      // Create 10 active alerts
      for (let i = 1; i <= 10; i++) {
        const res = await priceAlertService.createPriceAlert({
          origin: "DAC",
          destination: `D${i}`,
          travelDate: "2026-11-20",
          targetPriceBDT: 5000,
        });
        expect(res.success).toBe(true);
      }

      // 11th active alert must be rejected
      const overflowRes = await priceAlertService.createPriceAlert({
        origin: "DAC",
        destination: "D11",
        travelDate: "2026-11-20",
        targetPriceBDT: 5000,
      });
      expect(overflowRes.success).toBe(false);
      expect(overflowRes.error).toContain("সর্বোচ্চ 10টি সক্রিয় সতর্কতা");

      // Pause one alert -> Now active count is 9
      const alerts = await priceAlertService.getUserAlerts();
      const pausedSuccess = await priceAlertService.toggleAlertStatus(alerts[0].id, "active");
      expect(pausedSuccess).toBe(true);

      // Now adding a new alert succeeds
      const retryRes = await priceAlertService.createPriceAlert({
        origin: "DAC",
        destination: "D11",
        travelDate: "2026-11-20",
        targetPriceBDT: 5000,
      });
      expect(retryRes.success).toBe(true);
    });

    it("allows deleting alerts", async () => {
      const createRes = await priceAlertService.createPriceAlert({
        origin: "DAC",
        destination: "SYL",
        travelDate: "2026-11-25",
        targetPriceBDT: 4000,
      });
      expect(createRes.success).toBe(true);

      const alertId = createRes.alert!.id;
      const deleteSuccess = await priceAlertService.deleteAlert(alertId);
      expect(deleteSuccess).toBe(true);

      const remaining = await priceAlertService.getUserAlerts();
      expect(remaining.find((a) => a.id === alertId)).toBeUndefined();
    });
  });

  describe("Requirement 4: Fare Calendar & Bangla Digits Formatting", () => {
    it("formats English numbers into Bangla digits accurately", () => {
      expect(priceAlertService.formatDigits(12345, true)).toBe("১২৩৪৫");
      expect(priceAlertService.formatDigits(2026, true)).toBe("২০২৬");
      expect(priceAlertService.formatDigits("4500", true)).toBe("৪৫০০");
      expect(priceAlertService.formatDigits(4500, false)).toBe("4500");
    });

    it("generates monthly calendar with cheapest day identified", () => {
      const calendar = priceAlertService.generateFallbackCalendar("DAC", "CXB", "2026-11", "flight");
      expect(calendar.month).toBe("2026-11");
      expect(calendar.days.length).toBe(30); // November has 30 days
      expect(calendar.cheapestDate).toBeTruthy();
      expect(calendar.cheapestPricePaisa).toBeGreaterThan(0);
      expect(calendar.days.some((d) => d.isCheapest)).toBe(true);
    });
  });

  describe("Requirement 4: Push Notification Deep-Link to Search with Date Prefilled", () => {
    it("parses price-alert deep link and prefills date for flights", async () => {
      const url = "shopnojatra://price-alert?service=flight&from=DAC&to=CXB&date=2026-11-20";
      const parsed = await deepLinkingService.parseUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.targetRoute).toBe("/screens/flights");
      expect(parsed?.params.from).toBe("DAC");
      expect(parsed?.params.to).toBe("CXB");
      expect(parsed?.params.date).toBe("2026-11-20");
    });

    it("parses price-alert deep link and prefills date for trains", async () => {
      const url = "shopnojatra://price-alert?service=train&from=DAC&to=CTG&date=2026-11-25";
      const parsed = await deepLinkingService.parseUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.targetRoute).toBe("/screens/trains");
      expect(parsed?.params.date).toBe("2026-11-25");
      expect(parsed?.params.from).toBe("DAC");
      expect(parsed?.params.to).toBe("CTG");
    });

    it("parses flight deep link with prefilled date parameter directly", async () => {
      const url = "shopnojatra://flight?from=DAC&to=CXB&date=2026-12-05";
      const parsed = await deepLinkingService.parseUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.targetRoute).toBe("/screens/flights");
      expect(parsed?.params.date).toBe("2026-12-05");
      expect(parsed?.params.from).toBe("DAC");
      expect(parsed?.params.to).toBe("CXB");
    });
  });
});
