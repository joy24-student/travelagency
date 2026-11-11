/**
 * Conversational Search Parser & Semantic Search Client Hook.
 * Supports colloquial travel requests in English and Banglish (Bengali transliteration),
 * entity extraction, pre-computed vector embeddings for synonym expansion,
 * and debounced integration with useTravelStore.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTravelStore, TravelTab } from "../../store/travelStore";
import { apiRequest } from "../apiClient";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface ParsedDates {
  startDate?: string; // ISO YYYY-MM-DD
  endDate?: string;   // ISO YYYY-MM-DD
  relativeDate?: string; // e.g. "next weekend", "tomorrow"
}

export interface ParsedTravelIntent {
  rawQuery: string;
  normalizedQuery: string;
  language: "en" | "banglish" | "mixed";
  destination: string | null;
  origin: string | null;
  budget_max: number | null;
  budget_min: number | null;
  currency: string;
  duration_days: number | null;
  amenities: string[];
  dates: ParsedDates | null;
  traveler_count: number | null;
  vertical: TravelTab; // "flights" | "hotels" | "trains" | "tours"
  cabin_class?: string | null;
  vibes: string[];
  expandedTerms: Record<string, string[]>;
  confidence: number;
}

export interface UseSemanticSearchOptions {
  initialQuery?: string;
  debounceMs?: number; // Default 300ms
  autoApplyFilters?: boolean; // Default true: updates useTravelStore on parse
  autoExecuteSearch?: boolean; // Default false
  preferBackend?: boolean; // Default true: calls FastAPI /ai/parse-query with local fallback
  onParsed?: (intent: ParsedTravelIntent) => void;
}

export interface UseSemanticSearchResult {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  parsedIntent: ParsedTravelIntent | null;
  isParsing: boolean;
  error: Error | null;
  applyFilters: (customIntent?: ParsedTravelIntent) => void;
  parseNow: (queryText?: string) => Promise<ParsedTravelIntent>;
  clear: () => void;
}

// ============================================================================
// PRE-COMPUTED SEMANTIC VECTOR EMBEDDINGS (16-D Normalized Dense Vectors)
// ============================================================================

const SEMANTIC_VECTORS: Record<string, number[]> = {
  // Tranquility & Silence (Exact prompt match: 'quiet' -> 'peaceful', 'serene', 'isolated')
  quiet:           [1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  peaceful:        [0.985, 0.170, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  serene:          [0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  isolated:        [0.910, 0.415, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  tranquil:        [0.880, 0.475, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  calm:            [0.850, 0.527, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  secluded:        [0.820, 0.572, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  nirbili:         [0.800, 0.600, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  shanto:          [0.780, 0.626, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Budget & Affordability
  cheap:           [0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  budget:          [0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  affordable:      [0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  economical:      [0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "low-cost":      [0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "pocket-friendly":[0.000, 0.860, 0.510, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  sosta:           [0.000, 0.840, 0.543, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "kom dame":      [0.000, 0.820, 0.572, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Luxury & Quality
  luxury:          [0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  premium:         [0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  deluxe:          [0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "5-star":        [0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  bhalo:           [0.000, 0.000, 0.880, 0.475, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Coastal & Beach
  beach:           [0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  seaside:         [0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  coastal:         [0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  oceanfront:      [0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "sea view":      [0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  waterfront:      [0.000, 0.000, 0.000, 0.860, 0.510, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  somudro:         [0.000, 0.000, 0.000, 0.840, 0.543, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Aquatic & Pool
  pool:            [0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "swimming pool": [0.000, 0.000, 0.000, 0.000, 0.985, 0.173, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "infinity pool": [0.000, 0.000, 0.000, 0.000, 0.940, 0.341, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "heated pool":   [0.000, 0.000, 0.000, 0.000, 0.910, 0.415, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  jacuzzi:         [0.000, 0.000, 0.000, 0.000, 0.850, 0.527, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Launch & Boat
  launch:          [0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  boat:            [0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  cruise:          [0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  steamer:         [0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  ferry:           [0.000, 0.000, 0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  trawler:         [0.000, 0.000, 0.000, 0.000, 0.000, 0.850, 0.527, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Cabin & Berth
  cabin:           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "launch cabin":  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  "deck cabin":    [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  berth:           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  stateroom:       [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.880, 0.475, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

  // Lodging & Resort
  resort:          [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  retreat:         [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  villa:           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  cottage:         [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  lodge:           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  hotel:           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.860, 0.510, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
};

/**
 * Compute cosine similarity between two unit-normalized vectors.
 */
