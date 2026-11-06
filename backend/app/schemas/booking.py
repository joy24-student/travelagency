"""
Pydantic v2 schemas for Booking State Machine and Reservations.
"""

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema


class BookingStatus(str, Enum):
    DRAFT = "draft"
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    REFUNDED = "refunded"


class ProductType(str, Enum):
    HOTEL = "hotel"
    FLIGHT = "flight"
    TRAIN = "train"
    TOUR = "tour"
    PACKAGE = "package"
    CAR = "car"


class BookingPassengerCreate(BaseSchema):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    passenger_type: str = Field(default="adult", description="adult, child, infant")
    seat_preference: Optional[str] = None
    meal_preference: Optional[str] = None
    is_primary: bool = False


class BookingPassengerResponse(BookingPassengerCreate):
    id: uuid.UUID
    booking_id: uuid.UUID


class BookingItemCreate(BaseSchema):
    product_id: uuid.UUID = Field(..., description="Target room ID or flight ID")
    product_type: ProductType
    product_name: str
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., ge=0)
    # Metadata contains booking-specific attributes (e.g. check_in/check_out or seat_numbers)
    item_metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata")


class BookingItemResponse(BaseSchema):
    id: uuid.UUID
    booking_id: uuid.UUID
    product_id: Optional[uuid.UUID]
    product_type: str
    product_name: str
    description: Optional[str]
    quantity: int
    unit_price: float
    line_total: float
    item_metadata: Dict[str, Any]


class BookingPaymentResponse(BaseSchema):
    id: uuid.UUID
    booking_id: uuid.UUID
    amount: float
    currency: str
    payment_method: str
    payment_status: str
    transaction_id: Optional[str]
    created_at: datetime


class BookingCreateRequest(BaseSchema):
    product_type: ProductType
    origin_city: Optional[str] = None
    destination_city: str
    destination_country: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    number_of_guests: int = Field(default=1, ge=1)
    special_requests: Optional[str] = None
    items: List[BookingItemCreate] = Field(..., min_length=1)
    passengers: List[BookingPassengerCreate] = Field(default_factory=list)


class BookingStatusUpdateRequest(BaseSchema):
    target_status: BookingStatus
    reason: Optional[str] = None
    payment_transaction_id: Optional[str] = None


class BookingResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    booking_reference: str
    product_type: str
    status: BookingStatus
    flow_step: str
    origin_city: Optional[str]
    destination_city: str
    destination_country: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    number_of_guests: int
    total_price: float
    currency: str
    discount_amount: float
    tax_amount: float
    service_fee: float
    final_price: float
    special_requests: Optional[str]
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    completed_at: Optional[datetime]
    items: List[BookingItemResponse] = Field(default_factory=list)
    passengers: List[BookingPassengerResponse] = Field(default_factory=list)
    payments: List[BookingPaymentResponse] = Field(default_factory=list)
