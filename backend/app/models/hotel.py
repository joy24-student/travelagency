"""
Hotel and Accommodation Models.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Hotel(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.hotels."""
    __tablename__ = "hotels"

    name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    slug: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    country: Mapped[str] = mapped_column(Text, default="Bangladesh", index=True)
    postal_code: Mapped[Optional[str]] = mapped_column(Text)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    star_rating: Mapped[int] = mapped_column(Integer, default=3)
    review_score: Mapped[float] = mapped_column(Numeric(3, 2), default=4.5)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    hero_image: Mapped[Optional[str]] = mapped_column(Text)
    images: Mapped[List[str]] = mapped_column(JSON, default=list)
    amenities: Mapped[List[str]] = mapped_column(JSON, default=list)
    check_in_time: Mapped[str] = mapped_column(Text, default="14:00")
    check_out_time: Mapped[str] = mapped_column(Text, default="12:00")
    policies: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    rooms: Mapped[List["HotelRoom"]] = relationship("HotelRoom", back_populates="hotel", cascade="all, delete-orphan")
    reviews: Mapped[List["HotelReview"]] = relationship("HotelReview", back_populates="hotel", cascade="all, delete-orphan")


class HotelRoom(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.hotel_rooms."""
    __tablename__ = "hotel_rooms"

    hotel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    room_type: Mapped[str] = mapped_column(Text, default="standard")
    description: Mapped[Optional[str]] = mapped_column(Text)
    max_occupancy: Mapped[int] = mapped_column(Integer, default=2)
    bed_type: Mapped[str] = mapped_column(Text, default="Queen")
    size_sqm: Mapped[Optional[int]] = mapped_column(Integer)
    base_price_per_night: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    images: Mapped[List[str]] = mapped_column(JSON, default=list)
    amenities: Mapped[List[str]] = mapped_column(JSON, default=list)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    hotel: Mapped["Hotel"] = relationship("Hotel", back_populates="rooms")
    availability_records: Mapped[List["HotelRoomAvailability"]] = relationship(
        "HotelRoomAvailability", back_populates="room", cascade="all, delete-orphan"
    )


class HotelRoomAvailability(Base, UUIDMixin):
    """Corresponds to public.hotel_room_availability."""
    __tablename__ = "hotel_room_availability"

    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hotel_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    available_date: Mapped[date] = mapped_column("date", Date, nullable=False, index=True)
    available_count: Mapped[int] = mapped_column(Integer, default=1)
    price_modifier: Mapped[float] = mapped_column(Numeric(5, 2), default=1.0)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)

    room: Mapped["HotelRoom"] = relationship("HotelRoom", back_populates="availability_records")


class HotelReview(Base, UUIDMixin):
    """Corresponds to public.hotel_reviews."""
    __tablename__ = "hotel_reviews"

    hotel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    rating: Mapped[float] = mapped_column(Numeric(3, 1), nullable=False)
    review_text: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    hotel: Mapped["Hotel"] = relationship("Hotel", back_populates="reviews")
