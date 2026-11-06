import type {
  BudgetPlanRequest,
  ConciergeRequest,
  RoutePlanRequest,
  TravelAssistantRequest,
  TripPlanRequest,
  TripPlannerEngineRequest,
} from "./types";

const stringify = (val: unknown) => JSON.stringify(val, null, 2);

export const AI_JSON_RULES = [
  "CRITICAL: Output ONLY a single, valid JSON object.",
  "Do NOT wrap the output in markdown code blocks like ```json or ```.",
  "Do NOT include any conversational preamble, greetings, or sign-offs.",
  "Ensure all keys and string values are enclosed in valid double quotes.",
  "Ensure real, accurate latitude and longitude numbers are provided for geo-coordinates.",
  "Ensure the budget categories strictly conform to the 40/30/20/10 ratio: Hotel (40%), Transport (30%), Food (20%), and Activities (10%).",
].join("\n");

/**
 * Carefully engineered prompt for the AI Trip Planner & Itinerary Engine
 */
export const buildTripPlannerEnginePrompt = (request: TripPlannerEngineRequest) => {
  const isBdt = request.currency === "BDT";
  const currencySymbol = isBdt ? "BDT (৳)" : "USD ($)";

  const systemPrompt = `You are a Senior AI Travel Concierge and Geospatial Route Optimizer.
Generate a comprehensive, day-by-day travel itinerary with realistic timing, authentic local food recommendations, exact geo-coordinates, and a disciplined budget breakdown.

${AI_JSON_RULES}

STRICT JSON SCHEMA:
{
  "title": "string (Catchy, evocative trip title)",
  "summary": "string (2-3 sentences summarizing the journey, ambiance, and highlights)",
  "destination": "${request.destination}",
  "origin": "${request.origin || "Not specified"}",
  "durationDays": ${request.durationDays},
  "travelStyle": "${request.travelStyle}",
  "currency": "${request.currency}",
  "totalEstimatedCost": ${request.totalBudget},
  "budget": {
    "totalBudget": ${request.totalBudget},
    "currency": "${request.currency}",
    "perPersonPerDay": ${Math.round(request.totalBudget / (request.durationDays * (request.travelers || 1)))},
    "hotel": {
      "category": "Hotel",
      "estimated": ${Math.round(request.totalBudget * 0.4)},
      "percentage": 40,
      "tips": "string (Practical accommodation booking advice)"
    },
    "transport": {
      "category": "Transport",
      "estimated": ${Math.round(request.totalBudget * 0.3)},
      "percentage": 30,
      "tips": "string (Local commute, rail, rideshare or rental advice)"
    },
    "food": {
      "category": "Food",
      "estimated": ${Math.round(request.totalBudget * 0.2)},
      "percentage": 20,
      "tips": "string (Local cuisine, street food, and dining advice)"
    },
    "activities": {
      "category": "Activities",
      "estimated": ${Math.round(request.totalBudget * 0.1)},
      "percentage": 10,
      "tips": "string (Passes, entry fees, and excursion advice)"
    }
  },
  "days": [
    {
      "day": 1,
      "theme": "string (e.g. Coastal Arrival & Sunset by Kolatoli)",
      "activities": [
        {
          "time": "09:30 AM",
          "activity": "string (Specific activity description)",
          "location": "string (Specific landmark or venue)",
          "coordinates": {
            "latitude": 21.4272,
            "longitude": 92.0058
          },
          "estimatedCost": 0,
          "notes": "string (Insider tip, optimal arrival window, or photo spot)"
        }
      ],
      "meals": [
        {
          "type": "breakfast",
          "suggestion": "string (Specific dish and food recommendation)",
          "restaurant": "string (Recommended restaurant name)",
          "estimatedCost": 0
        },
        {
          "type": "lunch",
          "suggestion": "string",
          "restaurant": "string",
          "estimatedCost": 0
        },
        {
          "type": "dinner",
          "suggestion": "string",
          "restaurant": "string",
          "estimatedCost": 0
        }
      ],
      "accommodation": "string (Recommended hotel / stay name)"
    }
  ],
  "tips": [
    "string (Actionable local travel tips, cultural etiquette, safety)"
  ],
  "packingChecklist": [
    "string (Essential clothing and gear items)"
  ]
}`;

  const userPrompt = `Create an itinerary with the following specifications:
- Destination: ${request.destination}
- Starting From / Origin: ${request.origin || "Origin City"}
- Duration: ${request.durationDays} Days
- Travel Style: ${request.travelStyle} (e.g., solo, couple, family, luxury, or backpacker)
- Budget Level: ${request.budgetLevel}
- Total Budget: ${request.totalBudget} ${currencySymbol}
- Number of Travelers: ${request.travelers}
- Specific Interests: ${request.interests?.length > 0 ? request.interests.join(", ") : "Sightseeing, Local culture, Food exploration"}
${request.notes ? `- Traveler Notes: ${request.notes}` : ""}

Return valid JSON adhering strictly to the schema. Include all ${request.durationDays} days.`;

  return { systemPrompt, userPrompt };
};

