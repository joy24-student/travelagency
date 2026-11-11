import { chat, parseJSON } from "./llm";
import type {
  AIResponse,
  BudgetBreakdown,
  BudgetPlan,
  BudgetPlanRequest,
  Currency,
  TravelStyle,
} from "./types";

export const USD_TO_BDT_RATE = 122.5;

/**
 * Currency conversion between BDT and USD
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "BDT") {
    return Math.round(amount * USD_TO_BDT_RATE);
  }
  if (from === "BDT" && to === "USD") {
    return Math.round((amount / USD_TO_BDT_RATE) * 10) / 10;
  }
  return amount;
}

/**
 * Distribute a total user budget (BDT / USD) across:
 * - Hotel: 40%
 * - Transport: 30%
 * - Food: 20%
 * - Activities: 10%
 */
export function calculateBudgetDistribution(
  totalBudget: number,
  currency: Currency = "USD",
  durationDays: number = 3,
  travelers: number = 1,
  travelStyle: TravelStyle = "couple"
): BudgetBreakdown {
  const safeBudget = Math.max(0, totalBudget);
  const safeDays = Math.max(1, durationDays);
  const safeTravelers = Math.max(1, travelers);

  const hotelAmount = Math.round(safeBudget * 0.4);
  const transportAmount = Math.round(safeBudget * 0.3);
  const foodAmount = Math.round(safeBudget * 0.2);
  const activitiesAmount = Math.round(safeBudget * 0.1);

  const perPersonPerDay = Math.round(safeBudget / (safeDays * safeTravelers));

  const isBdt = currency === "BDT";

  const savingTips: string[] = isBdt
    ? [
        "🏨 Book eco-resorts or certified guesthouses directly or through seasonal bKash/Nagad promotions.",
        "🚆 For intercity routes, book Bangladesh Railway e-tickets or AC chair coach passes 3-5 days in advance.",
        "🍲 Savor local culinary heritage (Kacchi biryani, fresh pomfret, local tea stalls) for high quality at lower expense.",
        "🎟️ Hire registered local eco-guides at tourist police checkpoints for fair group activity rates.",
      ]
    : [
        "🏨 Look for boutique accommodations with complimentary breakfast to reduce morning dining costs.",
        "🚆 Pick up a multi-day regional transit pass or high-speed rail saver pass for intercity hops.",
        "🍲 Try local market bistros for lunch when set menus ('menu du jour') are significantly cheaper.",
        "🎟️ Reserve museum and excursion combo passes online to skip queues and receive bundle discounts.",
      ];

  const warnings: string[] = [];
  if (isBdt && safeBudget < 5000 * safeDays) {
    warnings.push("Budget is tight for comfortable AC travel and private transport in Bangladesh.");
  } else if (!isBdt && safeBudget < 70 * safeDays * safeTravelers) {
    warnings.push("Daily budget per person is on the lower end for private accommodations.");
  }

  return {
    totalBudget: safeBudget,
    currency,
    perPersonPerDay,
    hotel: {
      category: "Hotel",
      estimated: hotelAmount,
      percentage: 40,
      tips: isBdt
        ? "Covers sea-facing or city-center stays, resort amenities, and service charges."
        : "Allocated for comfortable 3-4 star stays or boutique vacation rentals.",
    },
    transport: {
      category: "Transport",
      estimated: transportAmount,
      percentage: 30,
      tips: isBdt
        ? "Intercity flights/trains, private microbus/AC buses, CNG auto-rickshaws & ride-shares."
        : "Domestic flights, express rail passes, metro cards, and airport transfers.",
    },
    food: {
      category: "Food",
      estimated: foodAmount,
      percentage: 20,
      tips: isBdt
        ? "Three daily meals featuring authentic regional dishes, seafood, and fresh fruits."
        : "Daily breakfast, local lunch specials, authentic dinners, and cafe stops.",
    },
    activities: {
      category: "Activities",
      estimated: activitiesAmount,
      percentage: 10,
      tips: isBdt
        ? "National park fees, boat rides, historical monument tickets, and photography permits."
        : "Excursion admissions, guided cultural walking tours, and museum passes.",
    },
    savingTips,
    warnings,
  };
}

const SYSTEM_PROMPT = `You are a travel budget specialist.
Respond ONLY with a valid JSON object matching this schema exactly:
{
  "totalBudget": number,
  "currency": string,
  "perPersonPerDay": number,
  "breakdown": [
    { "category": "Hotel", "estimated": number, "percentage": 40, "tips": string },
    { "category": "Transport", "estimated": number, "percentage": 30, "tips": string },
    { "category": "Food", "estimated": number, "percentage": 20, "tips": string },
    { "category": "Activities", "estimated": number, "percentage": 10, "tips": string }
  ],
  "savingTips": string[],
  "warnings": string[]
}`;

export const budgetPlannerService = {
  /**
   * Generates budget plan using standard 40/30/20/10 ratio with AI context enhancement
   */
  async plan(request: BudgetPlanRequest): Promise<AIResponse<BudgetPlan>> {
    const currency = (request.currency === "BDT" ? "BDT" : "USD") as Currency;
    const duration = request.durationDays || 3;
    const travelers = request.travelers || 1;
    const total = request.totalBudget || (currency === "BDT" ? 30000 : 1000);

    // Baseline calculation based on the required 40/30/20/10 distribution
    const baseline = calculateBudgetDistribution(
      total,
      currency,
      duration,
      travelers,
      request.travelStyle as TravelStyle
    );

    try {
      const prompt = `Create a realistic travel budget breakdown for:
- Destination: ${request.destination}
- Duration: ${duration} days
- Travelers: ${travelers}
- Total budget: ${total} ${currency}
- Style: ${request.travelStyle}
- Include flights/long-distance: ${request.includeFlights ?? false}
Ensure the 4 categories strictly adhere to: Hotel (40%), Transport (30%), Food (20%), and Activities (10%).`;

      const result = await chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      const data = parseJSON<BudgetPlan>(result.raw);

      // Validate that breakdown categories exist
      if (data && Array.isArray(data.breakdown) && data.breakdown.length > 0) {
        return { ...result, data };
      }
    } catch {
      // Fallback to purely mathematical calculation if LLM is unavailable or malformed
    }

    const fallbackPlan: BudgetPlan = {
      totalBudget: total,
      currency,
      perPersonPerDay: baseline.perPersonPerDay,
      breakdown: [
        baseline.hotel,
        baseline.transport,
        baseline.food,
        baseline.activities,
      ],
      savingTips: baseline.savingTips || [],
      warnings: baseline.warnings || [],
    };

    return {
      data: fallbackPlan,
      raw: JSON.stringify(fallbackPlan),
      provider: "gemini",
    };
  },

  calculateDistribution: calculateBudgetDistribution,

  async estimateCost(
    destination: string,
    days: number,
    style: "budget" | "mid-range" | "luxury" | TravelStyle
  ): Promise<string> {
    try {
      const result = await chat([
        {
          role: "system",
          content: "You are a travel cost expert. Reply with a single concise sentence.",
        },
        {
          role: "user",
          content: `Estimate total cost for a ${style} traveler in ${destination} for ${days} days in USD or local currency.`,
        },
      ]);
      return result.raw.trim();
    } catch {
      const baseDailyRate = style === "luxury" ? 250 : style === "budget" ? 50 : 120;
      return `Estimated total cost for a ${days}-day ${style} trip to ${destination} is approximately $${baseDailyRate * days} USD.`;
    }
  },
};
