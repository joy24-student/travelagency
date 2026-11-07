"""
Hotel Data Access Repository.
Handles parameterized filtering, pagination, and concurrency locks on room inventories.
"""

import uuid
from datetime import date
from typing import Any, Dict, List, Optional, Sequence, Tuple
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.hotel import Hotel, HotelReview, HotelRoom, HotelRoomAvailability
from app.repositories.base import BaseRepository


class HotelRepository(BaseRepository[Hotel]):

    def __init__(self, db: AsyncSession):
        super().__init__(Hotel, db)

    async def search_hotels(
        self,
        city: str,
        min_star_rating: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        amenities: Optional[List[str]] = None,
        sort_by: Optional[str] = "recommended",
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[Sequence[Hotel], int]:
        """
        Execute filtered, paginated query across hotels.
        """
        filters = [
            Hotel.is_active.is_(True),
            func.lower(Hotel.city).contains(city.strip().lower()),
        ]

        if min_star_rating is not None:
            filters.append(Hotel.star_rating >= min_star_rating)

        # Base query with eager-loading rooms for display
        base_query = (
            select(Hotel)
            .where(and_(*filters))
            .options(selectinload(Hotel.rooms))
        )

        # Sorting logic
        if sort_by == "rating":
            base_query = base_query.order_by(Hotel.review_score.desc(), Hotel.star_rating.desc())
        else:
            base_query = base_query.order_by(Hotel.is_featured.desc(), Hotel.review_score.desc())

        # Count total matches
        count_query = select(func.count(Hotel.id)).where(and_(*filters))
        total_res = await self.db.execute(count_query)
        total = total_res.scalar_one() or 0

        # Execute paginated query
        paged_query = base_query.offset(offset).limit(limit)
        res = await self.db.execute(paged_query)
        hotels = res.scalars().all()

        return hotels, total

    async def get_hotel_by_id(self, hotel_id: uuid.UUID) -> Optional[Hotel]:
        """Retrieve hotel with rooms and reviews."""
        stmt = (
            select(Hotel)
            .where(Hotel.id == hotel_id)
            .options(selectinload(Hotel.rooms), selectinload(Hotel.reviews))
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def lock_room_for_update(self, room_id: uuid.UUID) -> Optional[HotelRoom]:
        """
        Lock a specific hotel room row using PostgreSQL row-level locking (SELECT ... FOR UPDATE).
        Guarantees isolation during concurrent booking creation.
        """
        stmt = select(HotelRoom).where(HotelRoom.id == room_id).with_for_update()
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def check_and_reserve_availability(
        self,
        room_id: uuid.UUID,
        start_date: date,
        end_date: date,
        quantity: int,
    ) -> bool:
        """
        Lock availability rows and ensure sufficient inventory exists across the date range.
        Decrements available_count atomically.
        """
        stmt = (
            select(HotelRoomAvailability)
            .where(
                and_(
                    HotelRoomAvailability.room_id == room_id,
                    HotelRoomAvailability.available_date >= start_date,
                    HotelRoomAvailability.available_date <= end_date,
                )
            )
            .with_for_update()
        )
        res = await self.db.execute(stmt)
        records = res.scalars().all()

        # If explicit availability records exist, ensure all dates have count >= quantity
        for rec in records:
            if rec.is_blocked or rec.available_count < quantity:
                return False

        # Decrement counts
        for rec in records:
            rec.available_count -= quantity

        return True