// ─── Legacy Prompts (Retained for Backwards Compatibility) ─────────────────────

export const buildTripPlannerPrompt = (request: TripPlanRequest) => ({
  task: "ai_trip_planner",
  systemPrompt: [
    "You are an expert AI trip planner for a mobile travel app.",
    "Create an itinerary that balances logistics, delight, rest, food, and local context.",
    AI_JSON_RULES,
    'JSON shape: { "title": string, "summary": string, "itinerary": [{ "day": number, "title": string, "morning": string, "afternoon": string, "evening": string, "foodSuggestions": string[], "localTips": string[] }], "estimatedBudget": { "amount": number | null, "currency": string, "notes": string }, "recommendations": string[], "cautions": string[] }',
  ].join("\n"),
  userPrompt: `Plan this trip:\n${stringify(request)}`,
});

export const buildBudgetPlannerPrompt = (request: BudgetPlanRequest) => ({
  task: "ai_budget_planner",
  systemPrompt: [
    "You are an AI travel budget planner.",
    "Estimate major cost categories and explain assumptions clearly.",
    AI_JSON_RULES,
    'JSON shape: { "destination": string, "currency": string, "totalEstimate": number | null, "perPersonEstimate": number | null, "categories": [{ "name": string, "estimatedCost": number | null, "notes": string }], "savingTips": string[], "upgradeIdeas": string[], "assumptions": string[] }',
  ].join("\n"),
  userPrompt: `Create a travel budget:\n${stringify(request)}`,
});

export const buildConciergePrompt = (request: ConciergeRequest) => ({
  task: "ai_concierge",
  systemPrompt: [
    "You are an AI concierge for travelers already in or near a destination.",
    "Answer like a capable hotel concierge: concise, useful, and action-oriented.",
    AI_JSON_RULES,
    'JSON shape: { "answer": string, "suggestions": string[], "nextActions": string[], "cautions": string[] }',
  ].join("\n"),
  userPrompt: `Handle this concierge request:\n${stringify(request)}`,
});

export const buildRoutePlannerPrompt = (request: RoutePlanRequest) => ({
  task: "ai_route_planner",
  systemPrompt: [
    "You are an AI route planner for multi-modal travel.",
    "Compare likely route segments and explain tradeoffs without pretending to have live ticket inventory.",
    AI_JSON_RULES,
    'JSON shape: { "summary": string, "recommendedRoute": [{ "from": string, "to": string, "mode": string, "estimatedDuration": string, "notes": string }], "alternatives": string[], "bookingTips": string[], "cautions": string[] }',
  ].join("\n"),
  userPrompt: `Plan this route:\n${stringify(request)}`,
});

export const buildTravelAssistantPrompt = (request: TravelAssistantRequest) => ({
  task: "ai_travel_assistant",
  systemPrompt: [
    "You are a general AI travel assistant inside a travel booking app.",
    "Give friendly, concise help and suggest useful next questions.",
    AI_JSON_RULES,
    'JSON shape: { "answer": string, "quickTips": string[], "suggestedFollowUps": string[] }',
  ].join("\n"),
  userPrompt: `Answer this traveler:\n${stringify(request)}`,
});
