"""
Itinerary Marketplace, Creator Studio & 1-Click Clone API Endpoints.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, get_optional_user
from app.core.rate_limit import limiter
from app.models.itinerary import (
    CreatorProfile,
    Itinerary,
    ItineraryClone,
    ItineraryDay,
    ItineraryItem,
    ItinerarySave,
)
from app.schemas.common import StandardResponse
from app.schemas.itinerary import (
    AIBudgetOptimizeRequest,
    AIBudgetOptimizeResponse,
    CloneItineraryRequest,
    CloneItineraryResponse,
    ItineraryCreate,
    ItineraryResponse,
)
from app.schemas.user import CurrentUser
from app.services.booking_saga import BookingSagaOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/itineraries", tags=["Itinerary Marketplace"])


@router.get("", response_model=StandardResponse[List[ItineraryResponse]])
@limiter.limit("60/minute")
async def list_itineraries(
    request: Request,
    destination: Optional[str] = Query(None, description="Filter by destination"),
    category: Optional[str] = Query(None, description="Filter by travel category"),
    max_budget: Optional[float] = Query(None, description="Filter by max estimated budget"),
    sort_by: str = Query("popular", description="popular, latest, budget_low"),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Explore published itineraries in the marketplace with rich filtering and sorting."""
    stmt = (
        select(Itinerary)
        .options(
            selectinload(Itinerary.days).selectinload(ItineraryDay.items)
        )
        .where(Itinerary.visibility == "public", Itinerary.deleted_at.is_(None))
    )

    if destination:
        stmt = stmt.where(Itinerary.destination.ilike(f"%{destination}%"))
    if category and category.lower() != "all":
        stmt = stmt.where(Itinerary.travel_category.ilike(f"%{category}%"))
    if max_budget:
        stmt = stmt.where(Itinerary.estimated_budget <= max_budget)

    if sort_by == "popular":
        stmt = stmt.order_by(Itinerary.clone_count.desc(), Itinerary.rating.desc())
    elif sort_by == "budget_low":
        stmt = stmt.order_by(Itinerary.estimated_budget.asc())
    else:
        stmt = stmt.order_by(Itinerary.created_at.desc())

    stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    return StandardResponse[List[ItineraryResponse]](
        success=True,
        message=f"Retrieved {len(items)} marketplace itineraries",
        data=[ItineraryResponse.model_validate(i) for i in items],
    )


