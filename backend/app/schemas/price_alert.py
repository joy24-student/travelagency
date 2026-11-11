"""
Pydantic v2 Schemas for Price Alerts and Fare Calendar.
Strictly uses integer paisa (1 BDT = 100 paisa) for all monetary values.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ServiceType = Literal["flight", "bus", "launch", "train", "hotel"]
AlertStatus = Literal["active", "triggered", "paused", "expired"]


class PriceAlertCreate(BaseModel):
    service_type: ServiceType = Field("flight", description="Transport or lodging service type")
    origin: str = Field(..., min_length=2, max_length=50, description="Origin code or city (e.g. DAC)")
    destination: str = Field(..., min_length=2, max_length=50, description="Destination code or city (e.g. CXB)")
    travel_date: date = Field(..., description="Target travel date YYYY-MM-DD")
    date_flex_days: int = Field(0, ge=0, le=7, description="Flexibility in travel date (+/- days)")
    target_price_paisa: Optional[int] = Field(None, gt=0, description="Target price threshold in integer paisa (e.g. 500000 = ৳5000)")
    drop_percent: Optional[float] = Field(None, gt=0, le=100, description="Percentage drop trigger (e.g. 15.0 for 15% drop)")

    @field_validator("origin", "destination")
    @classmethod
    def clean_location(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_trigger_criteria(self) -> "PriceAlertCreate":
        if self.target_price_paisa is None and self.drop_percent is None:
            raise ValueError("At least one trigger criteria (target_price_paisa or drop_percent) must be provided.")
        return self


class PriceAlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    target_price_paisa: Optional[int] = Field(None, gt=0)
    drop_percent: Optional[float] = Field(None, gt=0, le=100)
    date_flex_days: Optional[int] = Field(None, ge=0, le=7)


class PriceAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    service_type: str
    origin: str
    destination: str
    travel_date: date
    date_flex_days: int
    target_price_paisa: Optional[int] = None
    drop_percent: Optional[float] = None
    status: str
    last_notified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PriceSnapshotCreate(BaseModel):
    route_key: str
    travel_date: date
    lowest_price_paisa: int = Field(..., gt=0)
    source: str = "internal_inventory"


class PriceSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    route_key: str
    travel_date: date
    lowest_price_paisa: int
    source: str
    captured_at: datetime


class TrendHint(BaseModel):
    verdict: str = Field(..., description="BUY_NOW, WAIT, or STABLE")
    recommendation_reason: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    predicted_change_percent: float


class FareCalendarDay(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    day: int = Field(..., ge=1, le=31)
    lowest_price_paisa: Optional[int] = Field(None, description="Lowest price in integer paisa, None if no fare")
    currency: str = "BDT"
    is_cheapest: bool = False
    available: bool = True


class FareCalendarResponse(BaseModel):
    origin: str
    destination: str
    service_type: str
    month: str = Field(..., description="YYYY-MM")
    days: List[FareCalendarDay]
    cheapest_date: Optional[str] = None
    cheapest_price_paisa: Optional[int] = None
    trend_hint: TrendHint
    cached: bool = False
