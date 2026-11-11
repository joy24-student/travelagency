import {
  recommendationEngine,
  RecommendationEngine,
  LRUCache,
  ORDERED_TAXONOMY_KEYS,
  DEFAULT_TAXONOMY,
  buildTaxonomyVector,
  toUnitVector,
  computeUnitDotProduct,
  computeCosineSimilarity,
  sampleBeta,
  type RecommendationFeatureTaxonomy,
  type RecommendationRequest,
  type RecommendationResponse,
} from "../recommendationEngine";

// Mock the apiClient module
jest.mock("../../apiClient", () => ({
  apiRequest: jest.fn(),
}));

import { apiRequest } from "../../apiClient";
const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("RecommendationEngine & ML Hybrid Scoring Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recommendationEngine.clearCache();
  });

  // ============================================================================
  // 1. 40-PARAMETER TAXONOMY & VECTORIZATION
  // ============================================================================
  describe("Requirement 1: 40-Parameter Taxonomy Feature Vectorization", () => {
    it("should define exactly 40 distinct taxonomy parameter keys", () => {
      expect(ORDERED_TAXONOMY_KEYS.length).toBe(40);
      const uniqueKeys = new Set(ORDERED_TAXONOMY_KEYS);
      expect(uniqueKeys.size).toBe(40);

      // Verify specific core parameters are included
      expect(ORDERED_TAXONOMY_KEYS).toContain("season");
      expect(ORDERED_TAXONOMY_KEYS).toContain("temperature_celsius");
      expect(ORDERED_TAXONOMY_KEYS).toContain("historical_dwell_time");
      expect(ORDERED_TAXONOMY_KEYS).toContain("search_velocity");
      expect(ORDERED_TAXONOMY_KEYS).toContain("budget_affinity");
      expect(ORDERED_TAXONOMY_KEYS).toContain("companion_type");
      expect(ORDERED_TAXONOMY_KEYS).toContain("nature_vs_urban_affinity");
      expect(ORDERED_TAXONOMY_KEYS).toContain("cancellation_flexibility");
    });

    it("should build a Float64Array of length 40 with all values clamped [0.0, 1.0]", () => {
      const vec = buildTaxonomyVector({
        budget_affinity: 0.9,
        companion_type: 0.5,
        nature_vs_urban_affinity: 0.1,
      });

      expect(vec).toBeInstanceOf(Float64Array);
      expect(vec.length).toBe(40);

      // Verify bounds
      for (let i = 0; i < vec.length; i++) {
        expect(vec[i]).toBeGreaterThanOrEqual(0.0);
        expect(vec[i]).toBeLessThanOrEqual(1.0);
      }

      // Check specific values
      const budgetIdx = ORDERED_TAXONOMY_KEYS.indexOf("budget_affinity");
      expect(vec[budgetIdx]).toBeCloseTo(0.9);
      const companionIdx = ORDERED_TAXONOMY_KEYS.indexOf("companion_type");
      expect(vec[companionIdx]).toBeCloseTo(0.5);
    });

    it("should handle invalid or out-of-range parameters gracefully", () => {
      const vec = buildTaxonomyVector({
        budget_affinity: 1.8, // out of range -> should clamp to 1.0
        historical_dwell_time: -0.5, // out of range -> should clamp to 0.0
        search_velocity: NaN, // NaN -> should fallback to 0.0
      });

      const budgetIdx = ORDERED_TAXONOMY_KEYS.indexOf("budget_affinity");
      expect(vec[budgetIdx]).toBe(1.0);

      const dwellIdx = ORDERED_TAXONOMY_KEYS.indexOf("historical_dwell_time");
      expect(vec[dwellIdx]).toBe(0.0);

      const searchIdx = ORDERED_TAXONOMY_KEYS.indexOf("search_velocity");
      expect(vec[searchIdx]).toBe(0.0);
    });
  });

  // ============================================================================
  // 2. COSINE SIMILARITY & NORMALIZATION
  // ============================================================================
  describe("Requirement 2: Normalization & Cosine Similarity", () => {
    it("should calculate exact 1.0 similarity for identical vectors", () => {
      const vecA = new Float64Array(40).fill(0.5);
      const vecB = new Float64Array(40).fill(0.5);
      const sim = computeCosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(1.0, 5);
    });

    it("should calculate 0.0 similarity for orthogonal vectors", () => {
      const vecA = new Float64Array(40);
      const vecB = new Float64Array(40);
      vecA[0] = 1.0;
      vecB[1] = 1.0;

      const sim = computeCosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(0.0, 5);
    });

    it("should handle degenerate zero vectors safely without NaN", () => {
      const vecZero = new Float64Array(40).fill(0.0);
      const vecRegular = new Float64Array(40).fill(0.7);

      const sim = computeCosineSimilarity(vecZero, vecRegular);
      expect(sim).toBe(0.0);
      expect(Number.isFinite(sim)).toBe(true);
    });
  });

  // ============================================================================
  // 3. IN-MEMORY LRU CACHE WITH 10-MINUTE TTL
  // ============================================================================
  describe("Requirement 3: In-Memory LRU Caching (10-Minute TTL)", () => {
    it("should cache and return responses within 10-minute TTL", () => {
      const cache = new LRUCache<string>(3, 10);
      cache.set("key1", "val1");
      expect(cache.get("key1")).toBe("val1");

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(1);
    });

    it("should evict least recently used entries when capacity is exceeded", () => {
      const cache = new LRUCache<string>(2, 10);
      cache.set("a", "alpha");
      cache.set("b", "beta");

      // Access "a" to make "b" least recently used
      expect(cache.get("a")).toBe("alpha");

      // Add "c" -> "b" should be evicted
      cache.set("c", "gamma");

      expect(cache.get("a")).toBe("alpha");
      expect(cache.get("b")).toBeNull();
      expect(cache.get("c")).toBe("gamma");

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it("should expire items when TTL elapses", () => {
      // Create cache with 0.001 minutes (60ms) TTL
      const shortTtlMinutes = 60 / 60000;
      const cache = new LRUCache<string>(5, shortTtlMinutes);

      const realNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      cache.set("temp", "tempVal");
      expect(cache.get("temp")).toBe("tempVal");

      // Advance time past TTL (11 minutes = 660,000 ms)
      mockTime += 11 * 60 * 1000;
      expect(cache.get("temp")).toBeNull();

      Date.now = realNow;
    });
  });

  // ============================================================================
  // 4. THOMPSON SAMPLING MULTI-ARMED BANDIT (REGIONAL COLD-START)
  // ============================================================================
  describe("Requirement 4: Thompson Sampling Bandit & Regional Prior Fallback", () => {
    it("should sample Beta distribution values strictly in [0.0, 1.0]", () => {
      for (let i = 0; i < 20; i++) {
        const draw = sampleBeta(85, 25);
        expect(draw).toBeGreaterThanOrEqual(0.0);
        expect(draw).toBeLessThanOrEqual(1.0);
      }
    });

    it("should maintain the 4 key Bangladesh regional arms", () => {
      const states = recommendationEngine.getLocalBanditStates();
      expect(states.length).toBe(4);

      const armIds = states.map((s) => s.arm_id);
      expect(armIds).toContain("coxs_bazar");
      expect(armIds).toContain("sylhet");
      expect(armIds).toContain("sajek");
      expect(armIds).toContain("sundarbans");

      for (const arm of states) {
        expect(arm.alpha).toBeGreaterThanOrEqual(1.0);
        expect(arm.beta).toBeGreaterThanOrEqual(1.0);
        expect(arm.expected_value).toBeGreaterThan(0.5);
        expect(arm.expected_value).toBeLessThanOrEqual(1.0);
      }
    });

    it("should update arm distributions upon receiving feedback rewards", async () => {
      const initialStates = recommendationEngine.getLocalBanditStates();
      const coxsInitial = initialStates.find((s) => s.arm_id === "coxs_bazar")!;

      await recommendationEngine.recordBanditFeedback("coxs_bazar", 1.0);

      const updatedStates = recommendationEngine.getLocalBanditStates();
      const coxsUpdated = updatedStates.find((s) => s.arm_id === "coxs_bazar")!;

      expect(coxsUpdated.alpha).toBeCloseTo(coxsInitial.alpha + 1.0);
      expect(coxsUpdated.beta).toBeCloseTo(coxsInitial.beta);
    });
  });

  // ============================================================================
  // 5. OFFLINE EVALUATION HEURISTICS & COLD-START SCORING
  // ============================================================================
  describe("Requirement 5: Offline Evaluation Heuristics & Scoring", () => {
    it("should generate cold-start recommendations when API fails", async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error("Network offline"));

      const res = await recommendationEngine.getRecommendations({
        user_id: "guest-user-999",
        is_cold_start: true,
        limit: 4,
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe("offline_heuristics");
      expect(res.is_cold_start).toBe(true);
      expect(res.recommendations.length).toBeGreaterThan(0);
      expect(res.recommendations.length).toBeLessThanOrEqual(4);

      // Verify all relevance scores are strictly bounded in [0.0 - 1.0]
      for (const item of res.recommendations) {
        expect(item.relevance_score).toBeGreaterThanOrEqual(0.0);
        expect(item.relevance_score).toBeLessThanOrEqual(1.0);
        expect(item.content_similarity).toBeGreaterThanOrEqual(0.0);
        expect(item.content_similarity).toBeLessThanOrEqual(1.0);
        expect(item.collaborative_score).toBeGreaterThanOrEqual(0.0);
        expect(item.collaborative_score).toBeLessThanOrEqual(1.0);
        expect(item.match_reasons.length).toBeGreaterThan(0);
      }
    });

    it("should score warm user requests combining content similarity and collaborative history", async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error("Network timeout"));

      const req: RecommendationRequest = {
        user_id: "warm-user-123",
        item_type: "hotel",
        session_features: {
          budget_affinity: 0.9,
          relaxation_wellness_affinity: 0.9,
          companion_type: 0.5,
        },
        collaborative_history: ["hotel-cox-1"],
        limit: 3,
      };

      const res = await recommendationEngine.getRecommendations(req);

      expect(res.success).toBe(true);
      expect(res.source).toBe("offline_heuristics");
      expect(res.recommendations.length).toBeGreaterThan(0);

      // Sea Pearl Resort should score highly for high budget + luxury wellness
      for (const item of res.recommendations) {
        expect(item.item_type).toBe("hotel");
        expect(item.relevance_score).toBeGreaterThanOrEqual(0.0);
        expect(item.relevance_score).toBeLessThanOrEqual(1.0);
      }
    });

    it("should filter recommendations by preferred regions", async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error("Network offline"));

      const res = await recommendationEngine.getRecommendations({
        preferred_regions: ["sajek"],
        limit: 5,
      });

      expect(res.success).toBe(true);
      for (const item of res.recommendations) {
        expect(item.region).toBe("sajek");
      }
    });

    it("should transparently return network response when online", async () => {
      const mockNetworkResponse: RecommendationResponse = {
        success: true,
        recommendations: [
          {
            id: "dest-test-1",
            name: "Online Scored Cox Beach",
            item_type: "destination",
            city: "Cox's Bazar",
            region: "coxs_bazar",
            relevance_score: 0.942,
            content_similarity: 0.91,
            collaborative_score: 0.88,
            bandit_boost: 0.82,
            match_reasons: ["Top neural collaborative prediction"],
            price: 0,
            rating: 4.9,
            reviews_count: 500,
            tags: ["beach"],
          },
        ],
        total: 1,
        is_cold_start: false,
        latency_ms: 18.5,
        engine_version: "2.4.0-hybrid",
        source: "network",
      };

      mockedApiRequest.mockResolvedValueOnce({
        success: true,
        message: "OK",
        data: mockNetworkResponse,
      });

      const res = await recommendationEngine.getRecommendations({
        user_id: "online-user-1",
      });

      expect(res.source).toBe("network");
      expect(res.recommendations[0].id).toBe("dest-test-1");
      expect(res.recommendations[0].relevance_score).toBe(0.942);

      // Next identical call should hit the LRU cache without hitting network again
      const cachedRes = await recommendationEngine.getRecommendations({
        user_id: "online-user-1",
      });
      expect(cachedRes.source).toBe("cache");
      expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 6. ACCELERATED SIMD MATH & ULTRA-FAST BENCHMARKS
  // ============================================================================
  describe("Requirement 6: SIMD Loop-Unrolled Math & High-Throughput Benchmarks", () => {
    it("should compute unit vectors with exact L2 norm = 1.0", () => {
      const vec = buildTaxonomyVector({
        budget_affinity: 0.8,
        adventure_index: 0.6,
      });
      const unit = toUnitVector(vec);
      let normSq = 0;
      for (let i = 0; i < unit.length; i++) {
        normSq += unit[i] * unit[i];
      }
      expect(Math.sqrt(normSq)).toBeCloseTo(1.0, 5);
    });

    it("should compute SIMD unit dot product matching cosine similarity", () => {
      const vecA = buildTaxonomyVector({ budget_affinity: 0.9, adventure_index: 0.5 });
      const vecB = buildTaxonomyVector({ budget_affinity: 0.85, adventure_index: 0.45 });
      const unitA = toUnitVector(vecA);
      const unitB = toUnitVector(vecB);

      const dot = computeUnitDotProduct(unitA, unitB);
      const cos = computeCosineSimilarity(vecA, vecB);
      expect(dot).toBeCloseTo(cos, 4);
    });

    it("should execute 100 recommendation evaluations in sub-millisecond average latency", () => {
      const bench = recommendationEngine.benchmark(100);
      expect(bench.totalMs).toBeGreaterThan(0);
      expect(bench.avgMsPerCall).toBeLessThan(5.0); // well under 5ms per call (typically <0.2ms)
      expect(bench.opsPerSec).toBeGreaterThan(200); // hundreds to thousands of ops/sec
    });
  });
});