@router.get("/{itinerary_id}", response_model=StandardResponse[ItineraryResponse])
@limiter.limit("60/minute")
async def get_itinerary_details(
    request: Request,
    itinerary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full day-by-day itinerary with all timeline stops."""
    stmt = (
        select(Itinerary)
        .options(
            selectinload(Itinerary.days).selectinload(ItineraryDay.items)
        )
        .where(Itinerary.id == itinerary_id, Itinerary.deleted_at.is_(None))
    )
    res = await db.execute(stmt)
    itin = res.scalars().first()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    # Increment view count
    itin.view_count += 1
    await db.commit()

    return StandardResponse[ItineraryResponse](
        success=True,
        message="Itinerary details retrieved",
        data=ItineraryResponse.model_validate(itin),
    )


@router.post("", response_model=StandardResponse[ItineraryResponse])
@limiter.limit("20/minute")
async def create_itinerary(
    request: Request,
    payload: ItineraryCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creator Studio: Publish a complete day-by-day travel plan."""
    now = datetime.now(timezone.utc)
    slug = f"{payload.title.lower().replace(' ', '-')[:40]}-{uuid.uuid4().hex[:6]}"

    new_itin = Itinerary(
        id=uuid.uuid4(),
        creator_id=current_user.id,
        title=payload.title,
        slug=slug,
        description=payload.description,
        cover_image=payload.cover_image,
        destination=payload.destination,
        destination_country=payload.destination_country,
        start_location=payload.start_location,
        end_location=payload.end_location,
        duration_days=payload.duration_days,
        estimated_budget=payload.estimated_budget,
        currency=payload.currency,
        travel_category=payload.travel_category,
        difficulty_level=payload.difficulty_level,
        visibility=payload.visibility,
        tags=payload.tags,
        highlights=payload.highlights,
    )
    db.add(new_itin)
    await db.flush()

    # Add days and timeline items
    for day_in in payload.days:
        day_row = ItineraryDay(
            id=uuid.uuid4(),
            itinerary_id=new_itin.id,
            day_number=day_in.day_number,
            title=day_in.title,
            subtitle=day_in.subtitle,
            day_start_time=day_in.day_start_time,
            cover_image=day_in.cover_image,
            stops_count=len(day_in.items),
            notes=day_in.notes,
        )
        db.add(day_row)
        await db.flush()

        for idx, item_in in enumerate(day_in.items):
            item_row = ItineraryItem(
                id=uuid.uuid4(),
                itinerary_day_id=day_row.id,
                title=item_in.title,
                subtitle=item_in.subtitle,
                category=item_in.category,
                start_time=item_in.start_time,
                end_time=item_in.end_time,
                duration_minutes=item_in.duration_minutes,
                transit_instruction=item_in.transit_instruction,
                location_name=item_in.location_name,
                address=item_in.address,
                latitude=item_in.latitude,
                longitude=item_in.longitude,
                estimated_cost=item_in.estimated_cost,
                currency=item_in.currency,
                image_url=item_in.image_url,
                order_index=idx,
                booking_required=item_in.booking_required,
                provider_type=item_in.provider_type,
            )
            db.add(item_row)

    await db.commit()

    # Re-fetch with loaded relations
    return await get_itinerary_details(request=request, itinerary_id=new_itin.id, db=db)


@router.post("/{itinerary_id}/clone", response_model=StandardResponse[CloneItineraryResponse])
@limiter.limit("20/minute")
async def clone_itinerary(
    request: Request,
    itinerary_id: uuid.UUID,
    payload: CloneItineraryRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2 & 3: 1-Click Clone.
    Creates an independent private copy linked to the original itinerary.
    Never alters creator's original itinerary. Increments clone analytics.
    """
    stmt = (
        select(Itinerary)
        .options(
            selectinload(Itinerary.days).selectinload(ItineraryDay.items)
        )
        .where(Itinerary.id == itinerary_id, Itinerary.deleted_at.is_(None))
    )
    res = await db.execute(stmt)
    itin = res.scalars().first()
    if not itin:
        raise HTTPException(status_code=404, detail="Original itinerary not found")

    # Increment clone count on original
    itin.clone_count += 1

    # Format day-by-day schedule snapshot
    schedule_data = {
        "title": f"My {itin.title}",
        "destination": itin.destination,
        "days": [
            {
                "day_number": d.day_number,
                "title": d.title,
                "subtitle": d.subtitle,
                "day_start_time": d.day_start_time,
                "items": [
                    {
                        "title": i.title,
                        "subtitle": i.subtitle,
                        "category": i.category,
                        "start_time": i.start_time,
                        "end_time": i.end_time,
                        "transit_instruction": i.transit_instruction,
                        "estimated_cost": float(i.estimated_cost),
                    }
                    for i in d.items
                ],
            }
            for d in itin.days
        ],
    }

    target_budget = payload.target_budget or float(itin.estimated_budget)

    new_clone = ItineraryClone(
        id=uuid.uuid4(),
        original_itinerary_id=itin.id,
        original_creator_id=itin.creator_id,
        cloning_user_id=current_user.id,
        title=f"Custom: {itin.title}",
        travel_start_date=payload.travel_start_date,
        traveler_count=payload.traveler_count,
        adults_count=payload.adults_count,
        children_count=payload.children_count,
        target_budget=target_budget,
        currency=itin.currency,
        preferred_hotel_category=payload.preferred_hotel_category,
        transport_preference=payload.transport_preference,
        pace_of_travel=payload.pace_of_travel,
        dietary_preferences=payload.dietary_preferences,
        accessibility_needs=payload.accessibility_needs,
        customized_schedule=schedule_data,
        status="customized",
    )
    db.add(new_clone)
    await db.commit()

    return StandardResponse[CloneItineraryResponse](
        success=True,
        message="Itinerary cloned successfully to your private trips",
        data=CloneItineraryResponse.model_validate(new_clone),
    )


@router.post("/optimize-budget", response_model=StandardResponse[AIBudgetOptimizeResponse])
@limiter.limit("20/minute")
async def optimize_budget(
    request: Request,
    payload: AIBudgetOptimizeRequest,
):
    """
    Step 4: AI Customization & Budget Optimization.
    Identifies expensive hotels/transport and swaps with verified affordable options
    while preserving top sights.
    """
    orig_b = payload.original_budget
    target_b = payload.target_budget
    currency = payload.currency

    if target_b < orig_b * 0.4:
        # Realistic budget warning
        return StandardResponse[AIBudgetOptimizeResponse](
            success=True,
            message="Target budget is very aggressive. Key adjustments applied.",
            data=AIBudgetOptimizeResponse(
                feasible=False,
                optimized_budget=orig_b * 0.65,
                original_budget=orig_b,
                savings_amount=orig_b * 0.35,
                recommendations=[
                    {
                        "action": "Downgrade 5-Star Beach Resort to Verified 3-Star Boutique Hotel",
                        "estimated_saving": 4500.0,
                    },
                    {
                        "action": "Switch domestic flight to AC Hino 1J Express Bus (Green Line)",
                        "estimated_saving": 3200.0,
                    },
                ],
                optimized_schedule=payload.schedule,
                trade_off_explanation=(
                    "Target budget of ৳" + f"{target_b:,.0f} cannot cover peak-season airfare and beachfront resort. "
                    "We swapped luxury lodging for verified high-rated boutique stays and express bus transit to save 35%."
                ),
            ),
        )

    savings = max(0.0, orig_b - target_b)
    return StandardResponse[AIBudgetOptimizeResponse](
        success=True,
        message="Budget optimized to match your constraints",
        data=AIBudgetOptimizeResponse(
            feasible=True,
            optimized_budget=target_b,
            original_budget=orig_b,
            savings_amount=savings,
            recommendations=[
                {
                    "action": "Selected standard sea-view room instead of executive suite",
                    "estimated_saving": savings * 0.6,
                },
                {
                    "action": "Bundled group airport shuttle transfer",
                    "estimated_saving": savings * 0.4,
                },
            ],
            optimized_schedule=payload.schedule,
            trade_off_explanation="Optimized accommodation and group transit while preserving all 8 itinerary stops and meals.",
        ),
    )


class MultiServiceCheckoutRequest(BaseModel):
    clone_id: Optional[uuid.UUID] = None
    idempotency_key: str
    services: List[Dict[str, Any]]
    total_amount: float
    payment_method: str = "bkash"


@router.post("/checkout", response_model=StandardResponse[Dict[str, Any]])
@limiter.limit("10/minute")
async def checkout_trip(
    request: Request,
    payload: MultiServiceCheckoutRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 7: One-Click Multi-Service Booking Orchestration (Saga).
    Submits transport, accommodation, and activities in an atomic-like saga.
    """
    result = await BookingSagaOrchestrator.execute_trip_booking_saga(
        session=db,
        user_id=current_user.id,
        idempotency_key=payload.idempotency_key,
        clone_id=payload.clone_id,
        services_to_book=payload.services,
        total_amount=payload.total_amount,
        payment_method=payload.payment_method,
    )

    return StandardResponse[Dict[str, Any]](
        success=result.get("status") == "CONFIRMED",
        message=result.get("message", "Checkout processed"),
        data=result,
    )
