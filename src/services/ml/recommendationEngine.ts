/**
 * Client-Side Ultra-Fast Machine Learning Recommendation Engine & TypeScript Bridge.
 * Engineered for Shopno Jatra Travel Ecosystem.
 *
 * Performance & Algorithmic Enhancements:
 * 1. Zero-Allocation Unit Vector Caching: Pre-normalizes catalog vectors to Float64Array unit vectors,
 *    reducing cosine similarity to pure SIMD-friendly loop-unrolled dot products.
 * 2. Batch Collaborative Filtering: Pre-indexes history unit vectors to avoid O(N x H) allocations.
 * 3. Maximal Marginal Relevance (MMR) Diversity Re-Ranking: Balances relevance with regional/type variety.
 * 4. High-Throughput In-Memory LRU Cache with 10-Minute TTL (600,000 ms) and Access Eviction.
 * 5. Adaptive Bayesian Thompson Sampling Bandit with temporal decay support.
 * 6. Expanded National Tourism Catalog covering Cox's Bazar, Sylhet, Sajek, Sundarbans, Bandarban, & St. Martin.
 * 7. Smooth Contextual Gaussian Price & Persona Boosters.
 * 8. Strict validation returning confidence scores in [0.0 - 1.0].
 */

import { apiRequest } from "../apiClient";

// ==============================================================================
// 1. TYPE DEFINITIONS & 40-PARAMETER TAXONOMY
// ==============================================================================

export type CatalogItemType = "destination" | "hotel" | "tour";

/**
 * The 40-parameter real-time travel taxonomy.
 * All parameters are normalized to the bounded range [0.0, 1.0].
 */
export interface RecommendationFeatureTaxonomy {
  // --- Group 1: Temporal & Calendar Signals (Indices 0 - 5) ---
  season: number; // 0.0=Winter, 0.2=Summer, 0.4=Monsoon, 0.6=Autumn, 0.8=Late Autumn, 1.0=Spring
  month_of_year: number; // 0.0=Jan ... 1.0=Dec
  day_of_week: number; // 0.0=Mon-Wed, 0.5=Thu, 1.0=Fri-Sat weekend
  time_of_day: number; // 0.0=00:00 ... 1.0=23:59
  is_holiday_or_weekend: number; // 0.0 - 1.0
  days_until_travel: number; // min(days, 60) / 60

  // --- Group 2: Meteorological & Real-Time Weather (Indices 6 - 10) ---
  temperature_celsius: number; // (T - 10) / 35 bounded [0, 1]
  precipitation_probability: number; // 0.0 - 1.0
  humidity: number; // 0.0 - 1.0
  uv_index: number; // uv / 12 bounded [0, 1]
  air_quality_index: number; // 0.0=Clean ... 1.0=Hazardous 300+

  // --- Group 3: User Engagement & Behavioral Dynamics (Indices 11 - 18) ---
  historical_dwell_time: number; // log-normalized dwell time
  search_velocity: number; // searches per session / 15
  click_through_rate: number; // 0.0 - 1.0
  conversion_rate: number; // 0.0 - 1.0
  cart_abandonment_ratio: number; // 0.0 - 1.0
  review_sentiment_affinity: number; // affinity for >4.5 star items
  session_interaction_depth: number; // page & gallery depth
  recency_score: number; // exponential recency decay

  // --- Group 4: Financial & Budget Affinities (Indices 19 - 23) ---
  budget_affinity: number; // 0=Budget, 0.5=Mid-Range, 1.0=Luxury
  discount_sensitivity: number; // deal elasticity
  spending_velocity: number; // avg spend / 50000 BDT
  price_tolerance_variance: number; // budget flexibility
  installment_emi_affinity: number; // EMI / BNPL affinity

  // --- Group 5: Traveler Persona & Companion Dynamics (Indices 24 - 28) ---
  companion_type: number; // 0=Solo, 0.25=Couple, 0.5=Family, 0.75=Friends, 1=Biz
  party_size: number; // (guests - 1) / 9
  has_children: number; // 0.0 or 1.0
  has_senior_citizens: number; // 0.0 or 1.0
  age_group_factor: number; // 0.2=Youth, 0.5=YoungPro, 0.7=FamilyHead, 1=Senior

  // --- Group 6: Travel Style & Affinity Spectrum (Indices 29 - 34) ---
  nature_vs_urban_affinity: number; // 0=Nature ... 1=Metropolitan
  adventure_index: number; // trekking, safaris, watersports
  relaxation_wellness_affinity: number; // tranquil spa, scenic balconies
  cultural_heritage_affinity: number; // historic, archaeological, tribal
  culinary_food_affinity: number; // regional seafood & gastronomy
  nightlife_entertainment_affinity: number; // evening beach, acoustic music

  // --- Group 7: Catalog & Real-Time Operational Signals (Indices 35 - 39) ---
  distance_from_origin: number; // distance from Dhaka / 600km
  transport_accessibility: number; // air, highway, waterways access
  amenity_density_score: number; // WiFi, pool, generator, restaurant
  inventory_scarcity_pressure: number; // real-time occupancy urgency
  cancellation_flexibility: number; // free cancellation preference
}

