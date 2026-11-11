"""
Hotel Search and Inventory Endpoints.
"""

import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.exceptions import NotFoundError
from app.core.rate_limit import limiter
from app.repositories.hotel_repository import HotelRepository
from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.hotel import HotelResponse, HotelRoomResponse, HotelSearchQuery
from app.services.search_service import SearchService

router = APIRouter(prefix="/hotels", tags=["Hotels"])


@router.get("/search", response_model=PaginatedResponse[HotelResponse])
@limiter.limit("60/minute")
async def search_hotels(
    request: Request,
    city: str = Query(..., description="Destination city, e.g. Cox's Bazar, Dhaka"),
    check_in: Optional[date] = Query(None, description="Check-in date YYYY-MM-DD"),
    check_out: Optional[date] = Query(None, description="Check-out date YYYY-MM-DD"),
    guests: int = Query(1, ge=1, le=10),
    rooms: int = Query(1, ge=1, le=5),
    min_star_rating: Optional[int] = Query(None, ge=1, le=5),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort_by: Optional[str] = Query("recommended"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search hotels with Redis caching (5-minute TTL).
    Provides paginated query results with star rating and pricing filters.
    """
    search_query = HotelSearchQuery(
        city=city,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        rooms=rooms,
        min_star_rating=min_star_rating,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    return await SearchService.search_hotels(db=db, query=search_query)


@router.get("/{hotel_id}", response_model=StandardResponse[HotelResponse])
async def get_hotel_details(
    hotel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve comprehensive hotel profile including room configurations."""
    repo = HotelRepository(db)
    hotel = await repo.get_hotel_by_id(hotel_id)
    if not hotel:
        raise NotFoundError("Hotel", hotel_id)
    return StandardResponse[HotelResponse](
        success=True,
        message="Hotel details retrieved",
        data=HotelResponse.model_validate(hotel),
    )


@router.get("/{hotel_id}/rooms", response_model=StandardResponse[List[HotelRoomResponse]])
async def get_hotel_rooms(
    hotel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List available room types for a specific hotel."""
    repo = HotelRepository(db)
    hotel = await repo.get_hotel_by_id(hotel_id)
    if not hotel:
        raise NotFoundError("Hotel", hotel_id)

    rooms = [HotelRoomResponse.model_validate(r) for r in hotel.rooms]
    return StandardResponse[List[HotelRoomResponse]](
        success=True,
        message="Hotel rooms retrieved",
        data=rooms,
    )
