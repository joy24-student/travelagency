"""
Travel Intelligence, Active Journey Monitoring & Disruption Advisory API Endpoints.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.models.travel_intelligence import (
    AlternativeRecommendation,
    DisruptionEvent,
    DisruptionImpact,
    JourneyMonitor,
)
from app.schemas.common import StandardResponse
from app.schemas.travel_intelligence import (
    AlternativeRecommendationResponse,
    DisruptionDecisionRequest,
    DisruptionDecisionResponse,
    DisruptionEventResponse,
    JourneyMonitorCreate,
    JourneyMonitorResponse,
)
from app.schemas.user import CurrentUser
from app.services.travel_intelligence.disruption_engine import DisruptionEngineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/travel-intelligence", tags=["Travel Intelligence & Disruption Engine"])


@router.get("/monitors", response_model=StandardResponse[List[JourneyMonitorResponse]])
@limiter.limit("60/minute")
async def list_user_journey_monitors(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all active monitored trips for the authenticated traveler."""
    stmt = (
        select(JourneyMonitor)
        .where(JourneyMonitor.user_id == current_user.id, JourneyMonitor.is_active == True)
        .order_by(JourneyMonitor.scheduled_departure.asc())
    )
    res = await db.execute(stmt)
    monitors = res.scalars().all()

    return StandardResponse[List[JourneyMonitorResponse]](
        success=True,
        message=f"Found {len(monitors)} active journey monitors",
        data=[JourneyMonitorResponse.model_validate(m) for m in monitors],
    )


@router.post("/monitors", response_model=StandardResponse[JourneyMonitorResponse])
@limiter.limit("30/minute")
async def create_journey_monitor(
    request: Request,
    payload: JourneyMonitorCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register an upcoming flight, train, or bus journey for 24/7 AI disruption surveillance."""
    now = datetime.now(timezone.utc)
    new_monitor = JourneyMonitor(
        id=uuid.uuid4(),
        user_id=current_user.id,
        booking_id=payload.booking_id,
        trip_booking_id=payload.trip_booking_id,
        service_type=payload.service_type,
        provider_code=payload.provider_code,
        service_number=payload.service_number,
        origin=payload.origin,
        destination=payload.destination,
        scheduled_departure=payload.scheduled_departure,
        scheduled_arrival=payload.scheduled_arrival,
        estimated_departure=payload.scheduled_departure,
        estimated_arrival=payload.scheduled_arrival,
        terminal=payload.terminal,
        gate=payload.gate,
        platform=payload.platform,
        notification_enabled=payload.notification_enabled,
        max_alternative_budget=payload.max_alternative_budget,
        preferred_transport_types=payload.preferred_transport_types,
        last_checked_at=now,
    )
    db.add(new_monitor)
    await db.commit()

    return StandardResponse[JourneyMonitorResponse](
        success=True,
        message=f"Journey {payload.service_number} is now actively monitored",
        data=JourneyMonitorResponse.model_validate(new_monitor),
    )


@router.post("/monitors/{monitor_id}/check", response_model=StandardResponse[Optional[DisruptionEventResponse]])
@limiter.limit("20/minute")
async def check_monitor_status(
    request: Request,
    monitor_id: uuid.UUID,
    force_delay_minutes: Optional[int] = Query(None, description="For testing/demo: force simulated delay in minutes"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers an immediate verification of flight or rail status against authorized providers.
    If a delay/cancellation is detected, runs impact analysis and produces alternatives.
    """
    stmt = select(JourneyMonitor).where(JourneyMonitor.id == monitor_id, JourneyMonitor.user_id == current_user.id)
    res = await db.execute(stmt)
    monitor = res.scalars().first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Journey monitor not found")

    event = await DisruptionEngineService.verify_journey_status(
        session=db,
        monitor=monitor,
        force_delay_test=force_delay_minutes,
    )

    if not event:
        return StandardResponse[Optional[DisruptionEventResponse]](
            success=True,
            message=f"Journey {monitor.service_number} is verified ON TIME. No disruptions detected.",
            data=None,
        )

    # Load with impacts and alternatives
    stmt_ev = (
        select(DisruptionEvent)
        .options(
            selectinload(DisruptionEvent.impacts),
            selectinload(DisruptionEvent.alternatives),
        )
        .where(DisruptionEvent.id == event.id)
    )
    res_ev = await db.execute(stmt_ev)
    loaded_event = res_ev.scalars().first()

    return StandardResponse[Optional[DisruptionEventResponse]](
        success=True,
        message=f"Disruption detected! {loaded_event.event_type} - {loaded_event.delay_minutes} min delay.",
        data=DisruptionEventResponse.model_validate(loaded_event),
    )


@router.get("/events", response_model=StandardResponse[List[DisruptionEventResponse]])
@limiter.limit("60/minute")
async def list_disruption_events(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all disruption alerts and alternative options for the user's active journeys."""
    stmt = (
        select(DisruptionEvent)
        .options(
            selectinload(DisruptionEvent.impacts),
            selectinload(DisruptionEvent.alternatives),
        )
        .where(DisruptionEvent.user_id == current_user.id)
        .order_by(DisruptionEvent.created_at.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    events = res.scalars().all()

    return StandardResponse[List[DisruptionEventResponse]](
        success=True,
        message=f"Found {len(events)} disruption events",
        data=[DisruptionEventResponse.model_validate(e) for e in events],
    )


@router.post("/alternatives/{rec_id}/decision", response_model=StandardResponse[DisruptionDecisionResponse])
@limiter.limit("30/minute")
async def submit_disruption_decision(
    request: Request,
    rec_id: uuid.UUID,
    payload: DisruptionDecisionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    User approval workflow. The AI never charges funds or cancels reservations without
    explicit confirmation.
    """
    stmt = select(AlternativeRecommendation).where(AlternativeRecommendation.id == rec_id)
    res = await db.execute(stmt)
    rec = res.scalars().first()
    if not rec:
        raise HTTPException(status_code=404, detail="Alternative recommendation not found")

    rec.user_decision = payload.decision
    rec.user_decision_at = datetime.now(timezone.utc)
    await db.commit()

    if payload.decision == "accepted":
        return StandardResponse[DisruptionDecisionResponse](
            success=True,
            message=f"Accepted alternative '{rec.title}'. Proceeding to booking re-allocation.",
            data=DisruptionDecisionResponse(
                success=True,
                message=f"Alternative '{rec.title}' authorized by traveler.",
                status="ACCEPTED",
                next_step="checkout",
            ),
        )

    return StandardResponse[DisruptionDecisionResponse](
        success=True,
        message="Alternative declined. Monitoring original journey.",
        data=DisruptionDecisionResponse(
            success=True,
            message="Alternative declined.",
            status="REJECTED",
            next_step=None,
        ),
    )
