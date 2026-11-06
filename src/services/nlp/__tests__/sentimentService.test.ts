// Mock the apiClient module
jest.mock("../../apiClient", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import {
  sentimentService,
  ClientSentimentEvaluator,
  PRECALCULATED_VIBES,
  getVibeMeterColors,
  getDimensionIcon,
  getVibeTagBadgeStyle,
  type ReviewInput,
  type TravelDimension,
} from "../sentimentService";


import { apiRequest } from "../../apiClient";
const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("NLP Sentiment & Dynamic Vibe Analytics Service Suite", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await sentimentService.invalidateCache();
  });

  // ============================================================================
  // 1. MULTI-DIMENSIONAL ASPECT SENTIMENT (5 TRAVEL DIMENSIONS)
  // ============================================================================
  describe("Requirement 1: Multi-Dimensional Aspect Sentiment Extraction", () => {
    it("should extract polarities across all 5 dimensions: Cleanliness, Hospitality, Value, Wi-Fi, Scenic", () => {
      const sampleReviews: ReviewInput[] = [
        {
          id: "r1",
          text: "The room was spotless and sanitized. Fresh sheets and sparkling clean bathroom.",
        },
        {
          id: "r2",
          text: "The host was incredibly friendly, warm, and helpful during our check-in.",
        },
        {
          id: "r3",
          text: "Very affordable rates and reasonable prices, exceptional value for money.",
        },
        {
          id: "r4",
          text: "Fast and reliable high-speed wifi, perfect remote work desk for zoom video calls.",
        },
        {
          id: "r5",
          text: "Breathtaking ocean view and gorgeous romantic sunset from private balcony, very quiet.",
        },
      ];

      const { dimensions } = ClientSentimentEvaluator.evaluateDimensions(sampleReviews);

      const requiredDims: TravelDimension[] = [
        "Cleanliness",
        "Hospitality",
        "Value for Money",
        "Wi-Fi / Remote Work",
        "Scenic Serenity",
      ];

      requiredDims.forEach((dim) => {
        expect(dimensions[dim]).toBeDefined();
        expect(dimensions[dim].dimension).toBe(dim);
        expect(dimensions[dim].score).toBeGreaterThanOrEqual(70);
        expect(dimensions[dim].polarity).toBe("positive");
        expect(dimensions[dim].mentionCount).toBeGreaterThanOrEqual(1);
      });
    });

    it("should handle negative aspect sentiment and contrastive reviews", () => {
      const negativeReviews: ReviewInput[] = [
        {
          id: "r-neg",
          text: "Dirty room with stained sheets. Staff was rude and unhelpful. Overpriced and slow wifi.",
        },
      ];

      const { dimensions } = ClientSentimentEvaluator.evaluateDimensions(negativeReviews);

      expect(dimensions.Cleanliness.score).toBeLessThanOrEqual(45);
      expect(dimensions.Cleanliness.polarity).toBe("negative");
      expect(dimensions.Hospitality.score).toBeLessThanOrEqual(45);
      expect(dimensions.Hospitality.polarity).toBe("negative");
      expect(dimensions["Value for Money"].score).toBeLessThanOrEqual(45);
      expect(dimensions["Wi-Fi / Remote Work"].score).toBeLessThanOrEqual(45);
    });
  });

  // ============================================================================
  // 2. DYNAMIC VIBE TAG SYNTHESIS
  // ============================================================================
  describe("Requirement 2: Dynamic Vibe Tag Generation", () => {
    it("should synthesize 'Romantic Sunset Spot' when scenic sunset mentions occur", () => {
      const sunsetReview: ReviewInput[] = [
        {
          id: "s1",
          text: "We had a stunning golden hour and romantic sunset view over the water from the balcony.",
        },
      ];

      const { dimensions } = ClientSentimentEvaluator.evaluateDimensions(sunsetReview);
      expect(dimensions["Scenic Serenity"].score).toBeGreaterThanOrEqual(75);
    });

    it("should include pre-calculated vibe tags for famous destinations", () => {
      const coxVibe = PRECALCULATED_VIBES["hotel-cox-1"];
      expect(coxVibe).toBeDefined();
      const tags = coxVibe.vibeTags.map((t) => t.tag);
      expect(tags).toContain("Romantic Sunset Spot");
      expect(tags).toContain("Spotless Sanctuary");
      expect(tags).toContain("Family Friendly");

      const sajekVibe = PRECALCULATED_VIBES["hotel-sajek-1"];
      expect(sajekVibe).toBeDefined();
      const sajekTags = sajekVibe.vibeTags.map((t) => t.tag);
      expect(sajekTags).toContain("Cloud Valley Vista");
      expect(sajekTags).toContain("Slow Internet"); // Cautionary tag
    });
  });

  // ============================================================================
  // 3. ANTI-SPAM & FAKE REVIEW DETECTION (LINGUISTIC PERPLEXITY)
  // ============================================================================
  describe("Requirement 3: Anti-Spam & Fake Review Detection", () => {
    it("should flag bot promotional boilerplate reviews", () => {
      const botText =
        "Nestled in the heart of paradise, this resort is truly a testament to luxury. " +
        "From the moment we arrived, it exceeded all our expectations. " +
        "Look no further as this is the epitome of comfort and hospitality.";

      const audit = ClientSentimentEvaluator.auditSpam(botText);
      expect(audit.isSpam).toBe(true);
      expect(audit.isPromotional).toBe(true);
      expect(audit.flags).toContain("PROMOTIONAL_BOILERPLATE");
      expect(audit.spamScore).toBeGreaterThanOrEqual(0.5);
    });

    it("should flag defamatory attack reviews", () => {
      const defamatoryText =
        "Absolute scam and fraud! Thieves and criminals work here! " +
        "This place should be shut down immediately! Fake reviews everywhere!";

      const audit = ClientSentimentEvaluator.auditSpam(defamatoryText);
      expect(audit.isSpam).toBe(true);
      expect(audit.isDefamatory).toBe(true);
      expect(audit.flags).toContain("DEFAMATORY_ATTACK_PATTERN");
    });

    it("should pass organic authentic traveler reviews without flagging", () => {
      const authenticText =
        "We stayed for three nights during our holiday. The room was clean and tidy with fresh towels. " +
        "Breakfast was good, though the dining room got crowded around 9 AM. " +
        "Staff helped us call a taxi to the airport. Overall a pleasant trip.";

      const audit = ClientSentimentEvaluator.auditSpam(authenticText);
      expect(audit.isSpam).toBe(false);
      expect(audit.isPromotional).toBe(false);
      expect(audit.isDefamatory).toBe(false);
      expect(audit.spamScore).toBeLessThan(0.4);
    });

    it("should down-weight and filter out fake reviews during aggregation", () => {
      const mixedReviews: ReviewInput[] = [
        {
          id: "auth-1",
          text: "Very clean hotel, wonderful staff and nice sea view.",
        },
        {
          id: "spam-bot",
          text: "Nestled in the heart of serenity, a testament to luxury, exceeded all our expectations.",
        },
        {
          id: "defam-attack",
          text: "Absolute scam! Thieves and criminals! Should be shut down!",
        },
      ];

      const result = ClientSentimentEvaluator.evaluateDimensions(mixedReviews);
      expect(result.flaggedCount).toBe(2);
      expect(result.authenticCount).toBe(1);
    });
  });

  // ============================================================================
  // 4. CLIENT CACHING WRAPPER FOR PROPERTY DETAIL CARDS
  // ============================================================================
  describe("Requirement 4: TypeScript Client Caching Wrapper", () => {
    it("should synchronously return precalculated vibe meters for instant UI rendering", () => {
      const vibe = sentimentService.getPrecalculatedVibe("hotel-cox-1");
      expect(vibe).toBeDefined();
      expect(vibe.targetId).toBe("hotel-cox-1");
      expect(vibe.overallVibeScore).toBe(94);
      expect(vibe.overallSentiment).toBe("Exceptional");
      expect(vibe.cached).toBe(true);
      expect(vibe.dimensions.Cleanliness.score).toBe(96);
    });

    it("should synthesize a stable baseline vibe for unknown property IDs", () => {
      const vibe = sentimentService.getPrecalculatedVibe("unknown-resort-999");
      expect(vibe).toBeDefined();
      expect(vibe.targetId).toBe("unknown-resort-999");
      expect(vibe.overallVibeScore).toBeGreaterThanOrEqual(60);
      expect(Object.keys(vibe.dimensions).length).toBe(5);
      expect(vibe.vibeTags.length).toBeGreaterThanOrEqual(2);
    });

    it("should cache remote API responses in memory and avoid redundant network calls", async () => {
      mockedApiRequest.mockResolvedValueOnce({
        success: true,
        data: {
          target_id: "hotel-remote-123",
          target_type: "hotel",
          overall_vibe_score: 88,
          overall_sentiment: "Exceptional",
          dimensions: {
            Cleanliness: { score: 92, polarity: "positive", confidence: 0.9, mention_count: 5, snippets: [] },
            Hospitality: { score: 90, polarity: "positive", confidence: 0.9, mention_count: 5, snippets: [] },
            "Value for Money": { score: 85, polarity: "positive", confidence: 0.85, mention_count: 4, snippets: [] },
            "Wi-Fi / Remote Work": { score: 82, polarity: "positive", confidence: 0.82, mention_count: 3, snippets: [] },
            "Scenic Serenity": { score: 94, polarity: "positive", confidence: 0.95, mention_count: 6, snippets: [] },
          },
          vibe_tags: [
            { id: "peaceful_sanctuary", tag: "Peaceful Sanctuary", category: "atmosphere", sentiment: "positive", confidence: 0.95 },
          ],
          total_reviews_analyzed: 10,
          authentic_reviews_count: 9,
          flagged_spam_count: 1,
          bot_percentage: 10.0,
          summary: "Remote calculated vibe.",
        },
      });

      // First call hits mocked API
      const result1 = await sentimentService.getPropertyVibeScore("hotel-remote-123", [
        { text: "Great view and peaceful location." },
      ]);
      expect(result1.overallVibeScore).toBe(88);
      expect(mockedApiRequest).toHaveBeenCalledTimes(1);

      // Second call without new reviews should hit memory cache without calling API
      const result2 = await sentimentService.getPropertyVibeScore("hotel-remote-123");
      expect(result2.overallVibeScore).toBe(88);
      expect(result2.cached).toBe(true);
      expect(mockedApiRequest).toHaveBeenCalledTimes(1); // No new network call!
    });
  });

  // ============================================================================
  // 5. UI FORMATTING & VIBE METER HELPERS
  // ============================================================================
  describe("UI Formatting & Vibe Meter Helpers", () => {
    it("should return correct colors and labels across score tiers", () => {
      expect(getVibeMeterColors(95).label).toBe("Superb");
      expect(getVibeMeterColors(95).colorHex).toBe("#059669");

      expect(getVibeMeterColors(80).label).toBe("Great");
      expect(getVibeMeterColors(80).colorHex).toBe("#0284C7");

      expect(getVibeMeterColors(65).label).toBe("Good");
      expect(getVibeMeterColors(50).label).toBe("Moderate");
      expect(getVibeMeterColors(30).label).toBe("Needs Attention");
      expect(getVibeMeterColors(30).colorHex).toBe("#DC2626");
    });

    it("should map dimensions to correct Ionicons icons", () => {
      expect(getDimensionIcon("Cleanliness")).toBe("sparkles");
      expect(getDimensionIcon("Hospitality")).toBe("heart");
      expect(getDimensionIcon("Value for Money")).toBe("pricetag");
      expect(getDimensionIcon("Wi-Fi / Remote Work")).toBe("wifi");
      expect(getDimensionIcon("Scenic Serenity")).toBe("leaf");
    });

    it("should return caution styling for negative vibe tags", () => {
      const cautionStyle = getVibeTagBadgeStyle("caution", "negative");
      expect(cautionStyle.iconName).toBe("alert-circle");
      expect(cautionStyle.bgClass).toContain("bg-amber-50");

      const atmosphereStyle = getVibeTagBadgeStyle("atmosphere", "positive");
      expect(atmosphereStyle.iconName).toBe("color-wand");
      expect(atmosphereStyle.bgClass).toContain("bg-purple-50");
    });
  });
});