function dotProduct(vecA: number[], vecB: number[]): number {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

/**
 * Expands synonyms for a term using pre-computed vector embeddings.
 * For example: 'quiet' -> ['peaceful', 'serene', 'isolated', 'tranquil', 'calm'].
 */
export function expandSynonyms(
  term: string,
  topK: number = 5,
  minSimilarity: number = 0.70,
): string[] {
  const clean = term.toLowerCase().trim();
  const queryVec = SEMANTIC_VECTORS[clean];
  if (!queryVec) return [];

  const candidates: { word: string; score: number }[] = [];
  for (const [candWord, candVec] of Object.entries(SEMANTIC_VECTORS)) {
    if (candWord === clean) continue;
    const sim = dotProduct(queryVec, candVec);
    if (sim >= minSimilarity) {
      candidates.push({ word: candWord, score: sim });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK).map((c) => c.word);
}

// ============================================================================
// BANGLISH & ENGLISH LEXICON AND NORMALIZERS
// ============================================================================

const BANGLISH_DESTINATIONS: Record<string, string> = {
  // Sundarbans
  shundarbon: "Sundarbans",
  shundarban: "Sundarbans",
  sundarban: "Sundarbans",
  sundarbans: "Sundarbans",
  sundorbon: "Sundarbans",
  sundorban: "Sundarbans",

  // Cox's Bazar
  "coxs bazar": "Cox's Bazar",
  "cox bazar": "Cox's Bazar",
  coxsbazar: "Cox's Bazar",
  coxbazar: "Cox's Bazar",
  "kox bazar": "Cox's Bazar",
  koxbazar: "Cox's Bazar",
  koksbazar: "Cox's Bazar",
  cxb: "Cox's Bazar",

  // Sajek Valley
  sajek: "Sajek Valley",
  shajek: "Sajek Valley",
  "sajek valley": "Sajek Valley",
  "shajek valley": "Sajek Valley",

  // Sreemangal
  sreemangal: "Sreemangal",
  sreemongol: "Sreemangal",
  srimangal: "Sreemangal",
  srimongol: "Sreemangal",
  moulvibazar: "Sreemangal",

  // Sylhet
  sylhet: "Sylhet",
  shilhet: "Sylhet",
  silet: "Sylhet",

  // Saint Martin
  "saint martin": "Saint Martin",
  "sent martin": "Saint Martin",
  "st martin": "Saint Martin",
  "st. martin": "Saint Martin",
  sentmartin: "Saint Martin",
  saintmartin: "Saint Martin",
  "narikel jinjira": "Saint Martin",

  // Kuakata & Hill Tracts
  kuakata: "Kuakata",
  kuacata: "Kuakata",
  bandarban: "Bandarban",
  bandorban: "Bandarban",
  rangamati: "Rangamati",

  // Major Cities
  dhaka: "Dhaka",
  daka: "Dhaka",
  chittagong: "Chittagong",
  chattogram: "Chittagong",
  ctg: "Chittagong",
  rajshahi: "Rajshahi",
  khulna: "Khulna",
  barishal: "Barishal",
};

const AIRPORT_IATA_MAP: Record<string, string> = {
  "cox's bazar": "CXB",
  dhaka: "DAC",
  chittagong: "CGP",
  sylhet: "ZYL",
  rajshahi: "RJH",
  barishal: "BZL",
  saidpur: "SPD",
  jessore: "JSR",
};

const BANGLISH_NUMBERS: Record<string, number> = {
  ek: 1,
  dui: 2,
  tin: 3,
  char: 4,
  paach: 5,
  pach: 5,
  choy: 6,
  shat: 7,
  sat: 7,
  aat: 8,
  at: 8,
  noy: 9,
  noi: 9,
  dosh: 10,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const AMENITY_RULES: [RegExp, string][] = [
  [/\b(?:launch cabin|cabin|stateroom|berth)\b/i, "launch cabin"],
  [/\b(?:swimming pool|pool|pukur)\b/i, "pool"],
  [/\b(?:quiet|peaceful|serene|isolated|tranquil|nirbili|shanto|chupchap)\b/i, "quiet"],
  [/\b(?:beach|seaside|coastal|beach resort|somudro|shaikat)\b/i, "beach"],
  [/\b(?:resort|retreat|villa|cottage)\b/i, "resort"],
  [/\b(?:wifi|wi-fi|internet)\b/i, "wifi"],
  [/\b(?:ac|air condition|air conditioned)\b/i, "ac"],
  [/\b(?:breakfast|nasta|shokaler khabar|buffet)\b/i, "breakfast"],
  [/\b(?:sea view|ocean view|somudro view)\b/i, "sea view"],
  [/\b(?:hill view|mountain view|pahar view)\b/i, "hill view"],
  [/\b(?:gym|fitness|spa)\b/i, "gym"],
  [/\b(?:parking|garage)\b/i, "parking"],
  [/\b(?:bhalo|deluxe|luxury|5-star|premium)\b/i, "deluxe"],
];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ============================================================================
// CLIENT-SIDE PARSER IMPLEMENTATION (FAST / OFFLINE CAPABLE)
// ============================================================================

export function parseTravelQueryClient(
  query: string,
  referenceDate?: Date,
): ParsedTravelIntent {
  const ref = referenceDate || new Date();
  const normalized = query
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\w\s\-\.\,\']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Language detection
  const banglishTokens = [
    "shundarbon", "sundarban", "jonno", "diner", "bhalo", "valo", "takar",
    "moddhe", "jabo", "thakbe", "kaalke", "poroshu", "aajke", "shanto",
    "nirbili", "kom", "dame", "shostay", "sosta", "theke", "er", "kore",
    "somudro", "pahar", "nasta", "dujon", "tinjon", "ekjon",
  ];
  const words = normalized.split(/\s+/);
  const matchCount = words.filter((w) => banglishTokens.includes(w)).length;
  const language: "en" | "banglish" | "mixed" =
    matchCount >= 2 ? "banglish" : matchCount === 1 ? "mixed" : "en";

  // Traveler count
  let traveler_count: number | null = null;
  const mMergedJon = normalized.match(/\b(ek|dui|tin|char|paach|pach|choy|shat|aat|noy|dosh)jon\b/);
  if (mMergedJon) {
    traveler_count = BANGLISH_NUMBERS[mMergedJon[1]] || 1;
  } else {
    const mDigitJon = normalized.match(/\b(\d+)\s*jon\b/);
    if (mDigitJon) {
      traveler_count = parseInt(mDigitJon[1], 10);
    } else {
      const mAdults = normalized.match(/\b(?:for\s*)?(\d+)\s*(?:adults?|persons?|people|guests?|travelers?)\b/);
      if (mAdults) {
        traveler_count = parseInt(mAdults[1], 10);
      } else {
        const mForNum = normalized.match(/\bfor\s+(\d+)\b/);
        if (mForNum) {
          traveler_count = parseInt(mForNum[1], 10);
        } else if (/\b(?:couple|dujon|two of us)\b/.test(normalized)) {
          traveler_count = 2;
        } else if (/\b(?:solo|alone|single|ekjon)\b/.test(normalized)) {
          traveler_count = 1;
        } else if (/\b(?:family)\b/.test(normalized)) {
          traveler_count = 4;
        }
      }
    }
  }

  // Duration days
  let duration_days: number | null = null;
  const mEnDays = normalized.match(/\b(\d+)\s*[-\s]?\s*days?\b/);
  if (mEnDays) {
    duration_days = parseInt(mEnDays[1], 10);
  } else {
    const mBnDays = normalized.match(/\b(\d+)\s*(?:diner|din)(?:\s*jonno)?\b/);
    if (mBnDays) {
      duration_days = parseInt(mBnDays[1], 10);
    } else {
      const mWordDin = normalized.match(
        /\b(ek|dui|tin|char|paach|pach|choy|shat|aat|noy|dosh)\s*(?:diner|din)(?:\s*jonno)?\b/,
      );
      if (mWordDin) {
        duration_days = BANGLISH_NUMBERS[mWordDin[1]] || 1;
      } else {
        const mNights = normalized.match(/\b(\d+)\s*(?:nights?|raat|raater)\b/);
        if (mNights) {
          duration_days = parseInt(mNights[1], 10);
        } else {
          const mWeek = normalized.match(/\b(\d+)\s*(?:weeks?|soptaho)\b/);
          if (mWeek) {
            duration_days = parseInt(mWeek[1], 10) * 7;
          }
        }
      }
    }
  }

  // Budget extraction
  let budget_max: number | null = null;
  let budget_min: number | null = null;
  let currency = "BDT";
  if (/\b(?:usd|\$|dollars?)\b/.test(normalized)) currency = "USD";

  const mRange = normalized.match(
    /\b(\d+(?:\.\d+)?)\s*(?:k|hajar)?\s*(?:-|to|theke)\s*(\d+(?:\.\d+)?)\s*(?:k|hajar)?\s*(?:bdt|taka|takar|tk|\$)?\b/,
  );
  if (mRange) {
    let vMin = parseFloat(mRange[1]);
    let vMax = parseFloat(mRange[2]);
    if (mRange[0].includes("k")) {
      if (vMin < 100) vMin *= 1000;
      if (vMax < 100) vMax *= 1000;
    }
    budget_min = vMin;
    budget_max = vMax;
  } else {
    const mUnder = normalized.match(
      /\b(?:under|below|upto|within|max|kom|moddhe)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(k|hajar)?\s*(?:bdt|taka|takar|tk|\$)?\b/,
    );
    if (mUnder) {
      let val = parseFloat(mUnder[1]);
      if (mUnder[2] || val < 100) val *= 1000;
      budget_max = val;
    } else {
      const mSuffix = normalized.match(
        /\b(\d+(?:\.\d+)?)\s*(k|hajar)?\s*(?:bdt|taka|takar|tk)\s*(?:er\s*)?(?:moddhe|budget|porjonto)?\b/,
      );
      if (mSuffix) {
        let val = parseFloat(mSuffix[1]);
        if (mSuffix[2] === "k" || (val < 100 && mSuffix[2])) val *= 1000;
        budget_max = val;
      } else {
        const mK = normalized.match(/\b(?:under|within|max|below)\s*(\d+(?:\.\d+)?)\s*k\b/);
        if (mK) {
          budget_max = parseFloat(mK[1]) * 1000;
        } else if (/\b(?:cheap|budget|kom dame|sosta|shostay|pocket-friendly)\b/.test(normalized)) {
          budget_max = 5000;
        }
      }
    }
  }

  // Dates extraction
  let dates: ParsedDates | null = null;
  if (/\b(?:next\s+weekend|samner\s+weekend|porer\s+weekend)\b/.test(normalized)) {
    const dayOfWeek = ref.getDay(); // 0 is Sunday, 5 is Friday
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFriday <= 0) daysUntilFriday += 7;
    if (dayOfWeek >= 1 && dayOfWeek <= 4) daysUntilFriday += 7; // Following week
    const fri = new Date(ref);
    fri.setDate(ref.getDate() + daysUntilFriday);
    const sun = new Date(fri);
    sun.setDate(fri.getDate() + 2);
    dates = {
      startDate: formatDateISO(fri),
      endDate: formatDateISO(sun),
      relativeDate: "next weekend",
    };
  } else if (/\b(?:this\s+weekend|ei\s+weekend|weekend\s*e)\b/.test(normalized)) {
    const dayOfWeek = ref.getDay();
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const fri = new Date(ref);
    fri.setDate(ref.getDate() + daysUntilFriday);
    const sun = new Date(fri);
    sun.setDate(fri.getDate() + 2);
    dates = {
      startDate: formatDateISO(fri),
      endDate: formatDateISO(sun),
      relativeDate: "this weekend",
    };
  } else if (/\b(?:tomorrow|kaalke|kaal|agamikal)\b/.test(normalized)) {
    const tom = new Date(ref);
    tom.setDate(ref.getDate() + 1);
    dates = {
      startDate: formatDateISO(tom),
      relativeDate: "tomorrow",
    };
  } else if (/\b(?:today|aajke|aaj)\b/.test(normalized)) {
    dates = {
      startDate: formatDateISO(ref),
      relativeDate: "today",
    };
  } else if (/\b(?:next\s+week|samner\s+soptaho)\b/.test(normalized)) {
    const daysUntilMon = (8 - (ref.getDay() || 7)) % 7 || 7;
    const mon = new Date(ref);
    mon.setDate(ref.getDate() + daysUntilMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    dates = {
      startDate: formatDateISO(mon),
      endDate: formatDateISO(sun),
      relativeDate: "next week",
    };
  }

  // Destination & Origin
  let destination: string | null = null;
  let origin: string | null = null;

  const mRouteBn = normalized.match(/\b([a-zA-Z\s\']+)\s+theke\s+([a-zA-Z\s\']+)\b/);
  if (mRouteBn) {
    const candFrom = mRouteBn[1].trim();
    const candTo = mRouteBn[2].trim();
    for (const [key, canonical] of Object.entries(BANGLISH_DESTINATIONS)) {
      if (candFrom.includes(key)) origin = canonical;
      if (candTo.includes(key)) destination = canonical;
    }
  }

  if (!destination) {
    const sortedDestKeys = Object.keys(BANGLISH_DESTINATIONS).sort((a, b) => b.length - a.length);
    for (const key of sortedDestKeys) {
      const reg = new RegExp(`\\b${key}\\b`, "i");
      if (reg.test(normalized)) {
        destination = BANGLISH_DESTINATIONS[key];
        break;
      }
    }
  }

  if (!destination) {
    if (/\b(?:beach|seaside|ocean|somudro)\b/.test(normalized)) {
      destination = "Cox's Bazar";
    } else if (/\b(?:mangrove|jungle|bon)\b/.test(normalized)) {
      destination = "Sundarbans";
    } else if (/\b(?:tea garden|cha bagan)\b/.test(normalized)) {
      destination = "Sreemangal";
    } else if (/\b(?:cloud|pahar|pahari)\b/.test(normalized)) {
      destination = "Sajek Valley";
    }
  }

  // Amenities
  const amenities: string[] = [];
  for (const [regex, canonical] of AMENITY_RULES) {
    if (regex.test(normalized) && !amenities.includes(canonical)) {
      amenities.push(canonical);
    }
  }

  // Vibes
  const vibes: string[] = [];
  if (/\b(?:quiet|nirbili|shanto|chupchap)\b/.test(normalized)) vibes.push("quiet");
  if (/\b(?:luxury|bhalo|premium|5-star)\b/.test(normalized)) vibes.push("luxury");
  if (/\b(?:cheap|budget|sosta|kom dame)\b/.test(normalized)) vibes.push("cheap");
  if (/\b(?:romantic|couple|honeymoon)\b/.test(normalized)) vibes.push("romantic");

  // Vertical detection
  let vertical: TravelTab = "hotels";
  if (/\b(?:train|rail|railway|intercity|snigdha|shovan|station)\b/.test(normalized)) {
    vertical = "trains";
  } else if (/\b(?:flight|plane|airline|airport|air ticket|fly|biman)\b/.test(normalized)) {
    vertical = "flights";
  } else if (
    /\b(?:launch|nouka|trawler|steamer|cruise|safari|tour|trip)\b/.test(normalized) ||
    amenities.includes("launch cabin")
  ) {
    vertical = "tours";
  } else if (amenities.includes("pool") || amenities.includes("beach") || amenities.includes("resort") || amenities.includes("quiet")) {
    vertical = "hotels";
  }

  // Vector synonym expansion
  const expandedTerms: Record<string, string[]> = {};
  const termsToExpand = [...amenities, ...vibes];
  for (const t of termsToExpand) {
    const syns = expandSynonyms(t);
    if (syns.length > 0) {
      expandedTerms[t] = syns;
    }
  }

  return {
    rawQuery: query,
    normalizedQuery: normalized,
    language,
    destination,
    origin,
    budget_max,
    budget_min,
    currency,
    duration_days,
    amenities,
    dates,
    traveler_count: traveler_count || 1,
    vertical,
    cabin_class: normalized.includes("snigdha") ? "SNIGDHA" : null,
    vibes,
    expandedTerms,
    confidence: destination ? 0.95 : 0.85,
  };
}

// ============================================================================
// ASYNC SERVICE PARSER (API CALL WITH LOCAL FALLBACK)
// ============================================================================

export async function parseTravelQueryAsync(
  query: string,
  referenceDate?: string,
): Promise<ParsedTravelIntent> {
  try {
    const resp = await apiRequest<{
      success: boolean;
      data: {
        raw_query: string;
        normalized_query: string;
        language: "en" | "banglish" | "mixed";
        entities: {
          destination: string | null;
          origin: string | null;
          budget_max: number | null;
          budget_min: number | null;
          currency: string;
          duration_days: number | null;
          amenities: string[];
          dates: {
            start_date?: string;
            end_date?: string;
            relative_expression?: string;
          } | null;
          traveler_count: number | null;
          vertical: TravelTab;
          cabin_class?: string | null;
          vibes: string[];
        };
        expanded_synonyms: Record<string, string[]>;
        confidence: number;
      };
    }>("/ai/parse-query", {
      method: "POST",
      body: JSON.stringify({
        query,
        reference_date: referenceDate,
      }),
    });

    if (resp?.success && resp?.data?.entities) {
      const e = resp.data.entities;
      return {
        rawQuery: resp.data.raw_query,
        normalizedQuery: resp.data.normalized_query,
        language: resp.data.language,
        destination: e.destination,
        origin: e.origin,
        budget_max: e.budget_max,
        budget_min: e.budget_min,
        currency: e.currency,
        duration_days: e.duration_days,
        amenities: e.amenities,
        dates: e.dates
          ? {
              startDate: e.dates.start_date,
              endDate: e.dates.end_date,
              relativeDate: e.dates.relative_expression,
            }
          : null,
        traveler_count: e.traveler_count,
        vertical: e.vertical || "hotels",
        cabin_class: e.cabin_class,
        vibes: e.vibes || [],
        expandedTerms: resp.data.expanded_synonyms || {},
        confidence: resp.data.confidence,
      };
    }
  } catch (err) {
    // Graceful fallback to client-side rule & embedding parser
  }

  return parseTravelQueryClient(query);
}

// ============================================================================
// REACT CLIENT HOOK: useSemanticSearch
// Debounced at 300ms, mapping parsed intents into useTravelStore parameters
// ============================================================================

export function useSemanticSearch(
  options: UseSemanticSearchOptions = {},
): UseSemanticSearchResult {
  const {
    initialQuery = "",
    debounceMs = 300,
    autoApplyFilters = true,
    autoExecuteSearch = false,
    preferBackend = true,
    onParsed,
  } = options;

  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [parsedIntent, setParsedIntent] = useState<ParsedTravelIntent | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Maps parsed intent into useTravelStore filter parameters across tabs.
   */
  const applyFilters = useCallback(
    (customIntent?: ParsedTravelIntent) => {
      const intent = customIntent || parsedIntent;
      if (!intent) return;

      const store = useTravelStore.getState();

      if (intent.vertical === "hotels") {
        store.setActiveTab("hotels");
        store.setHotelFilters({
          city: intent.destination || store.hotelFilters.city,
          maxPrice: intent.budget_max ?? undefined,
          guestsCount: intent.traveler_count ?? store.hotelFilters.guestsCount,
          amenities: intent.amenities.length > 0 ? intent.amenities : undefined,
          checkInDate: intent.dates?.startDate || undefined,
          checkOutDate: intent.dates?.endDate || undefined,
        });
      } else if (intent.vertical === "tours") {
        store.setActiveTab("tours");
        store.setTourFilters({
          destination: intent.destination || undefined,
          maxPrice: intent.budget_max ?? undefined,
          durationDays: intent.duration_days ?? undefined,
        });
      } else if (intent.vertical === "flights") {
        store.setActiveTab("flights");
        const destCode =
          intent.destination && AIRPORT_IATA_MAP[intent.destination.toLowerCase()]
            ? AIRPORT_IATA_MAP[intent.destination.toLowerCase()]
            : store.flightFilters.destinationCode;
        const originCode =
          intent.origin && AIRPORT_IATA_MAP[intent.origin.toLowerCase()]
            ? AIRPORT_IATA_MAP[intent.origin.toLowerCase()]
            : store.flightFilters.originCode;

        store.setFlightFilters({
          destinationCode: destCode,
          originCode: originCode,
          passengers: intent.traveler_count ?? store.flightFilters.passengers,
          maxPrice: intent.budget_max ?? undefined,
          departureDate: intent.dates?.startDate || undefined,
          returnDate: intent.dates?.endDate || undefined,
        });
      } else if (intent.vertical === "trains") {
        store.setActiveTab("trains");
        store.setTrainFilters({
          departureCity: intent.origin || store.trainFilters.departureCity,
          arrivalCity: intent.destination || store.trainFilters.arrivalCity,
          date: intent.dates?.startDate || undefined,
          travelClass:
            intent.cabin_class === "SNIGDHA"
              ? "SNIGDHA"
              : store.trainFilters.travelClass,
        });
      }

      if (autoExecuteSearch) {
        store.executeSearch(intent.vertical);
      }
    },
    [parsedIntent, autoExecuteSearch],
  );

  /**
   * Execute immediate or forced parse.
   */
  const parseNow = useCallback(
    async (queryText?: string): Promise<ParsedTravelIntent> => {
      const targetQuery = queryText !== undefined ? queryText : query;
      if (!targetQuery.trim()) {
        const emptyIntent = parseTravelQueryClient("");
        setParsedIntent(emptyIntent);
        return emptyIntent;
      }

      setIsParsing(true);
      setError(null);

      try {
        let intent: ParsedTravelIntent;
        if (preferBackend) {
          intent = await parseTravelQueryAsync(targetQuery);
        } else {
          intent = parseTravelQueryClient(targetQuery);
        }

        setParsedIntent(intent);
        if (onParsed) onParsed(intent);
        if (autoApplyFilters) applyFilters(intent);

        return intent;
      } catch (err: any) {
        const fallback = parseTravelQueryClient(targetQuery);
        setParsedIntent(fallback);
        setError(err instanceof Error ? err : new Error(String(err)));
        if (autoApplyFilters) applyFilters(fallback);
        return fallback;
      } finally {
        setIsParsing(false);
      }
    },
    [query, preferBackend, onParsed, autoApplyFilters, applyFilters],
  );

  /**
   * Debounce effect: triggers parsing exactly 300ms after query changes.
   */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim()) {
        parseNow(query);
      } else {
        setParsedIntent(null);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, parseNow]);

  const clear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setParsedIntent(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    parsedIntent,
    isParsing,
    error,
    applyFilters,
    parseNow,
    clear,
  };
}
