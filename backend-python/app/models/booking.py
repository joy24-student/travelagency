"""
Booking Domain Models and State Machine Entities.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Booking(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.bookings."""
    __tablename__ = "bookings"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    traveler_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    agency_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("agencies.id", ondelete="SET NULL"), index=True)
    booking_reference: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    product_type: Mapped[str] = mapped_column(Text, nullable=False)  # hotel, flight, train, tour, package
    status: Mapped[str] = mapped_column(Text, default="draft", nullable=False, index=True)
    flow_step: Mapped[str] = mapped_column(Text, default="traveler_details", nullable=False)
    origin_city: Mapped[Optional[str]] = mapped_column(Text)
    destination_city: Mapped[str] = mapped_column(Text, nullable=False)
    destination_country: Mapped[Optional[str]] = mapped_column(Text, default="Bangladesh")
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    number_of_guests: Mapped[int] = mapped_column(Integer, default=1)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    service_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    final_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    special_requests: Mapped[Optional[str]] = mapped_column(Text)
    cancellation_policy: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    items: Mapped[List["BookingItem"]] = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    passengers: Mapped[List["BookingPassenger"]] = relationship("BookingPassenger", back_populates="booking", cascade="all, delete-orphan")
    payments: Mapped[List["BookingPayment"]] = relationship("BookingPayment", back_populates="booking", cascade="all, delete-orphan")


class BookingItem(Base, UUIDMixin):
    """Corresponds to public.booking_items."""
    __tablename__ = "booking_items"

    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    product_type: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    item_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    booking: Mapped["Booking"] = relationship("Booking", back_populates="items")


class BookingPassenger(Base, UUIDMixin):
    """Corresponds to public.booking_passengers."""
    __tablename__ = "booking_passengers"

    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    passenger_type: Mapped[str] = mapped_column(Text, default="adult")  # adult, child, infant
    passport_number: Mapped[Optional[str]] = mapped_column(Text)
    seat_preference: Mapped[Optional[str]] = mapped_column(Text)
    seat_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    booking: Mapped["Booking"] = relationship("Booking", back_populates="passengers")


class BookingPayment(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.booking_payments."""
    __tablename__ = "booking_payments"

    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_method: Mapped[str] = mapped_column(Text, nullable=False)  # bkash, nagad, rocket, stripe, card, wallet
    payment_status: Mapped[str] = mapped_column(Text, default="pending")  # pending, completed, failed, refunded
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    transaction_id: Mapped[Optional[str]] = mapped_column(Text, index=True)
    payment_gateway: Mapped[Optional[str]] = mapped_column(Text)
    gateway_response: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    booking: Mapped["Booking"] = relationship("Booking", back_populates="payments")
