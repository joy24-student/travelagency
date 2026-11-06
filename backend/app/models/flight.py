"""
SQLAlchemy models for Airlines, Airports, Flights, and Flight Seats.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
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


class Airline(Base):
    __tablename__ = "airlines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iata_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    flights: Mapped[List["Flight"]] = relationship("Flight", back_populates="airline")


class Airport(Base):
    __tablename__ = "airports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iata_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    icao_code: Mapped[Optional[str]] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    country: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(10))
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 8))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(11, 8))
    timezone: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Flight(Base):
    __tablename__ = "flights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_number: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    airline_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("airlines.id", ondelete="SET NULL"))
    departure_airport_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("airports.id", ondelete="SET NULL"), index=True)
    arrival_airport_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("airports.id", ondelete="SET NULL"), index=True)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    flight_duration: Mapped[int] = mapped_column(Integer, default=120)  # minutes
    stops: Mapped[int] = mapped_column(Integer, default=0)
    aircraft_type: Mapped[Optional[str]] = mapped_column(Text, default="Boeing 787 Dreamliner")
    cabin_class: Mapped[str] = mapped_column(String(50), default="Economy")
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    total_seats: Mapped[int] = mapped_column(Integer, default=200)
    available_seats: Mapped[int] = mapped_column(Integer, default=45)
    baggage_allowance: Mapped[Optional[str]] = mapped_column(Text, default="20 kg check-in + 7 kg cabin")
    amenities: Mapped[List[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    airline: Mapped[Optional[Airline]] = relationship("Airline", back_populates="flights")
    departure_airport: Mapped[Optional[Airport]] = relationship("Airport", foreign_keys=[departure_airport_id])
    arrival_airport: Mapped[Optional[Airport]] = relationship("Airport", foreign_keys=[arrival_airport_id])
    seats: Mapped[List["FlightSeat"]] = relationship("FlightSeat", back_populates="flight", cascade="all, delete-orphan")


class FlightSeat(Base):
    __tablename__ = "flight_seats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id", ondelete="CASCADE"), nullable=False, index=True)
    seat_number: Mapped[str] = mapped_column(String(20), nullable=False)
    cabin_class: Mapped[str] = mapped_column(String(50), default="Economy")
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    flight: Mapped[Flight] = relationship("Flight", back_populates="seats")
