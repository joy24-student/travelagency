export { tripPlannerService, tripPlannerEngine, TripPlannerEngine } from "./tripPlanner";
export {
  budgetPlannerService,
  calculateBudgetDistribution,
  convertCurrency,
  USD_TO_BDT_RATE,
} from "./budgetPlanner";
export { conciergeService } from "./concierge";
export { routePlannerService } from "./routePlanner";
export { travelAssistantService } from "./travelAssistant";
export {
  destinationFinderService,
  packageRecommendationService,
  weatherAssistantService,
  scamDetectionService,
  reviewAnalyzerService,
  groupMatcherService,
} from "./aiExtensions";

export {
  GeminiProvider,
  OpenAIProvider,
  ClaudeProvider,
  LLMProviderRegistry,
  llmProviderRegistry,
  aiProviderClient,
} from "./providers";

export {
  defensiveParseTripPlan,
  extractJsonString,
  repairTruncatedJSON,
  TripPlanZodSchema,
} from "./defensiveParser";

export { getCuratedFallbackItinerary } from "./fallbacks";

export type {
  AIProvider,
  AIProviderId,
  ILLMProvider,
  LLMCompletionOptions,
  LLMResponse,
  ChatMessage,
  AIResponse,
  TravelStyle,
  BudgetLevel,
  Currency,
  GeoCoordinates,
  TripActivity,
  TripMeal,
  TripDay,
  BudgetCategoryBreakdown,
  BudgetBreakdown,
  TripPlan,
  TripPlannerEngineRequest,
  TripPlanRequest,
  BudgetPlanRequest,
  BudgetPlan,
  BudgetCategory,
  ConciergeRequest,
  ConciergeResponse,
  RoutePlanRequest,
  RoutePlan,
  RouteSegment,
  AssistantMessage,
  AssistantSession,
  TravelAssistantRequest,
} from "./types";

export type {
  DestinationFinderRequest,
  DestinationSuggestion,
  PackageRecommendationRequest,
  PackageRecommendation,
  WeatherQuery,
  WeatherForecast,
  ScamDetectionRequest,
  ScamAnalysis,
  ReviewAnalysisRequest,
  ReviewAnalysis,
  GroupMatchRequest,
  GroupMatch,
} from "./aiExtensions";

export {
  weatherAdaptivePlanner,
  calculateSolarPosition,
  classifyActivity,
  getDestinationGeo,
  getWeatherForecastForTrip,
  DESTINATION_COORDINATES,
  DESTINATION_INDOOR_ALTERNATIVES,
} from "./weatherAdaptivePlanner";

export type {
  HourlyForecast,
  DayWeatherForecast,
  SolarPosition,
  ActivityClassification,
  ScheduleModification,
  WeatherAlertInfo,
  WeatherOptimizationResult,
  WeatherOptimizationOptions,
} from "./weatherAdaptivePlanner";

