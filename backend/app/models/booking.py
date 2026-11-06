"""
SQLAlchemy models for Bookings, Booking Items, Passengers, and Payments.
Implements the Booking State Machine domain entities.
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


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    traveler_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    booking_reference: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)  # hotel, flight, train, tour, package, car
    
    # State Machine: draft -> pending_payment -> confirmed -> cancelled / refunded / completed
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)
    flow_step: Mapped[str] = mapped_column(String(50), default="traveler_details")
    
    origin_city: Mapped[Optional[str]] = mapped_column(Text)
    destination_city: Mapped[str] = mapped_column(Text, nullable=False)
    destination_country: Mapped[Optional[str]] = mapped_column(Text)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    number_of_guests: Mapped[int] = mapped_column(Integer, default=1)
    
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    service_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    final_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    special_requests: Mapped[Optional[str]] = mapped_column(Text)
    cancellation_policy: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    items: Mapped[List["BookingItem"]] = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    passengers: Mapped[List["BookingPassenger"]] = relationship("BookingPassenger", back_populates="booking", cascade="all, delete-orphan")
    payments: Mapped[List["BookingPayment"]] = relationship("BookingPayment", back_populates="booking", cascade="all, delete-orphan")


class BookingItem(Base):
    __tablename__ = "booking_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    item_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    booking: Mapped[Booking] = relationship("Booking", back_populates="items")


class BookingPassenger(Base):
    __tablename__ = "booking_passengers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    nationality: Mapped[Optional[str]] = mapped_column(Text)
    passport_number: Mapped[Optional[str]] = mapped_column(Text)
    passport_expiry: Mapped[Optional[date]] = mapped_column(Date)
    passenger_type: Mapped[str] = mapped_column(String(20), default="adult")  # adult, child, infant
    seat_preference: Mapped[Optional[str]] = mapped_column(Text)
    meal_preference: Mapped[Optional[str]] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    booking: Mapped[Booking] = relationship("Booking", back_populates="passengers")


class BookingPayment(Base):
    __tablename__ = "booking_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    payment_method: Mapped[str] = mapped_column(String(50), default="card")  # bkash, nagad, card, wallet
    payment_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, completed, failed, refunded
    transaction_id: Mapped[Optional[str]] = mapped_column(Text, unique=True, index=True)
    payment_gateway: Mapped[Optional[str]] = mapped_column(Text)
    payment_gateway_response: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    booking: Mapped[Booking] = relationship("Booking", back_populates="payments")
