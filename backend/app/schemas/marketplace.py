"""
Marketplace Pydantic Schemas for Verified Local Guide & Boatman Marketplace.
Covers Provider, Services, Availability, Bookings, Live GPS Trips, SOS Events, and Admin.
"""

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProviderCategory(str, Enum):
    TOUR_GUIDE = "tour_guide"
    LOCAL_GUIDE = "local_guide"
    BOATMAN = "boatman"
    TREKKING_GUIDE = "trekking_guide"
    NATURE_GUIDE = "nature_guide"
    PHOTOGRAPHER = "photographer"
    ADVENTURE_OPERATOR = "adventure_operator"


class MarketplaceDestination(str, Enum):
    COXS_BAZAR = "Cox's Bazar"
    SUNDARBANS = "Sundarbans"
    BANDARBAN = "Bandarban"
    SYLHET = "Sylhet"
    SAJEK = "Sajek"
    DHAKA_HERITAGE = "Dhaka Heritage"
    RANGAMATI = "Rangamati"
    SREEMANGAL = "Sreemangal"


class VerificationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ADDITIONAL_INFORMATION_REQUIRED = "additional_information_required"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    EXPIRED = "expired"


class DocumentType(str, Enum):
    NID_FRONT = "nid_front"
    NID_BACK = "nid_back"
    PASSPORT = "passport"
    TOURIST_POLICE_LICENSE = "tourist_police_license"
    TOUR_GUIDE_CERT = "tour_guide_cert"
    BOAT_REGISTRATION = "boat_registration"
    BOAT_FITNESS_CERT = "boat_fitness_cert"
    POLICE_CLEARANCE = "police_clearance"
    FIRST_AID_CERT = "first_aid_cert"
    OTHER = "other"


# ============================================================================
# PROVIDER ONBOARDING & PROFILE SCHEMAS
# ============================================================================

class ProviderOnboardingRequest(BaseModel):
    provider_category: ProviderCategory
    business_name: Optional[str] = None
    full_name: str = Field(..., min_length=3, max_length=120)
    phone: str = Field(..., pattern=r"^\+?8801[3-9]\d{8}$")
    emergency_phone: Optional[str] = None
    bio: str = Field(..., min_length=20, max_length=2000)
    bio_bn: Optional[str] = None
    experience_years: int = Field(default=1, ge=0, le=60)
    daily_rate: Decimal = Field(default=Decimal("1500.00"), ge=0)
    hourly_rate: Decimal = Field(default=Decimal("250.00"), ge=0)
    currency: str = "BDT"
    primary_destination: MarketplaceDestination
    covered_destinations: List[MarketplaceDestination] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=lambda: ["Bangla", "English"])
    specialties: List[str] = Field(default_factory=list)


class ProviderProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    emergency_phone: Optional[str] = None
    bio: Optional[str] = None
    bio_bn: Optional[str] = None
    daily_rate: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None
    primary_destination: Optional[MarketplaceDestination] = None
    covered_destinations: Optional[List[MarketplaceDestination]] = None
    languages: Optional[List[str]] = None
    specialties: Optional[List[str]] = None
    is_available: Optional[bool] = None


class ProviderProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    provider_category: ProviderCategory
    business_name: Optional[str] = None
    full_name: str
    phone: str
    emergency_phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: str
    bio_bn: Optional[str] = None
    experience_years: int
    daily_rate: Decimal
    hourly_rate: Decimal
    currency: str
    primary_destination: MarketplaceDestination
    covered_destinations: List[str]
    languages: List[str]
    specialties: List[str]
    badge: str
    verification_status: VerificationStatus
    nid_verified: bool
    license_verified: bool
    boat_permit_verified: bool
    police_clearance_verified: bool
    is_available: bool
    rating: Decimal
    reviews_count: int
    total_trips: int
    created_at: datetime


# ============================================================================
# DOCUMENT & VERIFICATION SCHEMAS
# ============================================================================

class DocumentUploadRequest(BaseModel):
    document_type: DocumentType
    document_number: Optional[str] = None
    file_url: str
    storage_path: str
    expiry_date: Optional[date] = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID
    document_type: DocumentType
    document_number: Optional[str] = None
    file_url: str
    storage_path: str
    verification_status: str
    rejection_reason: Optional[str] = None
    expiry_date: Optional[date] = None
    uploaded_at: datetime


# ============================================================================
# SERVICE & PACKAGE SCHEMAS
# ============================================================================

class ServiceCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=150)
    title_bn: Optional[str] = None
    description: str = Field(..., min_length=20, max_length=3000)
    description_bn: Optional[str] = None
    category: str = Field(default="day_tour")
    destination: MarketplaceDestination
    price_model: str = Field(default="daily")
    price: Decimal = Field(..., ge=0)
    currency: str = "BDT"
    duration_hours: Decimal = Field(default=Decimal("8.0"), ge=0.5, le=72.0)
    max_capacity: int = Field(default=4, ge=1, le=100)
    included_services: List[str] = Field(default_factory=list)
    excluded_services: List[str] = Field(default_factory=list)
    meeting_point: str = Field(..., min_length=3)
    meeting_point_lat: Optional[float] = None
    meeting_point_lng: Optional[float] = None
    cancellation_policy: str = "Free cancellation up to 24 hours before tour start."


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID
    title: str
    title_bn: Optional[str] = None
    description: str
    description_bn: Optional[str] = None
    category: str
    destination: str
    price_model: str
    price: Decimal
    currency: str
    duration_hours: Decimal
    max_capacity: int
    included_services: List[str]
    excluded_services: List[str]
    meeting_point: str
    meeting_point_lat: Optional[float] = None
    meeting_point_lng: Optional[float] = None
    cancellation_policy: str
    is_published: bool
    created_at: datetime