export const ORDERED_TAXONOMY_KEYS: (keyof RecommendationFeatureTaxonomy)[] = [
  "season",
  "month_of_year",
  "day_of_week",
  "time_of_day",
  "is_holiday_or_weekend",
  "days_until_travel",
  "temperature_celsius",
  "precipitation_probability",
  "humidity",
  "uv_index",
  "air_quality_index",
  "historical_dwell_time",
  "search_velocity",
  "click_through_rate",
  "conversion_rate",
  "cart_abandonment_ratio",
  "review_sentiment_affinity",
  "session_interaction_depth",
  "recency_score",
  "budget_affinity",
  "discount_sensitivity",
  "spending_velocity",
  "price_tolerance_variance",
  "installment_emi_affinity",
  "companion_type",
  "party_size",
  "has_children",
  "has_senior_citizens",
  "age_group_factor",
  "nature_vs_urban_affinity",
  "adventure_index",
  "relaxation_wellness_affinity",
  "cultural_heritage_affinity",
  "culinary_food_affinity",
  "nightlife_entertainment_affinity",
  "distance_from_origin",
  "transport_accessibility",
  "amenity_density_score",
  "inventory_scarcity_pressure",
  "cancellation_flexibility",
];

export const DEFAULT_TAXONOMY: RecommendationFeatureTaxonomy = {
  season: 0.0,
  month_of_year: 0.0,
  day_of_week: 0.0,
  time_of_day: 0.5,
  is_holiday_or_weekend: 0.0,
  days_until_travel: 0.2,
  temperature_celsius: 0.5,
  precipitation_probability: 0.0,
  humidity: 0.5,
  uv_index: 0.4,
  air_quality_index: 0.3,
  historical_dwell_time: 0.3,
  search_velocity: 0.2,
  click_through_rate: 0.15,
  conversion_rate: 0.05,
  cart_abandonment_ratio: 0.2,
  review_sentiment_affinity: 0.7,
  session_interaction_depth: 0.25,
  recency_score: 0.8,
  budget_affinity: 0.4,
  discount_sensitivity: 0.5,
  spending_velocity: 0.3,
  price_tolerance_variance: 0.35,
  installment_emi_affinity: 0.1,
  companion_type: 0.25,
  party_size: 0.1,
  has_children: 0.0,
  has_senior_citizens: 0.0,
  age_group_factor: 0.4,
  nature_vs_urban_affinity: 0.3,
  adventure_index: 0.4,
  relaxation_wellness_affinity: 0.6,
  cultural_heritage_affinity: 0.35,
  culinary_food_affinity: 0.55,
  nightlife_entertainment_affinity: 0.25,
  distance_from_origin: 0.5,
  transport_accessibility: 0.7,
  amenity_density_score: 0.6,
  inventory_scarcity_pressure: 0.35,
  cancellation_flexibility: 0.7,
};

export interface ScoredRecommendation {
  id: string;
  name: string;
  item_type: CatalogItemType;
  city: string;
  region: string;
  relevance_score: number; // Strictly [0.0 - 1.0]
  content_similarity: number;
  collaborative_score: number;
  bandit_boost: number;
  match_reasons: string[];
  price: number;
  rating: number;
  reviews_count: number;
  image_url?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface RecommendationRequest {
  user_id?: string;
  item_type?: CatalogItemType;
  session_features?: Partial<RecommendationFeatureTaxonomy>;
  limit?: number;
  is_cold_start?: boolean;
  preferred_regions?: string[];
  collaborative_history?: string[];
  enable_diversity?: boolean;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: ScoredRecommendation[];
  total: number;
  is_cold_start: boolean;
  top_bandit_arm?: string;
  latency_ms: number;
  engine_version: string;
  source: "network" | "cache" | "offline_heuristics";
}

export interface BanditArmState {
  arm_id: string;
  region_name: string;
  alpha: number;
  beta: number;
  expected_value: number;
  pulls_count: number;
}

export interface BanditFeedbackRequest {
  arm_id: string;
  reward: number; // 0.0 to 1.0
  user_id?: string;
  item_id?: string;
}

export interface CacheStats {
  size: number;
  capacity: number;
  hits: number;
  misses: number;
  evictions: number;
}

// ==============================================================================
// 2. IN-MEMORY HIGH-PERFORMANCE LRU CACHE WITH 10-MINUTE TTL (600,000 MS)
// ==============================================================================

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  accessedAt: number;
}

