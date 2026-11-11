"""
Pydantic Schemas Package.
"""

from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.user import CurrentUser, UserProfileResponse, UserRole
from app.schemas.flight import (
    AirlineResponse,
    AirportResponse,
    FlightResponse,
    FlightSearchQuery,
    FlightSeatResponse,
)
from app.schemas.hotel import (
    HotelResponse,
    HotelRoomResponse,
    HotelSearchQuery,
)
from app.schemas.booking import (
    BookingCreateRequest,
    BookingItemCreate,
    BookingItemResponse,
    BookingPassengerCreate,
    BookingPassengerResponse,
    BookingResponse,
    BookingStatus,
    BookingStatusUpdateRequest,
    ProductType,
)
from app.schemas.payment import (
    BkashWebhookPayload,
    CardWebhookPayload,
    NagadWebhookPayload,
    PaymentInitiateRequest,
    PaymentResponse,
    RocketWebhookPayload,
    StripeWebhookPayload,
    WebhookResponse,
)
from app.schemas.storage import (
    AllowedEntityType,
    PresignedUploadRequest,
    PresignedUploadResponse,
)
from app.schemas.ai import (
    Activity,
    BudgetCategory,
    MealSuggestion,
    PlanTripRequest,
    StructuredTripPlan,
    TripDay,
)
from app.schemas.ml import (
    BanditArmState,
    BanditFeedbackRequest,
    CatalogItem,
    CatalogItemType,
    RecommendationFeatureTaxonomy,
    RecommendationRequest,
    RecommendationResponse,
    ScoredRecommendation,
)

__all__ = [
    "StandardResponse",
    "PaginatedResponse",
    "CurrentUser",
    "UserRole",
    "UserProfileResponse",
    "FlightSearchQuery",
    "FlightResponse",
    "FlightSeatResponse",
    "AirlineResponse",
    "AirportResponse",
    "HotelSearchQuery",
    "HotelResponse",
    "HotelRoomResponse",
    "ProductType",
    "BookingStatus",
    "BookingItemCreate",
    "BookingPassengerCreate",
    "BookingCreateRequest",
    "BookingResponse",
    "BookingItemResponse",
    "BookingPassengerResponse",
    "BookingStatusUpdateRequest",
    "PaymentInitiateRequest",
    "PaymentResponse",
    "BkashWebhookPayload",
    "NagadWebhookPayload",
    "RocketWebhookPayload",
    "StripeWebhookPayload",
    "CardWebhookPayload",
    "WebhookResponse",
    "AllowedEntityType",
    "PresignedUploadRequest",
    "PresignedUploadResponse",
    "PlanTripRequest",
    "StructuredTripPlan",
    "TripDay",
    "Activity",
    "MealSuggestion",
    "BudgetCategory",
    "BanditArmState",
    "BanditFeedbackRequest",
    "CatalogItem",
    "CatalogItemType",
    "RecommendationFeatureTaxonomy",
    "RecommendationRequest",
    "RecommendationResponse",
    "ScoredRecommendation",
]
