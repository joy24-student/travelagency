"""
Pydantic v2 schemas for Hotels and Room Search.
"""

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import Field

from app.schemas.common import BaseSchema, PaginatedResponse


class HotelRoomResponse(BaseSchema):
    id: uuid.UUID
    hotel_id: uuid.UUID
    room_type: str
    description: Optional[str] = None
    max_occupancy: int
    base_price: float
    currency: str
    bed_type: Optional[str] = None
    square_meters: Optional[int] = None
    amenities: List[str] = Field(default_factory=list)
    image_urls: List[str] = Field(default_factory=list)
    available_count: Optional[int] = None


class HotelResponse(BaseSchema):
    id: uuid.UUID
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    star_rating: float
    average_rating: float
    total_reviews: int
    image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    address: Optional[str] = None
    city: str
    state_province: Optional[str] = None
    country: str
    country_code: Optional[str] = "BD"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    base_price: float
    currency: str
    amenities: List[str] = Field(default_factory=list)
    is_featured: bool
    rooms: Optional[List[HotelRoomResponse]] = None


class HotelSearchQuery(BaseSchema):
    query: Optional[str] = Field(None, description="Free text search query for hotel name or city")
    city: Optional[str] = Field(None, description="City filter")
    country: Optional[str] = Field(None, description="Country filter")
    check_in: Optional[date] = Field(None, description="Check-in date (YYYY-MM-DD)")
    check_out: Optional[date] = Field(None, description="Check-out date (YYYY-MM-DD)")
    guests: int = Field(default=1, ge=1, le=20, description="Number of guests")
    rooms_needed: int = Field(default=1, ge=1, le=10, description="Number of rooms needed")
    min_price: Optional[float] = Field(None, ge=0, description="Minimum price filter")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum price filter")
    min_rating: Optional[float] = Field(None, ge=1.0, le=5.0, description="Minimum star rating")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class HotelSearchResponse(PaginatedResponse[HotelResponse]):
    cached: bool = Field(default=False, description="Indicates if result was served from Redis cache")
