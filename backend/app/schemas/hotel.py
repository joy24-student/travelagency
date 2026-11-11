"""
Hotel Search and Detail Schemas.
"""

import uuid
from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HotelSearchQuery(BaseModel):
    city: str = Field(..., description="Destination city (e.g. Dhaka, Cox's Bazar, Sylhet)")
    check_in: Optional[date] = Field(None, description="Check-in date (YYYY-MM-DD)")
    check_out: Optional[date] = Field(None, description="Check-out date (YYYY-MM-DD)")
    guests: int = Field(1, ge=1, le=10, description="Total guests")
    rooms: int = Field(1, ge=1, le=5, description="Number of rooms requested")
    min_star_rating: Optional[int] = Field(None, ge=1, le=5)
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    amenities: Optional[List[str]] = Field(None, description="Required amenities list")
    sort_by: Optional[str] = Field("recommended", description="price_asc, price_desc, rating, recommended")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class HotelRoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hotel_id: uuid.UUID
    name: str
    room_type: str
    description: Optional[str] = None
    max_occupancy: int
    bed_type: str
    size_sqm: Optional[int] = None
    base_price_per_night: float
    currency: str
    images: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    is_available: bool


class HotelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: str
    country: str
    star_rating: int
    review_score: float
    review_count: int
    hero_image: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    check_in_time: str
    check_out_time: str
    is_featured: bool
    rooms: Optional[List[HotelRoomResponse]] = None
