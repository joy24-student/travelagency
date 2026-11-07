"""
Flight and Aviation Domain Models.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Airline(Base, UUIDMixin):
    """Corresponds to public.airlines."""
    __tablename__ = "airlines"

    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    country: Mapped[str] = mapped_column(Text, default="Bangladesh")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    flights: Mapped[List["Flight"]] = relationship("Flight", back_populates="airline")


class Airport(Base, UUIDMixin):
    """Corresponds to public.airports."""
    __tablename__ = "airports"

    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)  # DAC, CXB, etc.
    name: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    country: Mapped[str] = mapped_column(Text, default="Bangladesh")
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    timezone: Mapped[str] = mapped_column(Text, default="Asia/Dhaka")


class Flight(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.flights."""
    __tablename__ = "flights"

    flight_number: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    airline_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("airlines.id", ondelete="CASCADE"), nullable=False)
    origin_airport_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("airports.id", ondelete="CASCADE"), nullable=False, index=True)
    destination_airport_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("airports.id", ondelete="CASCADE"), nullable=False, index=True)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    aircraft_type: Mapped[str] = mapped_column(Text, default="Boeing 737")
    base_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    baggage_allowance: Mapped[str] = mapped_column(Text, default="20kg Check-in, 7kg Cabin")
    total_seats: Mapped[int] = mapped_column(Integer, default=180)
    available_seats: Mapped[int] = mapped_column(Integer, default=180)
    status: Mapped[str] = mapped_column(Text, default="scheduled")  # scheduled, delayed, cancelled, departed
    is_refundable: Mapped[bool] = mapped_column(Boolean, default=True)

    airline: Mapped["Airline"] = relationship("Airline", back_populates="flights")
    origin_airport: Mapped["Airport"] = relationship("Airport", foreign_keys=[origin_airport_id])
    destination_airport: Mapped["Airport"] = relationship("Airport", foreign_keys=[destination_airport_id])
    seats: Mapped[List["FlightSeat"]] = relationship("FlightSeat", back_populates="flight", cascade="all, delete-orphan")


class FlightSeat(Base, UUIDMixin):
    """Corresponds to public.flight_seats."""
    __tablename__ = "flight_seats"

    flight_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("flights.id", ondelete="CASCADE"), nullable=False, index=True)
    seat_number: Mapped[str] = mapped_column(Text, nullable=False)  # 12A, 14C
    cabin_class: Mapped[str] = mapped_column(Text, default="economy")  # economy, premium_economy, business
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    is_window: Mapped[bool] = mapped_column(Boolean, default=False)
    is_aisle: Mapped[bool] = mapped_column(Boolean, default=False)
    is_exit_row: Mapped[bool] = mapped_column(Boolean, default=False)

    flight: Mapped["Flight"] = relationship("Flight", back_populates="seats")
