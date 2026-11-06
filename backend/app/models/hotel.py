"""
SQLAlchemy models for Hotels, Hotel Rooms, Availability, and Reviews.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    slug: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    star_rating: Mapped[float] = mapped_column(Numeric(3, 1), default=4.0)
    average_rating: Mapped[float] = mapped_column(Numeric(3, 2), default=4.8)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    images: Mapped[List[str]] = mapped_column(JSONB, default=list)
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    state_province: Mapped[Optional[str]] = mapped_column(Text)
    country: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(10), default="BD")
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 8))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(11, 8))
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=50.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    amenities: Mapped[List[str]] = mapped_column(JSONB, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    rooms: Mapped[List["HotelRoom"]] = relationship("HotelRoom", back_populates="hotel", cascade="all, delete-orphan")
    reviews: Mapped[List["HotelReview"]] = relationship("HotelReview", back_populates="hotel", cascade="all, delete-orphan")


class HotelRoom(Base):
    __tablename__ = "hotel_rooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    room_type: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    max_occupancy: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    bed_type: Mapped[Optional[str]] = mapped_column(Text, default="King Bed")
    square_meters: Mapped[Optional[int]] = mapped_column(Integer, default=35)
    amenities: Mapped[List[str]] = mapped_column(JSONB, default=list)
    image_urls: Mapped[List[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    hotel: Mapped[Hotel] = relationship("Hotel", back_populates="rooms")
    availabilities: Mapped[List["HotelRoomAvailability"]] = relationship(
        "HotelRoomAvailability", back_populates="room", cascade="all, delete-orphan"
    )


class HotelRoomAvailability(Base):
    __tablename__ = "hotel_room_availability"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hotel_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_out_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    available_count: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    room: Mapped[HotelRoom] = relationship("HotelRoom", back_populates="availabilities")


class HotelReview(Base):
    __tablename__ = "hotel_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    user_name: Mapped[Optional[str]] = mapped_column(Text, default="Verified Guest")
    user_avatar: Mapped[Optional[str]] = mapped_column(Text)
    rating: Mapped[float] = mapped_column(Numeric(3, 1), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(Text)
    review_text: Mapped[Optional[str]] = mapped_column(Text)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    hotel: Mapped[Hotel] = relationship("Hotel", back_populates="reviews")
