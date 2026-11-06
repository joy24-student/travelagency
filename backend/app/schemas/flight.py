"""
Pydantic v2 schemas for Flights and Seat Inventory.
"""

import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import Field

from app.schemas.common import BaseSchema, PaginatedResponse


class AirlineResponse(BaseSchema):
    id: uuid.UUID
    iata_code: str
    name: str
    logo_url: Optional[str] = None


class AirportResponse(BaseSchema):
    id: uuid.UUID
    iata_code: str
    icao_code: Optional[str] = None
    name: str
    city: str
    country: str
    country_code: Optional[str] = None


class FlightSeatResponse(BaseSchema):
    id: uuid.UUID
    flight_id: uuid.UUID
    seat_number: str
    cabin_class: str
    price: float
    is_available: bool


class FlightResponse(BaseSchema):
    id: uuid.UUID
    flight_number: str
    airline_id: Optional[uuid.UUID] = None
    airline: Optional[AirlineResponse] = None
    departure_airport_id: Optional[uuid.UUID] = None
    departure_airport: Optional[AirportResponse] = None
    arrival_airport_id: Optional[uuid.UUID] = None
    arrival_airport: Optional[AirportResponse] = None
    departure_time: datetime
    arrival_time: datetime
    flight_duration: int
    stops: int
    aircraft_type: Optional[str] = None
    cabin_class: str
    base_price: float
    currency: str
    total_seats: int
    available_seats: int
    baggage_allowance: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)


class FlightSearchQuery(BaseSchema):
    origin: Optional[str] = Field(None, description="Origin city or IATA airport code")
    destination: Optional[str] = Field(None, description="Destination city or IATA airport code")
    departure_date: Optional[date] = Field(None, description="Departure date (YYYY-MM-DD)")
    return_date: Optional[date] = Field(None, description="Return date for round-trip")
    passengers: int = Field(default=1, ge=1, le=10, description="Number of passengers")
    cabin_class: Optional[str] = Field(None, description="Cabin class: Economy, Premium Economy, Business, First")
    max_stops: Optional[int] = Field(None, ge=0, le=3, description="Maximum number of stops")
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class FlightSearchResponse(PaginatedResponse[FlightResponse]):
    cached: bool = Field(default=False, description="Indicates if result was served from Redis cache")
