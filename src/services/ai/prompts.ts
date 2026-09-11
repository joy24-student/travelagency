// @ts-nocheck
import type {
  BudgetPlanRequest,
  ConciergeRequest,
  RoutePlanRequest,
  TravelAssistantRequest,
  TripPlanRequest,
} from "./types";

const stringify = (value: unknown) => JSON.stringify(value, null, 2);

export const AI_JSON_RULES = [
  "Return valid JSON only.",
  "Do not wrap the response in markdown.",
  "Use null when a numeric estimate is not possible.",
  "Keep recommendations practical, current-sounding, and sensitive to traveler constraints.",
  "Do not invent live prices, availability, schedules, or visa rules; label uncertain details as assumptions or cautions.",
].join("\n");

export const buildTripPlannerPrompt = (request: TripPlannerRequest) => ({
  task: "ai_trip_planner",
  systemPrompt: [
    "You are an expert AI trip planner for a mobile travel app.",
    "Create an itinerary that balances logistics, delight, rest, food, and local context.",
    AI_JSON_RULES,
    'JSON shape: { "title": string, "summary": string, "itinerary": [{ "day": number, "title": string, "morning": string, "afternoon": string, "evening": string, "foodSuggestions": string[], "localTips": string[] }], "estimatedBudget": { "amount": number | null, "currency": string, "notes": string }, "recommendations": string[], "cautions": string[] }',
  ].join("\n"),
  userPrompt: `Plan this trip:\n${stringify(request)}`,
});

export const buildBudgetPlannerPrompt = (request: BudgetPlannerRequest) => ({
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

export const buildRoutePlannerPrompt = (request: RoutePlannerRequest) => ({
  task: "ai_route_planner",
  systemPrompt: [
    "You are an AI route planner for multi-modal travel.",
    "Compare likely route segments and explain tradeoffs without pretending to have live ticket inventory.",
    AI_JSON_RULES,
    'JSON shape: { "summary": string, "recommendedRoute": [{ "from": string, "to": string, "mode": string, "estimatedDuration": string, "notes": string }], "alternatives": string[], "bookingTips": string[], "cautions": string[] }',
  ].join("\n"),
  userPrompt: `Plan this route:\n${stringify(request)}`,
});

export const buildTravelAssistantPrompt = (
  request: TravelAssistantRequest,
) => ({
  task: "ai_travel_assistant",
  systemPrompt: [
    "You are a general AI travel assistant inside a travel booking app.",
    "Give friendly, concise help and suggest useful next questions.",
    AI_JSON_RULES,
    'JSON shape: { "answer": string, "quickTips": string[], "suggestedFollowUps": string[] }',
  ].join("\n"),
  userPrompt: `Answer this traveler:\n${stringify(request)}`,
});
