"""
Flight Data Access Repository.
Handles aviation searches, seat selections, and atomic concurrency locks for flight reservations.
"""

import uuid
from datetime import date, datetime
from typing import List, Optional, Sequence, Tuple
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.flight import Airline, Airport, Flight, FlightSeat
from app.repositories.base import BaseRepository


class FlightRepository(BaseRepository[Flight]):

    def __init__(self, db: AsyncSession):
        super().__init__(Flight, db)

    async def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: Optional[date] = None,
        cabin_class: Optional[str] = "economy",
        max_price: Optional[float] = None,
        airline_code: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[Sequence[Flight], int]:
        """
        Search scheduled flights matching origin and destination criteria.
        """
        # Alias or join Airport tables for origin and destination
        origin_airport = select(Airport.id).where(
            or_(
                func.upper(Airport.code) == origin.strip().upper(),
                func.lower(Airport.city) == origin.strip().lower(),
            )
        )
        dest_airport = select(Airport.id).where(
            or_(
                func.upper(Airport.code) == destination.strip().upper(),
                func.lower(Airport.city) == destination.strip().lower(),
            )
        )

        filters = [
            Flight.status == "scheduled",
            Flight.available_seats > 0,
            Flight.origin_airport_id.in_(origin_airport),
            Flight.destination_airport_id.in_(dest_airport),
        ]

        if departure_date is not None:
            # Match departure on specific calendar date
            filters.append(func.date(Flight.departure_time) == departure_date)

        if max_price is not None:
            filters.append(Flight.base_price <= max_price)

        if airline_code is not None:
            airline_sub = select(Airline.id).where(func.upper(Airline.code) == airline_code.strip().upper())
            filters.append(Flight.airline_id.in_(airline_sub))

        # Base query with eager loading
        base_query = (
            select(Flight)
            .where(and_(*filters))
            .options(
                selectinload(Flight.airline),
                selectinload(Flight.origin_airport),
                selectinload(Flight.destination_airport),
            )
            .order_by(Flight.base_price.asc(), Flight.departure_time.asc())
        )

        # Count total matches
        count_query = select(func.count(Flight.id)).where(and_(*filters))
        total_res = await self.db.execute(count_query)
        total = total_res.scalar_one() or 0

        # Execute paginated query
        paged_query = base_query.offset(offset).limit(limit)
        res = await self.db.execute(paged_query)
        flights = res.scalars().all()

        return flights, total

    async def get_flight_by_id(self, flight_id: uuid.UUID) -> Optional[Flight]:
        """Fetch flight details along with seats."""
        stmt = (
            select(Flight)
            .where(Flight.id == flight_id)
            .options(
                selectinload(Flight.airline),
                selectinload(Flight.origin_airport),
                selectinload(Flight.destination_airport),
                selectinload(Flight.seats),
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def lock_flight_for_update(self, flight_id: uuid.UUID) -> Optional[Flight]:
        """Lock flight record for seat count deduction (SELECT ... FOR UPDATE)."""
        stmt = select(Flight).where(Flight.id == flight_id).with_for_update()
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_seat_by_id(self, seat_id: uuid.UUID) -> Optional[FlightSeat]:
        """Fetch seat by UUID."""
        stmt = select(FlightSeat).where(FlightSeat.id == seat_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def lock_seat_for_update(self, seat_id: uuid.UUID) -> Optional[FlightSeat]:
        """Lock specific seat row for reservation (SELECT ... FOR UPDATE)."""
        stmt = select(FlightSeat).where(FlightSeat.id == seat_id).with_for_update()
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()
