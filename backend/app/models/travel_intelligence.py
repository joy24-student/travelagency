"""
Travel Intelligence, Disruption Engine, and Journey Monitoring Models.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class JourneyMonitor(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.journey_monitors."""
    __tablename__ = "journey_monitors"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    trip_booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    service_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)  # flight, train, bus, hotel, ferry
    provider_code: Mapped[str] = mapped_column(Text, nullable=False)  # BG, BR, GREEN_LINE, etc.
    service_number: Mapped[str] = mapped_column(Text, nullable=False, index=True)  # BG-433, 701 Subarna
    origin: Mapped[str] = mapped_column(Text, nullable=False)
    destination: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_departure: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_arrival: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    estimated_departure: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    estimated_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    current_status: Mapped[str] = mapped_column(Text, default="on_time", nullable=False)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    terminal: Mapped[Optional[str]] = mapped_column(Text)
    gate: Mapped[Optional[str]] = mapped_column(Text)
    platform: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_alternative_budget: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    preferred_transport_types: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["flight", "train", "bus"])
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    confidence_score: Mapped[float] = mapped_column(Numeric(3, 2), default=1.00)
    data_source: Mapped[str] = mapped_column(Text, default="authorized_feed")
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)

    events: Mapped[List["DisruptionEvent"]] = relationship("DisruptionEvent", back_populates="monitor", cascade="all, delete-orphan")


class DisruptionEvent(Base, UUIDMixin):
    """Corresponds to public.disruption_events."""
    __tablename__ = "disruption_events"

    monitor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("journey_monitors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, default="medium", nullable=False)  # low, medium, high, critical
    previous_state: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    new_state: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(3, 2), default=1.00)
    dedup_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    processing_status: Mapped[str] = mapped_column(Text, default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    monitor: Mapped["JourneyMonitor"] = relationship("JourneyMonitor", back_populates="events")
    impacts: Mapped[List["DisruptionImpact"]] = relationship("DisruptionImpact", back_populates="event", cascade="all, delete-orphan")
    alternatives: Mapped[List["AlternativeRecommendation"]] = relationship("AlternativeRecommendation", back_populates="event", cascade="all, delete-orphan")


class DisruptionImpact(Base, UUIDMixin):
    """Corresponds to public.disruption_impacts."""
    __tablename__ = "disruption_impacts"

    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("disruption_events.id", ondelete="CASCADE"), nullable=False, index=True)
    affected_booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    affected_service_type: Mapped[str] = mapped_column(Text, nullable=False)
    impact_summary: Mapped[str] = mapped_column(Text, nullable=False)
    connection_missed: Mapped[bool] = mapped_column(Boolean, default=False)
    hotel_checkin_missed: Mapped[bool] = mapped_column(Boolean, default=False)
    severity: Mapped[str] = mapped_column(Text, default="medium")
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text)
    requires_user_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution_type: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    event: Mapped["DisruptionEvent"] = relationship("DisruptionEvent", back_populates="impacts")


class AlternativeRecommendation(Base, UUIDMixin):
    """Corresponds to public.alternative_recommendations."""
    __tablename__ = "alternative_recommendations"

    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("disruption_events.id", ondelete="CASCADE"), nullable=False, index=True)
    transport_type: Mapped[str] = mapped_column(Text, nullable=False)  # flight, train, bus, hotel_reschedule, ferry
    title: Mapped[str] = mapped_column(Text, nullable=False)
    operator_name: Mapped[str] = mapped_column(Text, nullable=False)
    route_description: Mapped[str] = mapped_column(Text, nullable=False)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    estimated_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    price_difference: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    verified_availability: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    reliability_score: Mapped[float] = mapped_column(Numeric(3, 2), default=0.90)
    booking_action: Mapped[str] = mapped_column(Text, nullable=False)  # instant_book, search, request_confirmation, contact_hotel
    action_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    user_decision: Mapped[str] = mapped_column(Text, default="pending")  # pending, accepted, rejected, expired
    user_decision_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    event: Mapped["DisruptionEvent"] = relationship("DisruptionEvent", back_populates="alternatives")


class DisruptionTimelineEntry(Base, UUIDMixin):
    """Corresponds to public.disruption_timeline_entries."""
    __tablename__ = "disruption_timeline_entries"

    monitor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("journey_monitors.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    entry_type: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
