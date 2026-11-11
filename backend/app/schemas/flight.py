"""
Flight Search and Detail Schemas.
"""

import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FlightSearchQuery(BaseModel):
    origin: str = Field(..., description="Origin airport code (e.g. DAC) or city name")
    destination: str = Field(..., description="Destination airport code (e.g. CXB) or city name")
    departure_date: Optional[date] = Field(None, description="Departure date (YYYY-MM-DD)")
    return_date: Optional[date] = Field(None, description="Return date for round-trip")
    passengers: int = Field(1, ge=1, le=9, description="Number of passengers")
    cabin_class: Optional[str] = Field("economy", description="Cabin class: economy, premium_economy, business")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum budget per ticket")
    airline_code: Optional[str] = Field(None, description="Specific airline code filter (e.g. BG, BQ, 2A)")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class AirportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    city: str
    country: str


class AirlineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    logo_url: Optional[str] = None


class FlightSeatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    seat_number: str
    cabin_class: str
    is_available: bool
    price: float
    is_window: bool
    is_aisle: bool
    is_exit_row: bool


class FlightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    flight_number: str
    airline: Optional[AirlineResponse] = None
    origin_airport: Optional[AirportResponse] = None
    destination_airport: Optional[AirportResponse] = None
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    aircraft_type: str
    base_price: float
    currency: str
    baggage_allowance: str
    available_seats: int
    status: str
    is_refundable: bool


class SeatLockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    seat_id: uuid.UUID
    flight_id: uuid.UUID
    locked_by: uuid.UUID
    status: str = "locked"
    expires_in_seconds: int