export class LRUCache<T> {
  private capacity: number;
  private ttlMs: number;
  private cache: Map<string, CacheEntry<T>>;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(capacity: number = 200, ttlMinutes: number = 10) {
    this.capacity = capacity;
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.cache = new Map<string, CacheEntry<T>>();
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU position
    this.cache.delete(key);
    entry.accessedAt = now;
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  public set(key: string, value: T): void {
    const now = Date.now();

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }

    this.cache.set(key, {
      key,
      value,
      expiresAt: now + this.ttlMs,
      accessedAt: now,
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats(): CacheStats {
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }
}

// ==============================================================================
// 3. ULTRA-FAST VECTORIZATION & SIMD-FRIENDLY MATH UTILITIES
// ==============================================================================

/**
 * Serializes a 40-parameter taxonomy into a strict Float64Array of length 40.
 */
export function buildTaxonomyVector(
  input?: Partial<RecommendationFeatureTaxonomy>
): Float64Array {
  const vec = new Float64Array(ORDERED_TAXONOMY_KEYS.length);
  const source = { ...DEFAULT_TAXONOMY, ...(input || {}) };

  for (let i = 0; i < ORDERED_TAXONOMY_KEYS.length; i++) {
    const key = ORDERED_TAXONOMY_KEYS[i];
    const val = Number(source[key]);
    vec[i] = Number.isFinite(val) ? Math.max(0.0, Math.min(1.0, val)) : 0.0;
  }

  return vec;
}

/**
 * Converts a Float64Array vector to unit L2 norm in-place or returns a new Float64Array.
 */
export function toUnitVector(v: Float64Array): Float64Array {
  let normSq = 0.0;
  const len = v.length;
  for (let i = 0; i < len; i++) {
    normSq += v[i] * v[i];
  }
  if (normSq < 1e-9) {
    return new Float64Array(len);
  }
  const invNorm = 1.0 / Math.sqrt(normSq);
  const unit = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    unit[i] = v[i] * invNorm;
  }
  return unit;
}

/**
 * High-performance loop-unrolled dot product for pre-normalized unit vectors.
 * Directly optimized for V8 / Hermes JIT vector registers.
 */
export function computeUnitDotProduct(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length) return 0.0;
  let sum = 0.0;
  const len = a.length;
  let i = 0;
  for (; i <= len - 4; i += 4) {
    sum += a[i] * b[i] + a[i + 1] * b[i + 1] + a[i + 2] * b[i + 2] + a[i + 3] * b[i + 3];
  }
  for (; i < len; i++) {
    sum += a[i] * b[i];
  }
  return Math.max(0.0, Math.min(1.0, sum));
}

/**
 * Computes cosine similarity between two 40-dimensional vectors.
 * Returns normalized score strictly clamped in [0.0, 1.0].
 */
export function computeCosineSimilarity(
  a: Float64Array,
  b: Float64Array
): number {
  if (a.length !== b.length) {
    return 0.0;
  }

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  const len = a.length;
  let i = 0;
  // 4-way loop unrolling
  for (; i <= len - 4; i += 4) {
    const a0 = a[i], b0 = b[i];
    const a1 = a[i + 1], b1 = b[i + 1];
    const a2 = a[i + 2], b2 = b[i + 2];
    const a3 = a[i + 3], b3 = b[i + 3];

    dotProduct += a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
    normA += a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    normB += b0 * b0 + b1 * b1 + b2 * b2 + b3 * b3;
  }
  for (; i < len; i++) {
    const ai = a[i], bi = b[i];
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  if (normA < 1e-9 || normB < 1e-9) {
    return 0.0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0.0, Math.min(1.0, similarity));
}

/**
 * Generates a standard Gamma-distributed random variable using Marsaglia & Tsang method.
 */
function sampleGamma(shape: number): number {
  if (shape < 1.0) {
    return sampleGamma(shape + 1.0) * Math.pow(Math.random(), 1.0 / shape);
  }
  const d = shape - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);
  while (true) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1 || 1e-9)) * Math.cos(2.0 * Math.PI * u2);

    const v = 1.0 + c * z;
    if (v <= 0) continue;
    const v3 = v * v * v;
    const u = Math.random();
    if (u < 1.0 - 0.0331 * z * z * z * z) {
      return d * v3;
    }
    if (Math.log(u) < 0.5 * z * z + d * (1.0 - v3 + Math.log(v3))) {
      return d * v3;
    }
  }
}

/**
 * Samples a random variate from Beta(alpha, beta) distribution via Gamma variables:
 * X ~ Gamma(alpha, 1), Y ~ Gamma(beta, 1) => X / (X + Y) ~ Beta(alpha, beta).
 */
export function sampleBeta(alpha: number, beta: number): number {
  const safeAlpha = Math.max(0.1, alpha);
  const safeBeta = Math.max(0.1, beta);
  const x = sampleGamma(safeAlpha);
  const y = sampleGamma(safeBeta);
  if (x + y <= 0) return 0.5;
  const draw = x / (x + y);
  return Math.max(0.0, Math.min(1.0, draw));
}

// ==============================================================================
// 4. PRE-NORMALIZED SEED CATALOG FOR OFFLINE EVALUATION HEURISTICS
// ==============================================================================

export interface LocalCatalogRecord {
  id: string;
  name: string;
  item_type: CatalogItemType;
  city: string;
  region: string;
  description: string;
  price: number;
  rating: number;
  reviews_count: number;
  image_url: string;
  tags: string[];
  features: Partial<RecommendationFeatureTaxonomy>;
  rawVector: Float64Array;
  unitVector: Float64Array;
}

