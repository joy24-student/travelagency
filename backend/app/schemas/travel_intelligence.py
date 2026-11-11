"""
Pydantic Schemas for Travel Intelligence & Disruption Monitoring.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class JourneyMonitorCreate(BaseModel):
    booking_id: Optional[UUID] = None
    trip_booking_id: Optional[UUID] = None
    service_type: str = Field(..., description="flight, train, bus, hotel, ferry")
    provider_code: str
    service_number: str
    origin: str
    destination: str
    scheduled_departure: datetime
    scheduled_arrival: datetime
    terminal: Optional[str] = None
    gate: Optional[str] = None
    platform: Optional[str] = None
    notification_enabled: bool = True
    max_alternative_budget: Optional[float] = None
    preferred_transport_types: List[str] = Field(default_factory=lambda: ["flight", "train", "bus"])


class JourneyMonitorResponse(BaseModel):
    id: UUID
    user_id: UUID
    service_type: str
    provider_code: str
    service_number: str
    origin: str
    destination: str
    scheduled_departure: datetime
    scheduled_arrival: datetime
    estimated_departure: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    current_status: str
    delay_minutes: int
    terminal: Optional[str] = None
    gate: Optional[str] = None
    platform: Optional[str] = None
    is_active: bool
    confidence_score: float
    data_source: str
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlternativeRecommendationResponse(BaseModel):
    id: UUID
    event_id: UUID
    transport_type: str
    title: str
    operator_name: str
    route_description: str
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    estimated_price: Optional[float] = None
    price_difference: float = 0.0
    currency: str = "BDT"
    verified_availability: bool = False
    verification_timestamp: Optional[datetime] = None
    reliability_score: float = 0.90
    booking_action: str
    action_payload: Dict[str, Any] = Field(default_factory=dict)
    user_decision: str = "pending"
    model_config = ConfigDict(from_attributes=True)


class DisruptionImpactResponse(BaseModel):
    id: UUID
    affected_booking_id: Optional[UUID] = None
    affected_service_type: str
    impact_summary: str
    connection_missed: bool
    hotel_checkin_missed: bool
    severity: str
    ai_explanation: Optional[str] = None
    requires_user_approval: bool
    resolved: bool
    model_config = ConfigDict(from_attributes=True)


class DisruptionEventResponse(BaseModel):
    id: UUID
    monitor_id: UUID
    event_type: str
    severity: str
    delay_minutes: int
    source: str
    confidence: float
    event_timestamp: datetime
    processing_status: str
    impacts: List[DisruptionImpactResponse] = Field(default_factory=list)
    alternatives: List[AlternativeRecommendationResponse] = Field(default_factory=list)
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DisruptionDecisionRequest(BaseModel):
    decision: str = Field(..., description="accepted, rejected")
    alternative_id: UUID
    notes: Optional[str] = None


class DisruptionDecisionResponse(BaseModel):
    success: bool
    message: str
    status: str
    next_step: Optional[str] = None
