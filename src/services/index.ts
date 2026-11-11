export { authService } from "./auth";
export * from "./repositories";

// Payment
export { paymentService } from "./paymentService";
export type {
  PaymentMethod,
  PaymentStatus,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  IPaymentProvider,
} from "./payment/types";
export { ShopnoWalletProvider } from "./payment/shopnoWallet";

// AI — all from ai/index.ts which itself re-exports from aiExtensions
export {
  tripPlannerService,
  budgetPlannerService,
  conciergeService,
  routePlannerService,
  travelAssistantService,
  destinationFinderService,
  packageRecommendationService,
  weatherAssistantService,
  scamDetectionService,
  reviewAnalyzerService,
  groupMatcherService,
} from "./ai";

export type {
  AIProvider,
  AIResponse,
  ChatMessage,
  TripPlanRequest,
  TripPlan,
  TripDay,
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
} from "./ai";

// Critical Safety & Emergency Systems
export { sosService } from "./safety/sosService";
export type {
  GeoCoordinates,
  EmergencyContact,
  EmergencyFacility,
  EmergencyFacilityType,
  MedicalPhrase,
  MedicalPhraseCategory,
  EmbassyContact,
  SOSDispatchResult,
} from "./safety/sosService";

// Event Bus & Screen Collaboration
export {
  appEventBus,
  APP_EVENTS,
  BOOKING_STATUS_CHANGED,
  ITINERARY_UPDATED,
  WEATHER_ALERT_TRIGGERED,
  PAYMENT_COMPLETED,
  CURRENCY_CHANGED,
} from "./events";
export type {
  AppEventType,
  AppEventKey,
  AppEventPayloadMap,
  BookingStatusChangedPayload,
  ItineraryUpdatedPayload,
  WeatherAlertTriggeredPayload,
  PaymentCompletedPayload,
  CurrencyChangedPayload,
  EventListener,
  WildcardListener,
  UnsubscribeFunction,
  SubscribeOptions,
  PublishOptions,
} from "./events";

// Gamification & Mystery Box
export {
  mysteryBoxService,
  MysteryBoxService,
  REWARD_CATALOG,
  STREAK_CYCLE_CONFIG,
} from "./gamification/mysteryBoxService";
export type {
  RewardTier,
  RewardCategory,
  RewardDiscountType,
  MysteryReward,
  StreakDayInfo,
  StreakStatus,
  WalletVoucher,
  UnboxResult,
} from "./gamification/mysteryBoxService";

// Vision & Offline AR Landmark Recognition
export {
  offlineNeuralLandmarkEngine,
  HISTORICAL_LANDMARKS,
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
} from "./vision/landmarkRecognition";
export type {
  Landmark,
  LandmarkId,
  RecognitionResult,
  RecognitionCandidate,
  Model3DData,
  Hotspot3D,
  TicketPricing,
  AudioGuideData,
  VisualFeatureProfile,
} from "./vision/landmarkRecognition";

// Machine Learning & Recommendation Systems
export {
  recommendationEngine,
  RecommendationEngine,
  LRUCache,
  ORDERED_TAXONOMY_KEYS,
  DEFAULT_TAXONOMY,
  buildTaxonomyVector,
  computeCosineSimilarity as computeMLCosineSimilarity,
  sampleBeta,
} from "./ml";
export type {
  CatalogItemType as MLCatalogItemType,
  RecommendationFeatureTaxonomy,
  ScoredRecommendation,
  RecommendationRequest as MLRecommendationRequest,
  RecommendationResponse as MLRecommendationResponse,
  BanditArmState,
  BanditFeedbackRequest,
  CacheStats,
} from "./ml";

// Enterprise PDF Generator & B2B Solutions
export * from "./pdf/itineraryPdfGenerator";

// NLP Sentiment & Dynamic Vibe Analytics
export * from "./nlp/sentimentService";

// Resilient Offline Guide & Survival Vault Service
export * from "./offline/offlineGuideService";

// Mobile Navigation & Universal Deep Linking Engine
export * from "./navigation/deepLinkingService";