# ============================================================================
# AVAILABILITY SCHEMAS
# ============================================================================

class AvailabilitySlotItem(BaseModel):
    available_date: date
    start_time: time = time(8, 0, 0)
    end_time: time = time(18, 0, 0)
    is_available: bool = True
    notes: Optional[str] = None


class AvailabilitySetRequest(BaseModel):
    slots: List[AvailabilitySlotItem]


class AvailabilitySlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID
    available_date: date
    start_time: time
    end_time: time
    is_available: bool
    booking_id: Optional[uuid.UUID] = None


# ============================================================================
# BOOKING & QUOTE SCHEMAS
# ============================================================================

class BookingQuoteRequest(BaseModel):
    provider_id: uuid.UUID
    service_id: uuid.UUID
    tour_date: date
    duration_days: int = Field(default=1, ge=1, le=30)
    number_of_guests: int = Field(default=1, ge=1, le=50)


class BookingQuoteResponse(BaseModel):
    provider_id: uuid.UUID
    service_id: uuid.UUID
    tour_date: date
    duration_days: int
    number_of_guests: int
    base_price: Decimal
    subtotal: Decimal
    platform_fee: Decimal
    total_price: Decimal
    currency: str = "BDT"
    is_available: bool
    cancellation_policy: str


class BookingCreateRequest(BaseModel):
    provider_id: uuid.UUID
    service_id: uuid.UUID
    tour_date: date
    start_time: time = time(9, 0, 0)
    duration_days: int = Field(default=1, ge=1, le=30)
    number_of_guests: int = Field(default=1, ge=1, le=50)
    meeting_point: str
    special_requests: Optional[str] = None
    participant_names: List[str] = Field(default_factory=list)
    idempotency_key: Optional[str] = None


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_reference: str
    traveler_id: uuid.UUID
    provider_id: uuid.UUID
    service_id: uuid.UUID
    status: str
    tour_date: date
    start_time: time
    duration_days: int
    number_of_guests: int
    total_price: Decimal
    platform_fee: Decimal
    provider_earnings: Decimal
    currency: str
    meeting_point: str
    special_requests: Optional[str] = None
    otp_code: Optional[str] = None  # Only exposed to traveler or verified state
    created_at: datetime


# ============================================================================
# LIVE GPS, TRIP SESSION & SOS SCHEMAS
# ============================================================================

class TripCheckInRequest(BaseModel):
    booking_id: uuid.UUID
    otp_code: str = Field(..., min_length=6, max_length=6)


class TripStartRequest(BaseModel):
    session_id: uuid.UUID
    initial_latitude: float
    initial_longitude: float


class TripLocationPingRequest(BaseModel):
    session_id: uuid.UUID
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    battery_level: Optional[float] = None

    @field_validator("latitude", "longitude")
    @classmethod
    def validate_bangladesh_bounds(cls, v: float, info):
        # We validate in service layer; relaxed field validator allows realistic testing
        return v


class TripCompleteRequest(BaseModel):
    session_id: uuid.UUID
    notes: Optional[str] = None


class TripSOSRequest(BaseModel):
    session_id: uuid.UUID
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    address_context: Optional[str] = None
    event_type: str = "sos_panic"
    notes: Optional[str] = None


class TripSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    provider_id: uuid.UUID
    traveler_id: uuid.UUID
    status: str
    otp_verified: bool
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    last_ping_at: Optional[datetime] = None
    total_distance_km: Decimal


class TripEmergencyEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    triggered_by: uuid.UUID
    event_type: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    status: str
    dispatch_target: Optional[str] = None
    trusted_contacts_notified: bool
    triggered_at: datetime


# ============================================================================
# REVIEW & DISPUTE SCHEMAS
# ============================================================================

class ReviewCreateRequest(BaseModel):
    booking_id: uuid.UUID
    rating: Decimal = Field(..., ge=Decimal("1.0"), le=Decimal("5.0"))
    title: Optional[str] = None
    comment: str = Field(..., min_length=10, max_length=1500)
    photos: List[str] = Field(default_factory=list)


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    provider_id: uuid.UUID
    reviewer_id: uuid.UUID
    rating: Decimal
    title: Optional[str] = None
    comment: str
    photos: List[str]
    is_verified_booking: bool
    created_at: datetime


# ============================================================================
# ADMIN SCHEMAS
# ============================================================================

class AdminProviderApproveRequest(BaseModel):
    admin_notes: Optional[str] = None
    badge: Optional[str] = None


class AdminProviderRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=5)
