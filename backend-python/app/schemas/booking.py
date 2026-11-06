"""
Booking Schemas and State Machine Transitions.
"""

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductType(str, Enum):
    HOTEL = "hotel"
    FLIGHT = "flight"
    TRAIN = "train"
    TOUR = "tour"
    PACKAGE = "package"
    CAR = "car"


class BookingStatus(str, Enum):
    DRAFT = "draft"
    DETAILS_PENDING = "details_pending"
    PENDING_PAYMENT = "payment_pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class BookingItemCreate(BaseModel):
    product_type: ProductType
    product_id: uuid.UUID
    product_name: str
    description: Optional[str] = None
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(..., ge=0)
    item_metadata: Dict[str, Any] = Field(default_factory=dict)


class BookingPassengerCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: Optional[str] = None
    passenger_type: str = "adult"
    passport_number: Optional[str] = None
    seat_preference: Optional[str] = None
    seat_id: Optional[uuid.UUID] = None


class BookingCreateRequest(BaseModel):
    product_type: ProductType
    destination_city: str
    origin_city: Optional[str] = None
    destination_country: Optional[str] = "Bangladesh"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    number_of_guests: int = Field(1, ge=1)
    agency_id: Optional[uuid.UUID] = None
    items: List[BookingItemCreate] = Field(..., min_length=1)
    passengers: List[BookingPassengerCreate] = Field(default_factory=list)
    special_requests: Optional[str] = None
    notes: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, description="Client nonce to prevent duplicate bookings")


class BookingStatusUpdateRequest(BaseModel):
    target_status: BookingStatus
    payment_transaction_id: Optional[str] = None
    cancellation_reason: Optional[str] = None
    admin_override: bool = False


class BookingItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_type: str
    product_name: str
    quantity: int
    unit_price: float
    line_total: float
    item_metadata: Dict[str, Any] = Field(default_factory=dict, alias="item_metadata")


class BookingPassengerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    passenger_type: str
    seat_preference: Optional[str] = None


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_reference: str
    product_type: str
    status: str
    flow_step: str
    origin_city: Optional[str] = None
    destination_city: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    number_of_guests: int
    total_price: float
    discount_amount: float
    tax_amount: float
    service_fee: float
    final_price: float
    currency: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    items: List[BookingItemResponse] = Field(default_factory=list)
    passengers: List[BookingPassengerResponse] = Field(default_factory=list)
