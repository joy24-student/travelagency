"""
Dynamic Surge Pricing and Fare Elasticity Schemas.
Enforces Fair Price Ceiling (max 1.25x) and Transparent Breakdowns.
"""

from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductCategoryEnum(str, Enum):
    BUS = "bus"
    LAUNCH = "launch"
    HOTEL = "hotel"
    STAY = "stay"


class WeatherSignalSeverity(str, Enum):
    NONE = "none"
    CAUTIONARY = "cautionary"          # River signal 1, mild fog/rain
    MODERATE_WARNING = "moderate"      # River signal 2, dense winter fog, maritime 3
    SEVERE_DANGER = "severe"           # River signal 3-4, maritime 4-10, cyclone


class WeatherConditionInput(BaseModel):
    condition: Optional[str] = Field("clear", description="Weather description e.g. 'clear', 'dense_fog', 'cyclone', 'heavy_monsoon'")
    warning_signal: Optional[int] = Field(0, description="Inland river signal (1-4) or maritime signal (1-10)")
    severity: Optional[WeatherSignalSeverity] = Field(WeatherSignalSeverity.NONE, description="Normalized severity level")
    description: Optional[str] = Field(None, description="Meteorological advisory message")


class SurgeCalculationRequest(BaseModel):
    category: ProductCategoryEnum = Field(..., description="Product category: bus, launch, or hotel/stay")
    product_id: str = Field(..., description="ID of the bus trip, launch cabin, or hotel room")
    product_title: Optional[str] = Field(None, description="Human-readable title e.g. 'Green Line Sleeper Dhaka-Cox'")
    base_price: float = Field(..., gt=0, description="Base inventory fare in BDT")
    remaining_quota: int = Field(..., ge=0, description="Remaining seats, cabins, or rooms")
    total_quota: int = Field(..., gt=0, description="Total initial seat, cabin, or room capacity")
    travel_date: Optional[date] = Field(None, description="Departure or check-in date (defaults to today)")
    origin_city: Optional[str] = Field(None, description="Origin terminal or city (e.g. 'Dhaka Sadarghat')")
    destination_city: Optional[str] = Field(None, description="Destination city (e.g. 'Barishal', 'Cox\\'s Bazar')")
    weather: Optional[WeatherConditionInput] = Field(None, description="Current or forecasted weather alerts")
    departure_time: Optional[str] = Field(None, description="Time of departure e.g. '10:30 PM'")
    currency: Optional[str] = Field("BDT", description="Currency code")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category": "bus",
                "product_id": "bus-gl-1",
                "product_title": "AC Scania Sleeper Dhaka to Cox's Bazar",
                "base_price": 2200.0,
                "remaining_quota": 4,
                "total_quota": 30,
                "travel_date": "2026-11-10",
                "origin_city": "Dhaka",
                "destination_city": "Cox's Bazar",
                "weather": {
                    "condition": "clear",
                    "warning_signal": 0,
                    "severity": "none"
                }
            }
        }
    )


class PricingAdjustmentItemResponse(BaseModel):
    code: str = Field(..., description="Machine-readable adjustment code")
    label: str = Field(..., description="Human-readable adjustment title e.g. 'Holiday Transit Demand +10%'")
    percentage: float = Field(..., description="Percentage shift relative to base (+10.0 or -5.0)")
    factor_str: str = Field(..., description="Display formatted factor e.g. '+10.0%' or '-5.0%'")
    amount: float = Field(..., description="Monetary impact in BDT")
    description: str = Field(..., description="Plain-language transparent explanation for traveler")


class SurgeQuoteResponse(BaseModel):
    quote_id: str = Field(..., description="Cryptographically signed quote identifier")
    product_id: str = Field(..., description="Target inventory ID")
    category: str = Field(..., description="bus | launch | hotel")
    base_price: float = Field(..., description="Original base fare")
    final_price: float = Field(..., description="Fair dynamic fare calculated and rounded")
    surge_multiplier: float = Field(..., description="Effective multiplier (strictly <= 1.25)")
    raw_multiplier: float = Field(..., description="Uncapped multiplier before platform ceiling")
    is_capped: bool = Field(..., description="Whether fair platform ceiling (1.25x max) was enforced")
    cap_savings_amount: float = Field(0.0, description="Customer savings achieved by fair price ceiling")
    currency: str = Field("BDT", description="Currency identifier")
    guarantee_window_seconds: int = Field(900, description="Duration price is locked (15 minutes)")
    created_at: datetime = Field(..., description="Timestamp quote generated")
    expires_at: datetime = Field(..., description="Timestamp quote expires (now + 15 min)")
    breakdown: List[PricingAdjustmentItemResponse] = Field(default_factory=list, description="Transparent line items")
    guarantee_text: str = Field("Price guaranteed for 15:00 minutes", description="Client countdown banner text")
    signature: str = Field(..., description="HMAC-SHA256 signature guaranteeing quote integrity")


class VerifyQuoteRequest(BaseModel):
    quote_id: str = Field(..., description="Quote identifier to verify")
    signature: str = Field(..., description="HMAC signature")
    product_id: str = Field(..., description="Product ID")
    final_price: float = Field(..., description="Price being confirmed")


class VerifyQuoteResponse(BaseModel):
    valid: bool = Field(..., description="Whether quote is genuine and untampered")
    is_expired: bool = Field(..., description="Whether 15-minute guarantee window has passed")
    remaining_seconds: int = Field(..., description="Seconds remaining before expiration")
    message: str = Field(..., description="Human-readable status")
