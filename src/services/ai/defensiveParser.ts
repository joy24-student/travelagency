import { z } from "zod";
import type { TripPlan, BudgetBreakdown, TravelStyle, Currency } from "./types";

/**
 * Robust JSON extraction stripping markdown fences, preambles, and conversational text.
 */
export function extractJsonString(raw: string): string {
  if (!raw || typeof raw !== "string") return "{}";

  let cleaned = raw.trim();

  // Strip markdown code fences (e.g., ```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");

  // If there are multiple fences in the text, match the first fenced block
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Intelligent JSON Repair for truncated LLM outputs.
 * Closes unclosed quotes, trims trailing dangling commas, and closes open braces/brackets.
 */
export function repairTruncatedJSON(raw: string): string {
  let json = extractJsonString(raw);
  if (!json) return "{}";

  // First check if it parses as is
  try {
    JSON.parse(json);
    return json;
  } catch {
    // Continue with repair heuristics
  }

  let inString = false;
  let isEscaped = false;
  const stack: ("{" | "[")[] = [];

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (char === "\\" && inString) {
      isEscaped = !isEscaped;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
    }

    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}") {
        if (stack[stack.length - 1] === "{") stack.pop();
      } else if (char === "]") {
        if (stack[stack.length - 1] === "[") stack.pop();
      }
    }

    isEscaped = false;
  }

  // If cut off inside an open string, close it
  if (inString) {
    json += '"';
  }

  // Clean trailing commas or hanging colons before closing
  json = json.replace(/,\s*$/, "");
  json = json.replace(/:\s*$/, ': null');
  json = json.replace(/,\s*([}\]])/g, "$1");

  // Close remaining unclosed structures in reverse
  while (stack.length > 0) {
    const openType = stack.pop();
    if (openType === "{") {
      json += "}";
    } else if (openType === "[") {
      json += "]";
    }
  }

  return json;
}

// ─── Zod Schemas for Defensive Validation ────────────────────────────────────

const GeoCoordinatesSchema = z.object({
  latitude: z.coerce.number().default(21.4272),
  longitude: z.coerce.number().default(92.0058),
});

const TripActivitySchema = z.object({
  time: z.string().default("Morning"),
  activity: z.string().default("Explore local landmark"),
  location: z.string().default("City Center"),
  coordinates: GeoCoordinatesSchema.optional(),
  duration: z.string().optional(),
  estimatedCost: z.coerce.number().optional().default(0),
  notes: z.string().optional().default(""),
});

const TripMealSchema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("lunch"),
  suggestion: z.string().default("Local specialty"),
  dishName: z.string().optional(),
  restaurant: z.string().optional(),
  estimatedCost: z.coerce.number().optional().default(0),
});

const TripDaySchema = z.object({
  day: z.coerce.number().default(1),
  date: z.string().optional(),
  title: z.string().optional(),
  theme: z.string().default("Discovery and Exploration"),
  description: z.string().optional(),
  activities: z.array(TripActivitySchema).default([]),
  meals: z.array(TripMealSchema).default([]),
  accommodation: z.string().optional(),
  dailyCost: z.coerce.number().optional(),
});

const BudgetCategoryItemSchema = z.object({
  category: z.string().default("General"),
  estimated: z.coerce.number().default(0),
  percentage: z.coerce.number().default(25),
  tips: z.string().default(""),
});