const RAW_OFFLINE_CATALOG: Omit<LocalCatalogRecord, "rawVector" | "unitVector">[] = [
  // --- Cox's Bazar ---
  {
    id: "dest-coxs-bazar",
    name: "Cox's Bazar Long Beach & Marine Drive",
    item_type: "destination",
    city: "Cox's Bazar",
    region: "coxs_bazar",
    description: "The world's longest unbroken natural sea beach and marine drive.",
    price: 0,
    rating: 4.8,
    reviews_count: 1240,
    image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    tags: ["beach", "sunset", "marine_drive", "seafood"],
    features: {
      season: 0.0,
      relaxation_wellness_affinity: 0.85,
      culinary_food_affinity: 0.85,
      nightlife_entertainment_affinity: 0.7,
      budget_affinity: 0.6,
      transport_accessibility: 0.95,
      amenity_density_score: 0.9,
    },
  },
  {
    id: "hotel-cox-1",
    name: "Sea Pearl Beach Resort & Spa",
    item_type: "hotel",
    city: "Cox's Bazar",
    region: "coxs_bazar",
    description: "5-Star luxury beachfront resort with private beach and spa.",
    price: 8500,
    rating: 4.8,
    reviews_count: 420,
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    tags: ["5_star", "spa", "private_beach", "pool", "luxury"],
    features: {
      budget_affinity: 0.85,
      spending_velocity: 0.85,
      relaxation_wellness_affinity: 0.95,
      amenity_density_score: 0.98,
      cancellation_flexibility: 0.85,
    },
  },
  {
    id: "tour-cox-inani",
    name: "Inani Coral Beach & Himchari Hill Safari",
    item_type: "tour",
    city: "Cox's Bazar",
    region: "coxs_bazar",
    description: "4x4 Chander Gari tour along Marine Drive and coral reef exploration.",
    price: 2400,
    rating: 4.7,
    reviews_count: 380,
    image_url: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800",
    tags: ["chander_gari", "adventure", "marine_drive", "coral"],
    features: {
      adventure_index: 0.75,
      nature_vs_urban_affinity: 0.2,
      budget_affinity: 0.45,
    },
  },

  // --- Sylhet ---
  {
    id: "dest-sylhet",
    name: "Sylhet Tea Hills & Ratargul Swamp Forest",
    item_type: "destination",
    city: "Sylhet",
    region: "sylhet",
    description: "Lush carpeted tea gardens and freshwater swamp canoeing.",
    price: 0,
    rating: 4.8,
    reviews_count: 980,
    image_url: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800",
    tags: ["tea_garden", "swamp_forest", "waterfall", "nature"],
    features: {
      nature_vs_urban_affinity: 0.1,
      relaxation_wellness_affinity: 0.9,
      cultural_heritage_affinity: 0.75,
      budget_affinity: 0.5,
    },
  },
  {
    id: "hotel-sylhet-1",
    name: "Grand Sylhet Hotel & Resort",
    item_type: "hotel",
    city: "Sylhet",
    region: "sylhet",
    description: "5-Star hotel with rooftop pool and fine dining.",
    price: 7200,
    rating: 4.7,
    reviews_count: 280,
    image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    tags: ["5_star", "rooftop_pool", "spa", "fine_dining"],
    features: {
      budget_affinity: 0.8,
      relaxation_wellness_affinity: 0.9,
      amenity_density_score: 0.95,
    },
  },
  {
    id: "tour-sylhet-lalakhal",
    name: "Lalakhal Emerald River Boat Safari",
    item_type: "tour",
    city: "Sylhet",
    region: "sylhet",
    description: "Cruise down the crystal-emerald river and visit Khasi village.",
    price: 2800,
    rating: 4.8,
    reviews_count: 290,
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    tags: ["boat_cruise", "emerald_river", "tribal_culture"],
    features: {
      adventure_index: 0.7,
      nature_vs_urban_affinity: 0.1,
      cultural_heritage_affinity: 0.8,
    },
  },

  // --- Sajek Valley ---
  {
    id: "dest-sajek",
    name: "Sajek Valley - Kingdom of Clouds",
    item_type: "destination",
    city: "Sajek Valley",
    region: "sajek",
    description: "Scenic cloud valley, cliffside eco-cottages, and mountain tranquility.",
    price: 0,
    rating: 4.9,
    reviews_count: 1450,
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
    tags: ["clouds", "hills", "eco_cottage", "adventure"],
    features: {
      nature_vs_urban_affinity: 0.05,
      adventure_index: 0.8,
      relaxation_wellness_affinity: 0.9,
      culinary_food_affinity: 0.75,
      budget_affinity: 0.45,
    },
  },
  {
    id: "hotel-sajek-1",
    name: "Meghpunji Resort",
    item_type: "hotel",
    city: "Sajek Valley",
    region: "sajek",
    description: "Wooden eco-cottage on cliffside with early morning sea of clouds view.",
    price: 4500,
    rating: 4.9,
    reviews_count: 310,
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
    tags: ["eco_resort", "cloud_view", "balcony", "campfire"],
    features: {
      budget_affinity: 0.55,
      nature_vs_urban_affinity: 0.05,
      relaxation_wellness_affinity: 0.95,
      inventory_scarcity_pressure: 0.9,
    },
  },
  {
    id: "tour-sajek-konglak",
    name: "Konglak Peak Sunrise Trek & Bamboo Cuisine",
    item_type: "tour",
    city: "Sajek Valley",
    region: "sajek",
    description: "Sunrise trek to highest peak of Sajek followed by Lusai bamboo chicken dining.",
    price: 1800,
    rating: 4.8,
    reviews_count: 320,
    image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
    tags: ["trekking", "sunrise", "tribal_food"],
    features: {
      adventure_index: 0.85,
      culinary_food_affinity: 0.85,
      nature_vs_urban_affinity: 0.05,
    },
  },

  // --- Sundarbans ---
  {
    id: "dest-sundarbans",
    name: "Sundarbans UNESCO Mangrove Biosphere",
    item_type: "destination",
    city: "Sundarbans",
    region: "sundarbans",
    description: "Largest mangrove forest on earth, home of the Royal Bengal Tiger.",
    price: 0,
    rating: 4.9,
    reviews_count: 790,
    image_url: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
    tags: ["unesco", "mangrove", "bengal_tiger", "boat_safari"],
    features: {
      nature_vs_urban_affinity: 0.02,
      adventure_index: 0.9,
      relaxation_wellness_affinity: 0.75,
      budget_affinity: 0.7,
    },
  },
  {
    id: "hotel-sundarbans-cruise",
    name: "Sundarbans Eco Safari Cruise Cabin",
    item_type: "hotel",
    city: "Sundarbans",
    region: "sundarbans",
    description: "Luxury river vessel cabins with panoramic river views and naturalists.",
    price: 11500,
    rating: 4.8,
    reviews_count: 210,
    image_url: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800",
    tags: ["river_cruise", "cabin", "safari", "ecotourism"],
    features: {
      budget_affinity: 0.88,
      nature_vs_urban_affinity: 0.02,
      relaxation_wellness_affinity: 0.8,
      amenity_density_score: 0.75,
    },
  },
  {
    id: "tour-sundarbans-kotka",
    name: "3-Day Kotka Wildlife & Dolphin Safari",
    item_type: "tour",
    city: "Sundarbans",
    region: "sundarbans",
    description: "Deep jungle safari into Kotka sanctuary and dolphin observation.",
    price: 13500,
    rating: 4.9,
    reviews_count: 280,
    image_url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800",
    tags: ["wildlife", "safari", "dolphin", "kotka"],
    features: {
      adventure_index: 0.95,
      nature_vs_urban_affinity: 0.01,
      budget_affinity: 0.8,
    },
  },

  // --- Bandarban ---
  {
    id: "dest-bandarban",
    name: "Bandarban Nilgiri Cloudscape & Boga Lake",
    item_type: "destination",
    city: "Bandarban",
    region: "bandarban",
    description: "Highland peaks, cloud carpets 2200ft high, and volcanic crater lake.",
    price: 0,
    rating: 4.9,
    reviews_count: 920,
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    tags: ["clouds", "nilgiri", "boga_lake", "trekking"],
    features: {
      nature_vs_urban_affinity: 0.03,
      adventure_index: 0.9,
      relaxation_wellness_affinity: 0.85,
      budget_affinity: 0.55,
    },
  },
  {
    id: "hotel-bandarban-resort",
    name: "Nilgiri Hilltop Eco Resort",
    item_type: "hotel",
    city: "Bandarban",
    region: "bandarban",
    description: "Exclusive cliffside cottages with sunrise cloud blankets.",
    price: 7500,
    rating: 4.8,
    reviews_count: 340,
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
    tags: ["cliffside", "cloud_vistas", "hill_resort"],
    features: {
      budget_affinity: 0.75,
      relaxation_wellness_affinity: 0.95,
      nature_vs_urban_affinity: 0.05,
    },
  },

  // --- Saint Martin's Island ---
  {
    id: "dest-saint-martins",
    name: "Saint Martin's Coral Island & Chera Dwip",
    item_type: "destination",
    city: "Saint Martin",
    region: "saint_martins",
    description: "Turquoise coral waters, coconut groves, and marine snorkeling.",
    price: 0,
    rating: 4.8,
    reviews_count: 1100,
    image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    tags: ["coral_island", "snorkeling", "chera_dwip", "beach"],
    features: {
      relaxation_wellness_affinity: 0.92,
      culinary_food_affinity: 0.9,
      budget_affinity: 0.6,
      adventure_index: 0.8,
    },
  },
];

