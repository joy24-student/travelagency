"""
Price Alerts & Fare Calendar Endpoints.
Zero-Trust RBAC protected, integer paisa precision, 10-alert cap per user,
and 10-minute Redis cache for calendar queries.
"""

from datetime import date
import logging
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.repositories.price_alert_repository import PriceAlertRepository
from app.schemas.price_alert import (
    FareCalendarResponse,
    PriceAlertCreate,
    PriceAlertResponse,
    PriceAlertUpdate,
)
from app.schemas.user import CurrentUser
from app.services.fare_calendar_service import FareCalendarService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Price Alerts & Fare Calendar"])


# ============================================================================
# Fare Calendar Endpoint
# ============================================================================

@router.get(
    "/fares/calendar",
    response_model=FareCalendarResponse,
    summary="Get monthly fare calendar with lowest price per day and AI trend hint",
)
async def get_fare_calendar(
    response: Response,
    origin: str = Query(..., min_length=2, max_length=50, description="Origin code or city (e.g. DAC)"),
    destination: str = Query(..., min_length=2, max_length=50, description="Destination code or city (e.g. CXB)"),
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="Target calendar month (YYYY-MM)"),
    service_type: str = Query("flight", description="Transport type: flight, train, bus, launch"),
    db: AsyncSession = Depends(get_db),
) -> FareCalendarResponse:
    """
    Returns the lowest fare per day across the specified month.
    Includes a predictive price trend hint (BUY_NOW, WAIT, STABLE).
    Responses are cached in Redis for 10 minutes (600s).
    """
    calendar_res = await FareCalendarService.get_fare_calendar(
        db=db,
        origin=origin,
        destination=destination,
        month=month,
        service_type=service_type,
    )
    if calendar_res.cached:
        response.headers["X-Cache"] = "HIT"
    else:
        response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = "public, max-age=600"
    return calendar_res


# ============================================================================
# Price Alerts Endpoints
# ============================================================================

@router.post(
    "/price-alerts",
    response_model=PriceAlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new price alert (Maximum 10 active alerts per user)",
)
async def create_price_alert(
    alert_in: PriceAlertCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PriceAlertResponse:
    """
    Create a new price alert for flight, train, bus, launch, or hotel.
    Enforces a strict maximum of 10 active alerts per user at both API and DB trigger levels.
    """
    repo = PriceAlertRepository(db)
    alert = await repo.create_alert(user_id=current_user.id, data=alert_in)
    return PriceAlertResponse.model_validate(alert)


@router.get(
    "/price-alerts",
    response_model=List[PriceAlertResponse],
    summary="List all price alerts for the authenticated user",
)
async def list_price_alerts(
    status: Optional[str] = Query(None, description="Filter by status: active, triggered, paused, expired"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[PriceAlertResponse]:
    """
    List all price alerts belonging to the authenticated traveler.
    """
    repo = PriceAlertRepository(db)
    alerts = await repo.list_alerts_for_user(user_id=current_user.id, status=status)
    return [PriceAlertResponse.model_validate(a) for a in alerts]


@router.patch(
    "/price-alerts/{alert_id}",
    response_model=PriceAlertResponse,
    summary="Update or pause/resume a price alert",
)
async def update_price_alert(
    alert_id: uuid.UUID,
    update_data: PriceAlertUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PriceAlertResponse:
    """
    Update target price, percentage drop threshold, or toggle status (e.g. pause/active).
    """
    repo = PriceAlertRepository(db)
    updated = await repo.update_alert(
        alert_id=alert_id,
        user_id=current_user.id,
        update_data=update_data,
    )
    return PriceAlertResponse.model_validate(updated)


@router.delete(
    "/price-alerts/{alert_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a price alert",
)
async def delete_price_alert(
    alert_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a price alert owned by the authenticated user.
    """
    repo = PriceAlertRepository(db)
    await repo.delete_alert(alert_id=alert_id, user_id=current_user.id)
    return {"success": True, "message": "Price alert deleted successfully", "id": str(alert_id)}
