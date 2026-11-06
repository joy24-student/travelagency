"""Pydantic v2 schemas package."""

from app.schemas.common import ApiResponse, BaseSchema, PaginatedResponse, PaginationParams
from app.schemas.user import CurrentUser, UserProfileResponse, UserRole
from app.schemas.hotel import HotelResponse, HotelRoomResponse, HotelSearchQuery, HotelSearchResponse
from app.schemas.flight import FlightResponse, FlightSeatResponse, FlightSearchQuery, FlightSearchResponse
from app.schemas.booking import (
    BookingCreateRequest,
    BookingItemCreate,
    BookingItemResponse,
    BookingPassengerCreate,
    BookingPassengerResponse,
    BookingPaymentResponse,
    BookingResponse,
    BookingStatus,
    BookingStatusUpdateRequest,
    ProductType,
)
from app.schemas.ai import Activity, BudgetCategory, MealSuggestion, PlanTripRequest, StructuredTripPlan, TripDay
from app.schemas.storage import AllowedEntityType, PresignedUploadRequest, PresignedUploadResponse
from app.schemas.payment import (
    BkashWebhookPayload,
    NagadWebhookPayload,
    PaymentInitiateRequest,
    PaymentResponse,
    WebhookResponse,
)

__all__ = [
    "ApiResponse",
    "BaseSchema",
    "PaginatedResponse",
    "PaginationParams",
    "CurrentUser",
    "UserProfileResponse",
    "UserRole",
    "HotelResponse",
    "HotelRoomResponse",
    "HotelSearchQuery",
    "HotelSearchResponse",
    "FlightResponse",
    "FlightSeatResponse",
    "FlightSearchQuery",
    "FlightSearchResponse",
    "BookingCreateRequest",
    "BookingItemCreate",
    "BookingItemResponse",
    "BookingPassengerCreate",
    "BookingPassengerResponse",
    "BookingPaymentResponse",
    "BookingResponse",
    "BookingStatus",
    "BookingStatusUpdateRequest",
    "ProductType",
    "Activity",
    "BudgetCategory",
    "MealSuggestion",
    "PlanTripRequest",
    "StructuredTripPlan",
    "TripDay",
    "AllowedEntityType",
    "PresignedUploadRequest",
    "PresignedUploadResponse",
    "BkashWebhookPayload",
    "NagadWebhookPayload",
    "PaymentInitiateRequest",
    "PaymentResponse",
    "WebhookResponse",
]