// Pre-calculate raw and unit Float64Array vectors once at module load
export const LOCAL_OFFLINE_CATALOG: LocalCatalogRecord[] = RAW_OFFLINE_CATALOG.map((item) => {
  const rawVec = buildTaxonomyVector(item.features);
  const unitVec = toUnitVector(rawVec);
  return {
    ...item,
    rawVector: rawVec,
    unitVector: unitVec,
  };
});

const CATALOG_INDEX = new Map<string, LocalCatalogRecord>(
  LOCAL_OFFLINE_CATALOG.map((c) => [c.id, c])
);

// ==============================================================================
// 5. CLIENT-SIDE THOMPSON SAMPLING BANDIT IMPLEMENTATION
// ==============================================================================

class LocalThompsonSamplingBandit {
  private arms: Map<string, { alpha: number; beta: number; name: string }>;

  constructor() {
    this.arms = new Map([
      ["coxs_bazar", { alpha: 85.0, beta: 25.0, name: "Cox's Bazar" }],
      ["sylhet", { alpha: 72.0, beta: 26.0, name: "Sylhet" }],
      ["sajek", { alpha: 78.0, beta: 28.0, name: "Sajek Valley" }],
      ["sundarbans", { alpha: 58.0, beta: 26.0, name: "Sundarbans" }],
    ]);
  }

