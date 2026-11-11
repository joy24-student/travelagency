"""
Itinerary Marketplace, Creator Economy & Day-by-Day Schedule Models.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class CreatorProfile(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.creator_profiles."""
    __tablename__ = "creator_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False, unique=True)
    handle: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    cover_image_url: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[str] = mapped_column(Text, default="Bangladesh")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    badges: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["Traveler"])
    total_clones: Mapped[int] = mapped_column(Integer, default=0)
    total_saves: Mapped[int] = mapped_column(Integer, default=0)
    total_views: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=5.00)
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=5.00)
    payout_details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Itinerary(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.itineraries."""
    __tablename__ = "itineraries"

    creator_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    cover_image: Mapped[str] = mapped_column(Text, nullable=False)
    destination: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    destination_country: Mapped[str] = mapped_column(Text, default="Bangladesh")
    start_location: Mapped[str] = mapped_column(Text, default="Dhaka")
    end_location: Mapped[str] = mapped_column(Text, default="Dhaka")
    duration_days: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    estimated_budget: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    travel_category: Mapped[str] = mapped_column(Text, default="adventure", index=True)
    difficulty_level: Mapped[str] = mapped_column(Text, default="easy")
    visibility: Mapped[str] = mapped_column(Text, default="public", index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    clone_count: Mapped[int] = mapped_column(Integer, default=0)
    save_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=5.00)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    highlights: Mapped[List[str]] = mapped_column(JSON, default=list)
    included_services: Mapped[List[str]] = mapped_column(JSON, default=list)
    excluded_services: Mapped[List[str]] = mapped_column(JSON, default=list)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    days: Mapped[List["ItineraryDay"]] = relationship("ItineraryDay", back_populates="itinerary", cascade="all, delete-orphan", order_by="ItineraryDay.day_number")


class ItineraryDay(Base, UUIDMixin):
    """Corresponds to public.itinerary_days."""
    __tablename__ = "itinerary_days"

    itinerary_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("itineraries.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[Optional[str]] = mapped_column(Text)
    day_start_time: Mapped[str] = mapped_column(Text, default="09:00 AM")
    cover_image: Mapped[Optional[str]] = mapped_column(Text)
    stops_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    itinerary: Mapped["Itinerary"] = relationship("Itinerary", back_populates="days")
    items: Mapped[List["ItineraryItem"]] = relationship("ItineraryItem", back_populates="day", cascade="all, delete-orphan", order_by="ItineraryItem.order_index")


class ItineraryItem(Base, UUIDMixin):
    """Corresponds to public.itinerary_items."""
    __tablename__ = "itinerary_items"

    itinerary_day_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("itinerary_days.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text, nullable=False)  # transport, hotel, restaurant, attraction, activity, guide, shopping, boat
    start_time: Mapped[Optional[str]] = mapped_column(Text)
    end_time: Mapped[Optional[str]] = mapped_column(Text)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    transit_instruction: Mapped[Optional[str]] = mapped_column(Text)
    location_name: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Optional[str]] = mapped_column(Text)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    estimated_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    booking_required: Mapped[bool] = mapped_column(Boolean, default=False)
    provider_type: Mapped[Optional[str]] = mapped_column(Text)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    day: Mapped["ItineraryDay"] = relationship("ItineraryDay", back_populates="items")


class ItineraryClone(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.itinerary_clones."""
    __tablename__ = "itinerary_clones"

    original_itinerary_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("itineraries.id", ondelete="CASCADE"), nullable=False, index=True)
    original_creator_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    cloning_user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    travel_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    travel_end_date: Mapped[Optional[date]] = mapped_column(Date)
    traveler_count: Mapped[int] = mapped_column(Integer, default=1)
    adults_count: Mapped[int] = mapped_column(Integer, default=1)
    children_count: Mapped[int] = mapped_column(Integer, default=0)
    target_budget: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    preferred_hotel_category: Mapped[str] = mapped_column(Text, default="standard")
    transport_preference: Mapped[str] = mapped_column(Text, default="balanced")
    pace_of_travel: Mapped[str] = mapped_column(Text, default="moderate")
    dietary_preferences: Mapped[List[str]] = mapped_column(JSON, default=list)
    accessibility_needs: Mapped[List[str]] = mapped_column(JSON, default=list)
    customized_schedule: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    ai_optimizations: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(Text, default="draft", index=True)


class ItinerarySave(Base, UUIDMixin):
    """Corresponds to public.itinerary_saves."""
    __tablename__ = "itinerary_saves"

    itinerary_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("itineraries.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
