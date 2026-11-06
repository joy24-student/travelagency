"""
Hotel Search and Inventory Endpoints with Redis Caching.
"""

import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core.exceptions import NotFoundError
from app.models.hotel import Hotel
from app.schemas.hotel import HotelResponse, HotelSearchQuery, HotelSearchResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/hotels", tags=["Hotels & Lodging"])


@router.get("/search", response_model=HotelSearchResponse, summary="Search Hotels with Filters & Caching")
async def search_hotels(
    response: Response,
    city: Optional[str] = Query(None, description="City name (e.g. Cox's Bazar, Dhaka, Sylhet)"),
    country: Optional[str] = Query(None, description="Country filter"),
    query: Optional[str] = Query(None, description="Free text query (name or location)"),
    check_in: Optional[date] = Query(None, description="Check-in date (YYYY-MM-DD)"),
    check_out: Optional[date] = Query(None, description="Check-out date (YYYY-MM-DD)"),
    guests: int = Query(1, ge=1, le=20),
    rooms_needed: int = Query(1, ge=1, le=10),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> HotelSearchResponse:
    """
    Search available hotels with price, location, rating, and date filters.
    Results are cached in Redis with high cache-hit ratio.
    """
    search_query = HotelSearchQuery(
        city=city,
        country=country,
        query=query,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        rooms_needed=rooms_needed,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        page=page,
        page_size=page_size,
    )

    items, total, is_cached = await SearchService.search_hotels(db=db, query=search_query)

    # Set cache indicator header
    response.headers["X-Cache"] = "HIT" if is_cached else "MISS"

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

    return HotelSearchResponse(
        items=[HotelResponse.model_validate(it) for it in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
        cached=is_cached,
    )


@router.get("/{hotel_id}", response_model=HotelResponse, summary="Get Hotel Details by ID")
async def get_hotel_details(
    hotel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> HotelResponse:
    """Retrieve full hotel information including rooms, amenities, and reviews."""
    stmt = (
        select(Hotel)
        .where(Hotel.id == hotel_id)
        .options(selectinload(Hotel.rooms))
    )
    res = await db.execute(stmt)
    hotel = res.scalar_one_or_none()
    if not hotel:
        raise NotFoundError("Hotel", hotel_id)

    return HotelResponse.model_validate(hotel)
