"""
Pydantic Schemas for Itinerary Marketplace, Cloning, and Multi-Service Booking.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ItineraryItemBase(BaseModel):
    title: str = Field(..., min_length=1)
    subtitle: Optional[str] = None
    category: str = Field(..., description="transport, hotel, restaurant, attraction, activity, guide, boat, shopping, other")
    start_time: Optional[str] = "09:00 AM"
    end_time: Optional[str] = "10:30 AM"
    duration_minutes: Optional[int] = 90
    transit_instruction: Optional[str] = None
    location_name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_cost: float = Field(default=0.0, ge=0)
    currency: str = "BDT"
    image_url: Optional[str] = None
    order_index: int = 0
    booking_required: bool = False
    provider_type: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class ItineraryItemResponse(ItineraryItemBase):
    id: UUID
    itinerary_day_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ItineraryDayBase(BaseModel):
    day_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1)
    subtitle: Optional[str] = None
    day_start_time: str = "09:00 AM"
    cover_image: Optional[str] = None
    stops_count: int = 0
    notes: Optional[str] = None


class ItineraryDayCreate(ItineraryDayBase):
    items: List[ItineraryItemBase] = Field(default_factory=list)


class ItineraryDayResponse(ItineraryDayBase):
    id: UUID
    itinerary_id: UUID
    items: List[ItineraryItemResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class ItineraryCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    cover_image: str
    destination: str
    destination_country: str = "Bangladesh"
    start_location: str = "Dhaka"
    end_location: str = "Dhaka"
    duration_days: int = Field(default=3, ge=1, le=30)
    estimated_budget: float = Field(..., gt=0)
    currency: str = "BDT"
    travel_category: str = "adventure"
    difficulty_level: str = "easy"
    visibility: str = "public"
    tags: List[str] = Field(default_factory=list)
    highlights: List[str] = Field(default_factory=list)
    days: List[ItineraryDayCreate] = Field(default_factory=list)


class ItineraryResponse(BaseModel):
    id: UUID
    creator_id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    cover_image: str
    destination: str
    destination_country: str
    start_location: str
    end_location: str
    duration_days: int
    estimated_budget: float
    currency: str
    travel_category: str
    difficulty_level: str
    visibility: str
    is_featured: bool
    clone_count: int
    save_count: int
    view_count: int
    rating: float
    review_count: int
    tags: List[str]
    highlights: List[str]
    included_services: List[str]
    excluded_services: List[str]
    days: List[ItineraryDayResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CloneItineraryRequest(BaseModel):
    travel_start_date: date
    traveler_count: int = Field(default=1, ge=1)
    adults_count: int = Field(default=1, ge=1)
    children_count: int = Field(default=0, ge=0)
    target_budget: Optional[float] = None
    preferred_hotel_category: str = "standard"  # budget, standard, boutique, luxury
    transport_preference: str = "balanced"  # public, private, express, balanced
    pace_of_travel: str = "moderate"
    dietary_preferences: List[str] = Field(default_factory=list)
    accessibility_needs: List[str] = Field(default_factory=list)


class CloneItineraryResponse(BaseModel):
    id: UUID
    original_itinerary_id: UUID
    cloning_user_id: UUID
    title: str
    travel_start_date: date
    traveler_count: int
    target_budget: float
    currency: str
    preferred_hotel_category: str
    transport_preference: str
    customized_schedule: Dict[str, Any]
    ai_optimizations: List[Dict[str, Any]]
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AIBudgetOptimizeRequest(BaseModel):
    original_budget: float
    target_budget: float
    currency: str = "BDT"
    traveler_count: int = 1
    schedule: Dict[str, Any]


class AIBudgetOptimizeResponse(BaseModel):
    feasible: bool
    optimized_budget: float
    original_budget: float
    savings_amount: float
    recommendations: List[Dict[str, Any]]
    optimized_schedule: Dict[str, Any]
    trade_off_explanation: str
