"""
Search Service for Flights and Hotels with Redis Caching and PostgreSQL queries.
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.redis import CacheService
from app.models.flight import Airline, Airport, Flight
from app.models.hotel import Hotel, HotelRoom, HotelRoomAvailability
from app.schemas.flight import FlightResponse, FlightSearchQuery
from app.schemas.hotel import HotelResponse, HotelSearchQuery

logger = logging.getLogger(__name__)


def generate_cache_key(prefix: str, params: Dict[str, Any]) -> str:
    """Generate SHA256 hashed cache key from sorted query parameters."""
    clean_params = {k: str(v) for k, v in sorted(params.items()) if v is not None}
    param_str = json.dumps(clean_params, sort_keys=True)
    digest = hashlib.sha256(param_str.encode("utf-8")).hexdigest()[:24]
    return f"{prefix}:{digest}"


class SearchService:

    @staticmethod
    async def search_hotels(
        db: AsyncSession,
        query: HotelSearchQuery,
    ) -> Tuple[List[Dict[str, Any]], int, bool]:
        """
        Search hotels with multi-criteria filters and Redis caching.
        Returns: (items_data, total_count, is_cached)
        """
        cache_key = generate_cache_key("search:hotels", query.model_dump())

        # 1. Check Redis Cache
        cached_result = await CacheService.get_json(cache_key)
        if cached_result:
            logger.info(f"Cache HIT for hotel search: {cache_key}")
            return cached_result.get("items", []), cached_result.get("total", 0), True

        logger.info(f"Cache MISS for hotel search: {cache_key}. Executing PostgreSQL query.")

        # 2. Build PostgreSQL Query
        stmt = select(Hotel).options(selectinload(Hotel.rooms))
        count_stmt = select(func.count(Hotel.id))

        filters = []

        if query.city:
            filters.append(Hotel.city.ilike(f"%{query.city}%"))

        if query.country:
            filters.append(Hotel.country.ilike(f"%{query.country}%"))

        if query.query:
            term = f"%{query.query}%"
            filters.append(
                or_(
                    Hotel.name.ilike(term),
                    Hotel.city.ilike(term),
                    Hotel.description.ilike(term),
                )
            )

        if query.min_price is not None:
            filters.append(Hotel.base_price >= query.min_price)

        if query.max_price is not None:
            filters.append(Hotel.base_price <= query.max_price)

        if query.min_rating is not None:
            filters.append(Hotel.star_rating >= query.min_rating)

        if filters:
            stmt = stmt.where(*filters)
            count_stmt = count_stmt.where(*filters)

        # Get total matching records
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(Hotel.is_featured.desc(), Hotel.average_rating.desc()).offset(offset).limit(query.page_size)

        res = await db.execute(stmt)
        hotels = res.scalars().all()

        # Convert to serialized dicts for caching
        items_data = [
            HotelResponse.model_validate(h).model_dump(mode="json")
            for h in hotels
        ]

        # 3. Store in Redis
        cache_payload = {"items": items_data, "total": total}
        await CacheService.set_json(cache_key, cache_payload, ttl=settings.REDIS_CACHE_TTL_SECONDS)

        return items_data, total, False

    @staticmethod
    async def search_flights(
        db: AsyncSession,
        query: FlightSearchQuery,
    ) -> Tuple[List[Dict[str, Any]], int, bool]:
        """
        Search flights with airport, date, price, and seat filters with Redis caching.
        Returns: (items_data, total_count, is_cached)
        """
        cache_key = generate_cache_key("search:flights", query.model_dump())

        # 1. Check Redis Cache
        cached_result = await CacheService.get_json(cache_key)
        if cached_result:
            logger.info(f"Cache HIT for flight search: {cache_key}")
            return cached_result.get("items", []), cached_result.get("total", 0), True

        logger.info(f"Cache MISS for flight search: {cache_key}. Executing PostgreSQL query.")

        # 2. Build PostgreSQL Query
        stmt = (
            select(Flight)
            .options(
                selectinload(Flight.airline),
                selectinload(Flight.departure_airport),
                selectinload(Flight.arrival_airport),
            )
        )
        count_stmt = select(func.count(Flight.id))

        filters = []

        # Available seats check
        filters.append(Flight.available_seats >= query.passengers)

        # Origin filter (by city or IATA)
        if query.origin:
            origin_term = f"%{query.origin}%"
            filters.append(
                Flight.departure_airport.has(
                    or_(
                        Airport.iata_code.ilike(query.origin),
                        Airport.city.ilike(origin_term),
                    )
                )
            )

        # Destination filter (by city or IATA)
        if query.destination:
            dest_term = f"%{query.destination}%"
            filters.append(
                Flight.arrival_airport.has(
                    or_(
                        Airport.iata_code.ilike(query.destination),
                        Airport.city.ilike(dest_term),
                    )
                )
            )

        # Departure date filter
        if query.departure_date:
            filters.append(func.date(Flight.departure_time) == query.departure_date)

        # Cabin class filter
        if query.cabin_class:
            filters.append(Flight.cabin_class.ilike(query.cabin_class))

        # Max stops filter
        if query.max_stops is not None:
            filters.append(Flight.stops <= query.max_stops)

        # Price range filter
        if query.min_price is not None:
            filters.append(Flight.base_price >= query.min_price)
        if query.max_price is not None:
            filters.append(Flight.base_price <= query.max_price)

        if filters:
            stmt = stmt.where(*filters)
            count_stmt = count_stmt.where(*filters)

        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(Flight.departure_time.asc(), Flight.base_price.asc()).offset(offset).limit(query.page_size)

        res = await db.execute(stmt)
        flights = res.scalars().all()

        items_data = [
            FlightResponse.model_validate(f).model_dump(mode="json")
            for f in flights
        ]

        # 3. Store in Redis
        cache_payload = {"items": items_data, "total": total}
        await CacheService.set_json(cache_key, cache_payload, ttl=settings.REDIS_CACHE_TTL_SECONDS)

        return items_data, total, False