const BudgetBreakdownSchema = z.object({
  totalBudget: z.coerce.number().default(1000),
  currency: z.enum(["BDT", "USD"]).default("USD"),
  perPersonPerDay: z.coerce.number().default(100),
  hotel: BudgetCategoryItemSchema.default({
    category: "Hotel",
    estimated: 400,
    percentage: 40,
    tips: "Book eco-friendly or centrally located stays",
  }),
  transport: BudgetCategoryItemSchema.default({
    category: "Transport",
    estimated: 300,
    percentage: 30,
    tips: "Use scenic train or verified rides",
  }),
  food: BudgetCategoryItemSchema.default({
    category: "Food",
    estimated: 200,
    percentage: 20,
    tips: "Enjoy authentic street food and local diners",
  }),
  activities: BudgetCategoryItemSchema.default({
    category: "Activities",
    estimated: 100,
    percentage: 10,
    tips: "Book activity passes and national park permits",
  }),
  savingTips: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export const TripPlanZodSchema = z.object({
  id: z.string().optional(),
  title: z.string().default("Customized Travel Itinerary"),
  summary: z.string().default("An unforgettable journey designed just for you."),
  destination: z.string().default("Destination"),
  origin: z.string().optional(),
  durationDays: z.coerce.number().default(3),
  travelStyle: z.enum(["solo", "couple", "family", "luxury", "backpacker"]).default("solo"),
  budgetLevel: z.enum(["budget", "moderate", "luxury", "custom"]).optional(),
  currency: z.enum(["BDT", "USD"]).default("USD"),
  totalEstimatedCost: z.coerce.number().default(0),
  estimatedCost: z.string().optional(),
  budget: BudgetBreakdownSchema.optional(),
  days: z.array(TripDaySchema).default([]),
  tips: z.array(z.string()).default([]),
  packingChecklist: z.array(z.string()).optional(),
  isFallback: z.boolean().optional(),
  providerUsed: z.any().optional(),
  generatedAt: z.string().optional(),
});

/**
 * Defensive JSON parse & Zod validation that NEVER crashes on malformed LLM responses.
 */
export function defensiveParseTripPlan(raw: string): {
  success: boolean;
  data: TripPlan | null;
  error?: string;
} {
  // Step 1: Clean and repair
  const repaired = repairTruncatedJSON(raw);

  let parsedObj: any = null;
  try {
    parsedObj = JSON.parse(repaired);
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: `JSON parse failed after repair attempt: ${err.message}`,
    };
  }

  // Step 2: Validate & Coerce with Zod
  const result = TripPlanZodSchema.safeParse(parsedObj);

  if (!result.success) {
    // If validation fails, try to salvage partial object with defaults
    try {
      const salvaged: TripPlan = {
        title: parsedObj?.title || "Custom Travel Itinerary",
        summary: parsedObj?.summary || "Curated itinerary for your trip.",
        destination: parsedObj?.destination || "Selected Destination",
        origin: parsedObj?.origin,
        durationDays: Number(parsedObj?.durationDays) || parsedObj?.days?.length || 3,
        travelStyle: (parsedObj?.travelStyle as TravelStyle) || "solo",
        currency: (parsedObj?.currency as Currency) || "USD",
        totalEstimatedCost: Number(parsedObj?.totalEstimatedCost) || 0,
        estimatedCost: parsedObj?.estimatedCost || `${parsedObj?.totalEstimatedCost || ""}`,
        budget: parsedObj?.budget || {
          totalBudget: Number(parsedObj?.totalEstimatedCost) || 1000,
          currency: (parsedObj?.currency as Currency) || "USD",
          perPersonPerDay: 100,
          hotel: { category: "Hotel", estimated: 400, percentage: 40, tips: "Centrally located stay" },
          transport: { category: "Transport", estimated: 300, percentage: 30, tips: "Local transit & trains" },
          food: { category: "Food", estimated: 200, percentage: 20, tips: "Authentic local eateries" },
          activities: { category: "Activities", estimated: 100, percentage: 10, tips: "Sightseeing and entry tickets" },
        },
        days: Array.isArray(parsedObj?.days)
          ? parsedObj.days.map((d: any, idx: number) => ({
              day: d.day || idx + 1,
              date: d.date,
              title: d.title,
              theme: d.theme || `Day ${idx + 1} Exploration`,
              activities: Array.isArray(d.activities) ? d.activities : [],
              meals: Array.isArray(d.meals) ? d.meals : [],
              accommodation: d.accommodation,
            }))
          : [],
        tips: Array.isArray(parsedObj?.tips) ? parsedObj.tips : [],
      };

      return {
        success: true,
        data: salvaged,
      };
    } catch {
      return {
        success: false,
        data: null,
        error: "Failed to construct valid itinerary schema from LLM output",
      };
    }
  }

  return {
    success: true,
    data: result.data as TripPlan,
  };
}
