// ─── LLM Provider Interfaces ───────────────────────────────────────────────

export type AIProviderId = "gemini" | "openai" | "claude";
export type AIProvider = AIProviderId;

export interface LLMCompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
  responseMimeType?: "application/json" | "text/plain";
}

export interface LLMResponse {
  text: string;
  provider: AIProviderId;
  model: string;
  tokensUsed?: number;
}

export interface ILLMProvider {
  readonly id: AIProviderId;
  readonly defaultModel: string;
  isAvailable(): boolean;
  complete(options: LLMCompletionOptions): Promise<LLMResponse>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse<T = string> {
  data: T;
  raw: string;
  provider: AIProviderId;
  tokensUsed?: number;
}

// ─── Travel Planning Domain Types ────────────────────────────────────────────

export type TravelStyle = "solo" | "couple" | "family" | "luxury" | "backpacker";
export type BudgetLevel = "budget" | "moderate" | "luxury" | "custom";
export type Currency = "BDT" | "USD";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface TripActivity {
  time: string;
  activity: string;
  location: string;
  coordinates?: GeoCoordinates;
  duration?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface TripMeal {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  suggestion: string;
  dishName?: string;
  restaurant?: string;
  estimatedCost?: number;
}

export interface TripDay {
  day: number;
  date?: string;
  title?: string;
  theme: string;
  description?: string;
  activities: TripActivity[];
  meals: TripMeal[];
  accommodation?: string;
  dailyCost?: number;
}

export interface BudgetCategoryBreakdown {
  category: "Hotel" | "Transport" | "Food" | "Activities" | string;
  estimated: number;
  percentage: number;
  tips: string;
}

export interface BudgetBreakdown {
  totalBudget: number;
  currency: Currency;
  perPersonPerDay: number;
  hotel: BudgetCategoryBreakdown;       // 40%
  transport: BudgetCategoryBreakdown;   // 30%
  food: BudgetCategoryBreakdown;        // 20%
  activities: BudgetCategoryBreakdown;  // 10%
  savingTips?: string[];
  warnings?: string[];
}

export interface TripPlan {
  id?: string;
  title: string;
  summary: string;
  destination: string;
  origin?: string;
  durationDays: number;
  travelStyle: TravelStyle;
  budgetLevel?: BudgetLevel;
  currency: Currency;
  totalEstimatedCost: number;
  estimatedCost?: string;
  budget: BudgetBreakdown;
  days: TripDay[];
  tips: string[];
  packingChecklist?: string[];
  isFallback?: boolean;
  providerUsed?: AIProviderId | "curated_fallback";
  generatedAt?: string;
}

export interface TripPlannerEngineRequest {
  origin: string;
  destination: string;
  durationDays: number;
  travelStyle: TravelStyle;
  budgetLevel: BudgetLevel;
  totalBudget: number;
  currency: Currency;
  travelers: number;
  interests: string[];
  startDate?: string;
  endDate?: string;
  notes?: string;
}

// ─── Legacy Compatibility Types ──────────────────────────────────────────────

export interface TripPlanRequest {
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  travelers: number;
  interests: string[];
  budget?: number;
  currency?: string;
  travelStyle?: TravelStyle;
  durationDays?: number;
}

export interface BudgetPlanRequest {
  destination: string;
  durationDays: number;
  travelers: number;
  totalBudget: number;
  currency: string;
  travelStyle: "budget" | "mid-range" | "luxury" | TravelStyle;
  includeFlights?: boolean;
}

export interface BudgetCategory {
  category: string;
  estimated: number;
  percentage: number;
  tips: string;
}

export interface BudgetPlan {
  totalBudget: number;
  currency: string;
  perPersonPerDay: number;
  breakdown: BudgetCategory[];
  savingTips: string[];
  warnings: string[];
}

export interface ConciergeRequest {
  context: {
    destination?: string;
    checkIn?: string;
    checkOut?: string;
    bookingReference?: string;
    duration?: string;
    travelStyle?: string;
    budget?: string;
    travelers?: string;
    origin?: string;
    [key: string]: string | undefined;
  };
  question: string;
  conversationHistory?: ChatMessage[];
}

export interface ConciergeResponse {
  answer: string;
  suggestions?: string[];
  actionable?: Array<{ label: string; action: string }>;
}

export interface RoutePlanRequest {
  origin: string;
  destination: string;
  waypoints?: string[];
  travelMode: "flight" | "train" | "bus" | "car" | "mixed";
  preferenceNotes?: string;
}

export interface RouteSegment {
  from: string;
  to: string;
  mode: string;
  duration: string;
  estimatedCost: string;
  notes: string;
}

export interface RoutePlan {
  totalDistance: string;
  totalDuration: string;
  totalCost: string;
  segments: RouteSegment[];
  alternatives: string[];
  bestTimeToTravel: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AssistantSession {
  sessionId: string;
  userId: string;
  context: Record<string, unknown>;
  messages: AssistantMessage[];
}

export interface TravelAssistantRequest {
  message: string;
  history?: ChatMessage[];
  context?: Record<string, unknown>;
}
