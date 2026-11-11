"""
SQLAlchemy 2.0 Models for Verified Local Guide & Boatman Marketplace.
Follows Image 2 ER blueprint:
PROFILES -> PROVIDER_PROFILES -> (DOCUMENTS, SERVICES, AVAILABILITY, DESTINATIONS)
SERVICES -> BOOKINGS -> (PARTICIPANTS, PAYMENTS, TRIP_SESSIONS, REVIEWS, DISPUTES, PAYOUTS)
TRIP_SESSIONS -> (TRIP_LOCATIONS, TRIP_EMERGENCY_EVENTS)
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import List, Optional
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class ProviderProfileModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "provider_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, unique=True, nullable=False)
    provider_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    business_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    emergency_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    bio_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    daily_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1500.00"), nullable=False)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("250.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="BDT", nullable=False)
    primary_destination: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    covered_destinations: Mapped[List[str]] = mapped_column(JSON, default=list)
    languages: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["Bangla", "English"])
    specialties: Mapped[List[str]] = mapped_column(JSON, default=list)
    badge: Mapped[str] = mapped_column(String(50), default="Rising Star", nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="draft", index=True, nullable=False)
    nid_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    license_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    boat_permit_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    police_clearance_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("5.00"), nullable=False)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_trips: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ProviderDocumentModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "provider_documents"

    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class ProviderServiceModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "provider_services"

    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    title_bn: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    description_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    destination: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    price_model: Mapped[str] = mapped_column(String(30), default="daily", nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="BDT", nullable=False)
    duration_hours: Mapped[Decimal] = mapped_column(Numeric(4, 1), default=Decimal("8.0"), nullable=False)
    max_capacity: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    included_services: Mapped[List[str]] = mapped_column(JSON, default=list)
    excluded_services: Mapped[List[str]] = mapped_column(JSON, default=list)
    meeting_point: Mapped[str] = mapped_column(String(200), nullable=False)
    meeting_point_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    meeting_point_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cancellation_policy: Mapped[str] = mapped_column(
        Text, default="Free cancellation up to 24 hours before tour start.", nullable=False
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class MarketplaceBookingModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "marketplace_bookings"

    booking_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    traveler_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_profiles.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_services.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True, nullable=False)
    tour_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, default=time(9, 0, 0), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    number_of_guests: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    provider_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="BDT", nullable=False)
    meeting_point: Mapped[str] = mapped_column(String(200), nullable=False)
    special_requests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    otp_code: Mapped[str] = mapped_column(String(6), nullable=False)
    otp_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class TripSessionModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "trip_sessions"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_bookings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_profiles.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    traveler_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", index=True, nullable=False)
    otp_code_entered: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    otp_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_ping_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_distance_km: Mapped[Decimal] = mapped_column(Numeric(8, 3), default=Decimal("0.000"), nullable=False)


class TripLocationModel(Base, UUIDMixin):
    __tablename__ = "trip_locations"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trip_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    heading: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_level: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class TripEmergencyEventModel(Base, UUIDMixin):
    __tablename__ = "trip_emergency_events"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trip_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    triggered_by: Mapped[uuid.UUID] = mapped_column(nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), default="sos_panic", nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    address_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", index=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dispatch_target: Mapped[Optional[str]] = mapped_column(String(50), default="999_and_contacts")
    trusted_contacts_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_by: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class MarketplaceReviewModel(Base, UUIDMixin):
    __tablename__ = "marketplace_reviews"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_bookings.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    rating: Mapped[Decimal] = mapped_column(Numeric(2, 1), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    photos: Mapped[List[str]] = mapped_column(JSON, default=list)
    is_verified_booking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