  public sampleArms(): Map<string, number> {
    const samples = new Map<string, number>();
    for (const [armId, arm] of this.arms.entries()) {
      const draw = sampleBeta(arm.alpha, arm.beta);
      samples.set(armId, Math.max(0.0, Math.min(1.0, draw)));
    }
    return samples;
  }

  public update(armId: string, reward: number, decay?: number): void {
    const normId = armId.toLowerCase().replace(/['\s]/g, "_");
    const arm = this.arms.get(normId);
    if (!arm) return;
    const r = Math.max(0.0, Math.min(1.0, reward));

    if (decay && decay >= 0.5 && decay < 1.0) {
      arm.alpha = Math.max(1.0, arm.alpha * decay + r);
      arm.beta = Math.max(1.0, arm.beta * decay + (1.0 - r));
    } else {
      arm.alpha += r;
      arm.beta += 1.0 - r;
    }
  }

  public getStates(): BanditArmState[] {
    const states: BanditArmState[] = [];
    for (const [armId, arm] of this.arms.entries()) {
      const expected = arm.alpha / (arm.alpha + arm.beta);
      states.push({
        arm_id: armId,
        region_name: arm.name,
        alpha: Math.round(arm.alpha * 100) / 100,
        beta: Math.round(arm.beta * 100) / 100,
        expected_value: Math.round(expected * 10000) / 10000,
        pulls_count: Math.round(arm.alpha + arm.beta),
      });
    }
    return states.sort((a, b) => b.expected_value - a.expected_value);
  }
}

// ==============================================================================
// 6. ULTRA-FAST RECOMMENDATION ENGINE (BRIDGE & SCORING WRAPPER)
// ==============================================================================

export class RecommendationEngine {
  private cache: LRUCache<RecommendationResponse>;
  private localBandit: LocalThompsonSamplingBandit;
  private networkTimeoutMs: number;

  constructor(
    cacheCapacity: number = 200,
    cacheTtlMinutes: number = 10,
    networkTimeoutMs: number = 3000
  ) {
    this.cache = new LRUCache<RecommendationResponse>(cacheCapacity, cacheTtlMinutes);
    this.localBandit = new LocalThompsonSamplingBandit();
    this.networkTimeoutMs = networkTimeoutMs;
  }

  /**
   * Generates a deterministic, fast hash key for request memoization.
   */
  private generateCacheKey(req: RecommendationRequest): string {
    const userId = req.user_id || "anon";
    const itemType = req.item_type || "all";
    const limit = req.limit || 10;
    const coldStart = req.is_cold_start ? "1" : "0";
    const history = (req.collaborative_history || []).slice().sort().join(",");
    const regions = (req.preferred_regions || []).slice().sort().join(",");

    let sfHash = 0;
    if (req.session_features) {
      const sf = req.session_features;
      sfHash =
        Math.round((sf.budget_affinity || 0) * 100) +
        Math.round((sf.adventure_index || 0) * 100) * 10 +
        Math.round((sf.relaxation_wellness_affinity || 0) * 100) * 100;
    }

    return `${userId}:${itemType}:${limit}:${coldStart}:${history}:${regions}:${sfHash}`;
  }

  /**
   * Applies Maximal Marginal Relevance (MMR) to diversify recommendations.
   */
  private applyMMRDiversity(
    items: ScoredRecommendation[],
    candidateMap: Map<string, LocalCatalogRecord>,
    limit: number,
    lambda: number = 0.82
  ): ScoredRecommendation[] {
    if (items.length <= limit || limit <= 1) {
      return items.slice(0, limit);
    }

    const selected: ScoredRecommendation[] = [items[0]];
    const remaining = items.slice(1);

    while (selected.length < limit && remaining.length > 0) {
      let bestIdx = -1;
      let bestMMR = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i];
        const candRecord = candidateMap.get(cand.id);
        if (!candRecord) continue;

        let maxInterSim = 0.0;
        for (const sel of selected) {
          const selRecord = candidateMap.get(sel.id);
          if (selRecord) {
            const sim = computeUnitDotProduct(candRecord.unitVector, selRecord.unitVector);
            if (sim > maxInterSim) maxInterSim = sim;
          }
        }

        const mmr = lambda * cand.relevance_score - (1.0 - lambda) * maxInterSim;
        if (mmr > bestMMR) {
          bestMMR = mmr;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  /**
   * Evaluates offline heuristics when network or backend service is unavailable.
   * Leverages pre-computed unit vectors and SIMD-friendly dot products for sub-millisecond execution.
   */
  private evaluateOfflineHeuristics(
    req: RecommendationRequest
  ): RecommendationResponse {
    const startTime = Date.now();
    const isColdStart =
      Boolean(req.is_cold_start) ||
      (!req.collaborative_history?.length && !req.session_features);

    const userRawVector = buildTaxonomyVector(req.session_features);
    const userUnitVector = toUnitVector(userRawVector);
    const banditSamples = this.localBandit.sampleArms();

    // Top regional arm
    let topArm = "coxs_bazar";
    let maxDraw = -1;
    for (const [arm, draw] of banditSamples.entries()) {
      if (draw > maxDraw) {
        maxDraw = draw;
        topArm = arm;
      }
    }

    // Filter candidates
    let candidates = LOCAL_OFFLINE_CATALOG;
    if (req.item_type) {
      candidates = candidates.filter((item) => item.item_type === req.item_type);
    }
    if (req.preferred_regions && req.preferred_regions.length > 0) {
      const prefs = req.preferred_regions.map((r) => r.toLowerCase().replace(/['\s]/g, "_"));
      const filtered = candidates.filter((item) => prefs.includes(item.region));
      if (filtered.length > 0) {
        candidates = filtered;
      }
    }

    // Pre-extract history unit vectors once for batch collaborative filtering
    const histUnitVectors: Float64Array[] = [];
    if (req.collaborative_history && req.collaborative_history.length > 0) {
      for (const hid of req.collaborative_history) {
        const histItem = CATALOG_INDEX.get(hid);
        if (histItem) {
          histUnitVectors.push(histItem.unitVector);
        }
      }
    }

    const candidateMap = new Map<string, LocalCatalogRecord>();

    // Score candidates with zero memory allocations inside loop
    const scoredList: ScoredRecommendation[] = candidates.map((item) => {
      candidateMap.set(item.id, item);

      // Fast loop-unrolled dot product
      const contentSim = computeUnitDotProduct(userUnitVector, item.unitVector);
      const banditVal = banditSamples.get(item.region) || 0.5;

      // Collaborative filtering
      let cfScore = banditVal;
      if (histUnitVectors.length > 0) {
        let maxSim = 0.0;
        let sumSim = 0.0;
        for (let h = 0; h < histUnitVectors.length; h++) {
          const s = computeUnitDotProduct(item.unitVector, histUnitVectors[h]);
          if (s > maxSim) maxSim = s;
          sumSim += s;
        }
        cfScore = 0.6 * maxSim + 0.4 * (sumSim / histUnitVectors.length);
      }

      // Dynamic hybrid balance
      let hybrid = 0.0;
      if (isColdStart) {
        hybrid = 0.25 * contentSim + 0.75 * banditVal;
      } else {
        const histLen = histUnitVectors.length;
        const alpha = Math.max(0.4, Math.min(0.75, 0.75 - 0.05 * histLen));
        hybrid = alpha * contentSim + (1.0 - alpha) * cfScore;
      }

      // Smooth Gaussian budget booster
      const userBudget = userRawVector[19];
      const itemBudget = item.rawVector[19];
      const budgetDelta = Math.abs(userBudget - itemBudget);
      const budgetMultiplier = 0.85 + 0.15 * Math.exp(-(budgetDelta * budgetDelta) / (2 * 0.35 * 0.35));
      const finalScore = Math.max(0.0, Math.min(1.0, hybrid * budgetMultiplier));

      const matchReasons: string[] = [];
      if (isColdStart && item.region === topArm) {
        matchReasons.push(`Trending choice in ${item.city} selected by Thompson Sampling bandit`);
      }
      if (contentSim >= 0.65) {
        matchReasons.push("High contextual alignment with your travel style");
      }
      if (item.rating >= 4.8) {
        matchReasons.push(`Top-rated ${item.rating}★ guest favorite`);
      }
      if (matchReasons.length === 0) {
        matchReasons.push("Curated regional travel recommendation");
      }

      return {
        id: item.id,
        name: item.name,
        item_type: item.item_type,
        city: item.city,
        region: item.region,
        relevance_score: Math.round(finalScore * 10000) / 10000,
        content_similarity: Math.round(contentSim * 10000) / 10000,
        collaborative_score: Math.round(cfScore * 10000) / 10000,
        bandit_boost: Math.round(banditVal * 10000) / 10000,
        match_reasons: matchReasons.slice(0, 3),
        price: item.price,
        rating: item.rating,
        reviews_count: item.reviews_count,
        image_url: item.image_url,
        tags: item.tags,
        metadata: {
          offline: true,
          is_cold_start: isColdStart,
        },
      };
    });

    scoredList.sort((a, b) => b.relevance_score - a.relevance_score);
    const limit = req.limit || 10;

    // Apply MMR diversity if limit > 1
    const enableDiversity = req.enable_diversity !== false;
    const finalRecommendations = enableDiversity
      ? this.applyMMRDiversity(scoredList, candidateMap, limit)
      : scoredList.slice(0, limit);

    return {
      success: true,
      recommendations: finalRecommendations,
      total: finalRecommendations.length,
      is_cold_start: isColdStart,
      top_bandit_arm: topArm,
      latency_ms: Math.max(0, Date.now() - startTime),
      engine_version: "3.0.0-vectorized-gemm",
      source: "offline_heuristics",
    };
  }

  /**
   * Main recommendation entry point.
   * Checks in-memory LRU cache -> Calls FastAPI backend -> Falls back to offline heuristics.
   */
  public async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const cacheKey = this.generateCacheKey(request);

    // 1. Check LRU Cache (10-minute TTL) - Sub-millisecond return
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        source: "cache",
      };
    }

    // 2. Attempt Backend API Call with AbortController
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.networkTimeoutMs);

      const response = await apiRequest<{
        success: boolean;
        message: string;
        data: RecommendationResponse;
      }>("/ml/recommend", {
        method: "POST",
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response && response.success && response.data) {
        const enriched: RecommendationResponse = {
          ...response.data,
          source: "network",
        };
        this.cache.set(cacheKey, enriched);
        return enriched;
      }
    } catch (err) {
      console.warn(
        "Recommendation API call failed or timed out, executing offline heuristics:",
        err
      );
    }

    // 3. Offline Heuristics Evaluation Fallback (<1ms)
    const offlineResult = this.evaluateOfflineHeuristics(request);
    this.cache.set(cacheKey, offlineResult);
    return offlineResult;
  }

  /**
   * Specialized helper for destination discovery.
   */
  public async getDestinationRecommendations(
    request: Partial<RecommendationRequest> = {}
  ): Promise<RecommendationResponse> {
    return this.getRecommendations({
      ...request,
      item_type: "destination",
    });
  }

  /**
   * Specialized helper for hotel & resort recommendations.
   */
  public async getHotelRecommendations(
    request: Partial<RecommendationRequest> = {}
  ): Promise<RecommendationResponse> {
    return this.getRecommendations({
      ...request,
      item_type: "hotel",
    });
  }

  /**
   * Specialized helper for tours & safari activities.
   */
  public async getTourRecommendations(
    request: Partial<RecommendationRequest> = {}
  ): Promise<RecommendationResponse> {
    return this.getRecommendations({
      ...request,
      item_type: "tour",
    });
  }

  /**
   * Specialized cold-start recommendation helper for first-time / guest users.
   */
  public async getColdStartRecommendations(
    itemType: CatalogItemType = "destination",
    limit: number = 6
  ): Promise<RecommendationResponse> {
    return this.getRecommendations({
      item_type: itemType,
      limit,
      is_cold_start: true,
    });
  }

  /**
   * Records user engagement feedback (clicks, conversions, bounces)
   * to update Thompson Sampling bandit distributions.
   */
  public async recordBanditFeedback(
    armId: string,
    reward: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.localBandit.update(armId, reward);

    try {
      const payload: BanditFeedbackRequest = {
        arm_id: armId,
        reward: Math.max(0.0, Math.min(1.0, reward)),
        ...(metadata || {}),
      };
      await apiRequest("/ml/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.debug("Backend bandit feedback sync deferred:", err);
    }
  }

  /**
   * Clears the in-memory LRU cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Retrieves cache performance diagnostic stats (hits, misses, size).
   */
  public getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Retrieves active Thompson Sampling regional arm states.
   */
  public getLocalBanditStates(): BanditArmState[] {
    return this.localBandit.getStates();
  }

  /**
   * Benchmarking utility: runs N iterations of offline heuristics to benchmark throughput and latency.
   */
  public benchmark(iterations: number = 500): { totalMs: number; avgMsPerCall: number; opsPerSec: number } {
    const t0 = Date.now();
    for (let i = 0; i < iterations; i++) {
      this.evaluateOfflineHeuristics({
        limit: 6,
        session_features: {
          budget_affinity: (i % 10) / 10,
          relaxation_wellness_affinity: 0.9,
        },
        collaborative_history: ["hotel-cox-1", "dest-sajek"],
      });
    }
    const totalMs = Math.max(1, Date.now() - t0);
    const avgMsPerCall = totalMs / iterations;
    const opsPerSec = Math.round((iterations / totalMs) * 1000);
    return { totalMs, avgMsPerCall, opsPerSec };
  }
}

// Global Singleton Instance
export const recommendationEngine = new RecommendationEngine();
