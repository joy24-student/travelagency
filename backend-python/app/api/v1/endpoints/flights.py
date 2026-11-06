"""
Flight Search and Aviation Endpoints.
"""

import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError
from app.core.rate_limit import limiter
from app.core.redis import get_redis
from app.repositories.flight_repository import FlightRepository
from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.flight import (
    FlightResponse,
    FlightSearchQuery,
    FlightSeatResponse,
    SeatLockResponse,
)
from app.schemas.user import CurrentUser, UserRole
from app.services.search_service import SearchService

router = APIRouter(prefix="/flights", tags=["Flights"])


@router.get("/search", response_model=PaginatedResponse[FlightResponse])
@limiter.limit("60/minute")
async def search_flights(
    request: Request,
    origin: str = Query(..., description="Origin airport code or city"),
    destination: str = Query(..., description="Destination airport code or city"),
    departure_date: Optional[date] = Query(None, description="Flight date YYYY-MM-DD"),
    return_date: Optional[date] = Query(None, description="Return date for round-trips"),
    passengers: int = Query(1, ge=1, le=9),
    cabin_class: Optional[str] = Query("economy"),
    max_price: Optional[float] = Query(None, ge=0),
    airline_code: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search scheduled flights with Redis caching (5-minute TTL).
    Returns paginated flight routes matching origin and destination.
    """
    search_query = FlightSearchQuery(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        passengers=passengers,
        cabin_class=cabin_class,
        max_price=max_price,
        airline_code=airline_code,
        page=page,
        page_size=page_size,
    )
    return await SearchService.search_flights(db=db, query=search_query)


@router.get("/{flight_id}", response_model=StandardResponse[FlightResponse])
async def get_flight_details(
    flight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full flight itinerary details."""
    repo = FlightRepository(db)
    flight = await repo.get_flight_by_id(flight_id)
    if not flight:
        raise NotFoundError("Flight", flight_id)
    return StandardResponse[FlightResponse](
        success=True,
        message="Flight details retrieved",
        data=FlightResponse.model_validate(flight),
    )


@router.get("/{flight_id}/seats", response_model=StandardResponse[List[FlightSeatResponse]])
async def get_flight_seat_map(
    flight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve available seats and cabin configuration for a flight."""
    repo = FlightRepository(db)
    flight = await repo.get_flight_by_id(flight_id)
    if not flight:
        raise NotFoundError("Flight", flight_id)

    seats = [FlightSeatResponse.model_validate(s) for s in flight.seats]
    return StandardResponse[List[FlightSeatResponse]](
        success=True,
        message="Flight seat layout retrieved",
        data=seats,
    )


@router.post("/{flight_id}/seats/{seat_id}/lock", response_model=StandardResponse[SeatLockResponse])
async def lock_flight_seat(
    flight_id: uuid.UUID,
    seat_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Temporarily lock a seat for checkout to prevent double-booking collisions.
    Uses Redis with configurable TTL (default 10 mins).
    """
    repo = FlightRepository(db)
    seat = await repo.get_seat_by_id(seat_id)
    if not seat or seat.flight_id != flight_id:
        raise NotFoundError("FlightSeat", seat_id)

    if not seat.is_available:
        raise ConflictError(f"Seat '{seat.seat_number}' has already been booked.")

    redis = await get_redis()
    lock_key = f"seat_lock:{seat_id}"
    ttl = settings.SEAT_LOCK_TTL_SECONDS

    if redis:
        try:
            current_holder = await redis.get(lock_key)
            if current_holder and current_holder != str(current_user.id):
                raise ConflictError(f"Seat '{seat.seat_number}' is temporarily held by another traveler.")
            await redis.set(lock_key, str(current_user.id), ex=ttl)
        except ConflictError:
            raise
        except Exception:
            pass  # Fallback gracefully if Redis is momentarily unavailable

    return StandardResponse[SeatLockResponse](
        success=True,
        message=f"Seat '{seat.seat_number}' successfully locked for {ttl} seconds",
        data=SeatLockResponse(
            seat_id=seat_id,
            flight_id=flight_id,
            locked_by=current_user.id,
            status="locked",
            expires_in_seconds=ttl,
        ),
    )


@router.delete("/{flight_id}/seats/{seat_id}/lock", response_model=StandardResponse[dict])
async def release_flight_seat_lock(
    flight_id: uuid.UUID,
    seat_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Release temporary seat lock if checkout is abandoned or changed.
    """
    repo = FlightRepository(db)
    seat = await repo.get_seat_by_id(seat_id)
    if not seat or seat.flight_id != flight_id:
        raise NotFoundError("FlightSeat", seat_id)

    redis = await get_redis()
    lock_key = f"seat_lock:{seat_id}"

    if redis:
        try:
            holder = await redis.get(lock_key)
            is_admin = current_user.role == UserRole.ADMIN or UserRole.ADMIN.value in current_user.roles
            if holder and (holder == str(current_user.id) or is_admin):
                await redis.delete(lock_key)
        except Exception:
            pass

    return StandardResponse[dict](
        success=True,
        message=f"Seat '{seat.seat_number}' lock successfully released",
        data={"seat_id": str(seat_id), "status": "released"},
    )
