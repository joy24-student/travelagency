/**
 * Deep Linking Service Test Suite
 * 
 * Verifies all 4 Core Requirements:
 * 1. Universal Link Handler (schemes: shopnojatra://trip/[id], shopnojatra://hotel/[slug], shopnojatra://split/[ledger_id], etc.)
 * 2. Deferred Deep Linking (parameter preservation through install/onboarding)
 * 3. Rich Social Previews (dynamic OpenGraph meta tags, hero images, live prices, HTML renderer)
 * 4. Authentication State Guard (protected route retention in memory and storage, post-auth navigation)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage for Jest
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
import {
  deepLinkingService,
  DeepLinkingService,
  PRIMARY_SCHEME,
  STORAGE_KEYS,
} from "../deepLinkingService";
import { supabase } from "../../../utils/supabase";

// Mock Supabase
jest.mock("../../../utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
  },
}));

// Mock expo-linking
jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  parse: jest.fn(),
}));

describe("DeepLinkingService Specification Tests", () => {
  let mockRouter: { push: jest.Mock; replace: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    deepLinkingService.cleanup();

    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
    };
    deepLinkingService.setRouter(mockRouter);
  });

  afterEach(async () => {
    deepLinkingService.cleanup();
    await AsyncStorage.clear();
  });

  // ==========================================================================
  // REQUIREMENT 1: UNIVERSAL LINK HANDLER
  // ==========================================================================
  describe("Requirement 1: Universal Link Handler", () => {
    it("recognizes supported schemes and universal link domains", () => {
      expect(deepLinkingService.isSupportedUrl("shopnojatra://trip/123")).toBe(true);
      expect(deepLinkingService.isSupportedUrl("shopnojatra://hotel/radisson-blu")).toBe(true);
      expect(deepLinkingService.isSupportedUrl("shopnojatra://split/ledger_99")).toBe(true);
      expect(deepLinkingService.isSupportedUrl("converted-travel-ui://hotel/test")).toBe(true);
      expect(deepLinkingService.isSupportedUrl("https://shopnojatra.com/trip/123")).toBe(true);
      expect(deepLinkingService.isSupportedUrl("https://app.shopnojatra.com/split/led_1")).toBe(true);
      expect(deepLinkingService.isSupportedUrl("https://unrelated-domain.com/trip/123")).toBe(false);
      expect(deepLinkingService.isSupportedUrl("randomscheme://test")).toBe(false);
    });

    it("correctly parses shopnojatra://trip/[id] into trips tab with params", () => {
      const parsed = deepLinkingService.parseUrl("shopnojatra://trip/trip_dhaka_771?filter=upcoming");
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("trip");
      expect(parsed?.originalIdentifier).toBe("trip_dhaka_771");
      expect(parsed?.targetRoute).toBe("/(tabs)/trips");
      expect(parsed?.params.tripId).toBe("trip_dhaka_771");
      expect(parsed?.params.filter).toBe("upcoming");
      expect(parsed?.requiresAuth).toBe(false);
    });

    it("correctly parses AI Itinerary trips into /screens/trip-planner", () => {
      const parsed = deepLinkingService.parseUrl(
        "shopnojatra://trip/sajek-cloud-valley?mode=ai&days=4&destination=Sajek"
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("itinerary");
      expect(parsed?.targetRoute).toBe("/screens/trip-planner");
      expect(parsed?.params.tripId).toBe("sajek-cloud-valley");
      expect(parsed?.params.destination).toBe("Sajek");
      expect(parsed?.params.days).toBe(4);
    });

    it("correctly parses shopnojatra://hotel/[slug] with room parameters", () => {
      const parsed = deepLinkingService.parseUrl(
        "shopnojatra://hotel/radisson-blu?room=deluxe_executive&checkIn=2026-12-01"
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("hotel");
      expect(parsed?.originalIdentifier).toBe("radisson-blu");
      expect(parsed?.targetRoute).toBe("/screens/hotels-homes");
      expect(parsed?.params.hotelSlug).toBe("radisson-blu");
      expect(parsed?.params.roomId).toBe("deluxe_executive");
      expect(parsed?.params.checkIn).toBe("2026-12-01");
      expect(parsed?.requiresAuth).toBe(false);
    });

    it("correctly parses hotel room subpaths (hotel/[slug]/[roomId])", () => {
      const parsed = deepLinkingService.parseUrl(
        "shopnojatra://hotel/sayeman-beach-resort/ocean_view_suite"
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("hotel");
      expect(parsed?.params.hotelSlug).toBe("sayeman-beach-resort");
      expect(parsed?.params.roomId).toBe("ocean_view_suite");
    });

    it("correctly parses shopnojatra://split/[ledger_id] and flags authentication requirement", () => {
      const parsed = deepLinkingService.parseUrl(
        "shopnojatra://split/ledger_chander_gari_441?amount=2400&currency=BDT"
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("split");
      expect(parsed?.originalIdentifier).toBe("ledger_chander_gari_441");
      expect(parsed?.targetRoute).toBe("/screens/payments");
      expect(parsed?.params.ledgerId).toBe("ledger_chander_gari_441");
      expect(parsed?.params.bookingId).toBe("ledger_chander_gari_441");
      expect(parsed?.params.split).toBe("true");
      expect(parsed?.params.amount).toBe(2400);
      expect(parsed?.params.currency).toBe("BDT");
      expect(parsed?.requiresAuth).toBe(true);
    });

    it("correctly parses flights scheme shopnojatra://flight/[id]", () => {
      const parsed = deepLinkingService.parseUrl(
        "shopnojatra://flight/BG_401?origin=DAC&destination=CXB&price=4200"
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("flight");
      expect(parsed?.targetRoute).toBe("/screens/flights");
      expect(parsed?.params.flightId).toBe("BG_401");
      expect(parsed?.params.origin).toBe("DAC");
      expect(parsed?.params.destination).toBe("CXB");
    });

    it("correctly parses Universal Link HTTPS URLs identical to custom schemes", () => {
      const parsedTrip = deepLinkingService.parseUrl("https://shopnojatra.com/trip/sajek-valley");
      expect(parsedTrip?.type).toBe("trip");
      expect(parsedTrip?.targetRoute).toBe("/(tabs)/trips");

      const parsedHotel = deepLinkingService.parseUrl("https://shopnojatra.com/hotel/coxs-bazar");
      expect(parsedHotel?.type).toBe("hotel");
      expect(parsedHotel?.targetRoute).toBe("/screens/hotels-homes");

      const parsedSplit = deepLinkingService.parseUrl("https://shopnojatra.com/split/led_resort_split");
      expect(parsedSplit?.type).toBe("split");
      expect(parsedSplit?.requiresAuth).toBe(true);
      expect(parsedSplit?.targetRoute).toBe("/screens/payments");
    });
  });

  // ==========================================================================
  // REQUIREMENT 2: DEFERRED DEEP LINKING
  // ==========================================================================
  describe("Requirement 2: Deferred Deep Linking", () => {
    it("captures and preserves deep link parameters in persistent storage", async () => {
      const testUrl = "shopnojatra://trip/coxs-bazar?source=friend_invite";
      const success = await deepLinkingService.captureDeferredDeepLink(testUrl, "utm_source=facebook");

      expect(success).toBe(true);
      expect(await deepLinkingService.hasPendingDeferredLink()).toBe(true);

      const pending = await deepLinkingService.getPendingDeferredLink();
      expect(pending).not.toBeNull();
      expect(pending?.parsedLink.targetRoute).toBe("/(tabs)/trips");
      expect(pending?.parsedLink.params.source).toBe("friend_invite");
      expect(pending?.referrer).toBe("utm_source=facebook");
      expect(pending?.consumed).toBe(false);
    });

    it("executes deferred deep link post-install and navigates with preserved parameters", async () => {
      // Mock authenticated so it navigates directly
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      });

      const testUrl = "shopnojatra://hotel/sayeman-beach-resort?room=presidential_suite&guests=2";
      await deepLinkingService.captureDeferredDeepLink(testUrl);

      const executed = await deepLinkingService.executeDeferredLink(mockRouter);
      expect(executed).toBe(true);

      // Verify router was called with preserved route and parameters
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/screens/hotels-homes",
        params: expect.objectContaining({
          hotelSlug: "sayeman-beach-resort",
          roomId: "presidential_suite",
          guests: "2",
        }),
      });

      // Verify link is marked consumed and won't execute twice
      expect(await deepLinkingService.hasPendingDeferredLink()).toBe(false);
      const secondRun = await deepLinkingService.executeDeferredLink(mockRouter);
      expect(secondRun).toBe(false);
    });

    it("discards expired deferred links beyond TTL", async () => {
      const testUrl = "shopnojatra://trip/sreemangal";
      await deepLinkingService.captureDeferredDeepLink(testUrl);

      // Manually tamper timestamp to simulate 50 hours elapsed
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEFERRED_DEEP_LINK);
      const payload = JSON.parse(raw!);
      payload.expiresAt = Date.now() - 1000; // expired
      await AsyncStorage.setItem(STORAGE_KEYS.DEFERRED_DEEP_LINK, JSON.stringify(payload));

      expect(await deepLinkingService.hasPendingDeferredLink()).toBe(false);
      const pending = await deepLinkingService.getPendingDeferredLink();
      expect(pending).toBeNull();
    });
  });

  // ==========================================================================
  // REQUIREMENT 3: RICH SOCIAL PREVIEWS
  // ==========================================================================
  describe("Requirement 3: Rich Social Previews", () => {
    it("generates OpenGraph dynamic meta tags with hero image and live price", async () => {
      const metadata = await deepLinkingService.resolvePreviewMetadata("hotel", "radisson-blu");
      expect(metadata.title).toContain("Radisson Blu");
      expect(metadata.heroImageUrl).toBeTruthy();
      expect(metadata.currentPrice).toBe(12500);

      const metaTags = deepLinkingService.generateOpenGraphMetaTags(metadata);
      expect(metaTags["og:title"]).toBe(metadata.title);
      expect(metaTags["og:image"]).toBe(metadata.heroImageUrl);
      expect(metaTags["og:image:width"]).toBe("1200");
      expect(metaTags["og:image:height"]).toBe("630");
      expect(metaTags["twitter:card"]).toBe("summary_large_image");
      expect(metaTags["product:price:amount"]).toBe("12500");
      expect(metaTags["product:price:currency"]).toBe("BDT");
      expect(metaTags["al:ios:url"]).toContain("shopnojatra://hotel/");
      expect(metaTags["al:android:package"]).toBe("com.shopnojatra.app");
    });

    it("renders complete HTML5 document for preview crawlers with Schema.org JSON-LD", async () => {
      const metadata = await deepLinkingService.resolvePreviewMetadata("split", "ledger_99", {
        amount: 2500,
        note: "St. Martin BBQ & Cottage",
      });

      const html = deepLinkingService.renderOpenGraphHtml(metadata);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('property="og:title"');
      expect(html).toContain('৳ 2,500 / person');
      expect(html).toContain('"@type": "Invoice"');
      expect(html).toContain("shopnojatra://split/");
      expect(html).toContain("Open in Shopno Jatra App");
    });

    it("builds complete share bundle containing native, universal, and preview links", async () => {
      const result = await deepLinkingService.buildShareableUrl({
        type: "flight",
        idOrSlug: "flight_dac_cxb_101",
        queryParams: {
          origin: "DAC",
          destination: "CXB",
          price: 4500,
        },
      });

      expect(result.appUrl).toBe("shopnojatra://flight/flight_dac_cxb_101?origin=DAC&destination=CXB&price=4500");
      expect(result.universalUrl).toBe("https://shopnojatra.com/flight/flight_dac_cxb_101?origin=DAC&destination=CXB&price=4500");
      expect(result.webPreviewUrl).toBe("https://shopnojatra.com/p/flight/flight_dac_cxb_101?origin=DAC&destination=CXB&price=4500");
      expect(result.metaTags["og:image"]).toBeTruthy();
      expect(result.sharePayload.message).toContain("DAC ✈ CXB");
      expect(result.sharePayload.url).toBe(result.universalUrl);
    });
  });

  // ==========================================================================
  // REQUIREMENT 4: AUTHENTICATION STATE GUARD
  // ==========================================================================
  describe("Requirement 4: Authentication State Guard", () => {
    it("routes unauthenticated users through auth screen when opening split-bill", async () => {
      // Simulate unauthenticated state
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const splitUrl = "shopnojatra://split/ledger_trip_expenses_552?amount=1800";
      const resolution = await deepLinkingService.handleDeepLink(splitUrl, mockRouter);

      expect(resolution.handled).toBe(true);
      expect(resolution.action).toBe("AUTH_REQUIRED");
      expect(resolution.targetRoute).toBe("/screens/payments");

      // Verify routing through auth screen
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(auth)/login",
        params: {
          returnTo: "/screens/payments",
          requiresDeepLinkResume: "true",
          destinationType: "split",
        },
      });

      // Verify target destination is preserved in memory and storage
      const retained = await deepLinkingService.getPendingAuthDestination();
      expect(retained).not.toBeNull();
      expect(retained?.targetRoute).toBe("/screens/payments");
      expect(retained?.params.ledgerId).toBe("ledger_trip_expenses_552");
      expect(retained?.params.amount).toBe(1800);
      expect(retained?.originalUrl).toBe(splitUrl);
    });

    it("resumes retained destination after authentication completes", async () => {
      // Retain a pending destination
      await deepLinkingService.setPendingAuthDestination({
        targetRoute: "/screens/payments",
        params: { ledgerId: "ledger_dinner_split", split: "true", amount: 1250 },
        originalUrl: "shopnojatra://split/ledger_dinner_split",
        timestamp: Date.now(),
        sourceType: "split",
      });

      // Simulate successful post-auth resume call
      const resumed = await deepLinkingService.resumePendingPostAuthNavigation(mockRouter);
      expect(resumed).toBe(true);

      // Verify target destination was navigated to with original parameters
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/screens/payments",
        params: {
          ledgerId: "ledger_dinner_split",
          split: "true",
          amount: 1250,
        },
      });

      // Verify pending destination is cleared so it cannot re-trigger
      const remaining = await deepLinkingService.getPendingAuthDestination();
      expect(remaining).toBeNull();
    });

    it("allows authenticated users to navigate to split-bills directly without auth redirect", async () => {
      // Simulate active authenticated session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: "user-456" } } },
      });

      const splitUrl = "shopnojatra://split/ledger_hotel_split?amount=4500";
      const resolution = await deepLinkingService.handleDeepLink(splitUrl, mockRouter);

      expect(resolution.handled).toBe(true);
      expect(resolution.action).toBe("NAVIGATED");
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/screens/payments",
        params: expect.objectContaining({
          ledgerId: "ledger_hotel_split",
          amount: 4500,
        }),
      });

      // No auth destination retained
      expect(await deepLinkingService.getPendingAuthDestination()).toBeNull();
    });

    it("allows public deep links (hotels, flights, AI itineraries) to navigate without authentication", async () => {
      // Unauthenticated
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const hotelUrl = "shopnojatra://hotel/sayeman-beach-resort";
      const resolution = await deepLinkingService.handleDeepLink(hotelUrl, mockRouter);

      expect(resolution.action).toBe("NAVIGATED");
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/screens/hotels-homes",
        params: expect.objectContaining({
          hotelSlug: "sayeman-beach-resort",
        }),
      });
    });
  });
});
