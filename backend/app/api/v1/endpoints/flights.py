"""
Flight Search and Seat Map Endpoints with Redis Caching.
"""

import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core.exceptions import NotFoundError
from app.models.flight import Flight, FlightSeat
from app.schemas.flight import FlightResponse, FlightSearchQuery, FlightSearchResponse, FlightSeatResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/flights", tags=["Flights & Aviation"])


@router.get("/search", response_model=FlightSearchResponse, summary="Search Flights with Filters & Caching")
async def search_flights(
    response: Response,
    origin: Optional[str] = Query(None, description="Origin city or airport code (e.g. DAC, CGP, CXB, BKK)"),
    destination: Optional[str] = Query(None, description="Destination city or airport code (e.g. CXB, SPD, SIN)"),
    departure_date: Optional[date] = Query(None, description="Departure date (YYYY-MM-DD)"),
    return_date: Optional[date] = Query(None, description="Return date for round-trip"),
    passengers: int = Query(1, ge=1, le=10),
    cabin_class: Optional[str] = Query(None, description="Economy, Business, First"),
    max_stops: Optional[int] = Query(None, ge=0, le=3),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> FlightSearchResponse:
    """
    Search scheduled flights with origin, destination, date, and seat availability filters.
    Results are cached in Redis.
    """
    search_query = FlightSearchQuery(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        passengers=passengers,
        cabin_class=cabin_class,
        max_stops=max_stops,
        min_price=min_price,
        max_price=max_price,
        page=page,
        page_size=page_size,
    )

    items, total, is_cached = await SearchService.search_flights(db=db, query=search_query)

    response.headers["X-Cache"] = "HIT" if is_cached else "MISS"

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

    return FlightSearchResponse(
        items=[FlightResponse.model_validate(it) for it in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
        cached=is_cached,
    )


@router.get("/{flight_id}/seats", response_model=List[FlightSeatResponse], summary="Get Flight Seat Map")
async def get_flight_seats(
    flight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> List[FlightSeatResponse]:
    """Retrieve seat map and current availability for a flight."""
    # Verify flight exists
    f_res = await db.execute(select(Flight.id).where(Flight.id == flight_id))
    if not f_res.scalar_one_or_none():
        raise NotFoundError("Flight", flight_id)

    stmt = select(FlightSeat).where(FlightSeat.flight_id == flight_id).order_by(FlightSeat.seat_number.asc())
    seats_res = await db.execute(stmt)
    seats = seats_res.scalars().all()

    return [FlightSeatResponse.model_validate(s) for s in seats]
