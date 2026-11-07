"""
Search Domain Service with Distributed Two-Tier Caching & Thundering-Herd Defense.
Coordinates high-throughput queries between L1 (Memory), L2 (Redis Cluster),
and the underlying PostgreSQL / GDS persistence layer.
"""

import hashlib
import json
import logging
from typing import Any, Dict, Optional, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_service
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.repositories.flight_repository import FlightRepository
from app.repositories.hotel_repository import HotelRepository
from app.schemas.common import PaginatedResponse
from app.schemas.flight import FlightResponse, FlightSearchQuery
from app.schemas.hotel import HotelResponse, HotelSearchQuery

logger = logging.getLogger(__name__)


class SearchService:

    @staticmethod
    def _generate_cache_key(prefix: str, params: Dict[str, Any]) -> str:
        """Create deterministic SHA256 hashed cache key from query parameters."""
        serialized = json.dumps(params, sort_keys=True, default=str)
        hash_digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]
        return f"cache:{prefix}:{hash_digest}"

    @staticmethod
    async def search_hotels(
        db: AsyncSession,
        query: HotelSearchQuery,
        with_cache_meta: bool = False,
    ) -> Union[PaginatedResponse[HotelResponse], Tuple[PaginatedResponse[HotelResponse], str, str]]:
        """
        Search hotels with Two-Tier Caching, Brotli Compression, and Thundering-Herd Defense.
        Hot destinations (Cox's Bazar, Sylhet) utilize L1 15s TTL; L2 distributed TTL is 15 mins.
        """
        cache_key = SearchService._generate_cache_key("hotels", query.model_dump())
        is_hot = cache_service.is_hot_hotel_city(query.city)
        l1_ttl = settings.CACHE_L1_HOT_TTL_SECONDS if is_hot else settings.L1_CACHE_TTL_SECONDS
        l2_ttl = settings.CACHE_L2_TTL_SECONDS  # 15 minutes = 900s

        async def _query_hotel_db() -> Dict[str, Any]:
            async def _run(session: AsyncSession) -> Dict[str, Any]:
                repo = HotelRepository(session)
                offset = (query.page - 1) * query.page_size
                hotels, total = await repo.search_hotels(
                    city=query.city,
                    min_star_rating=query.min_star_rating,
                    min_price=query.min_price,
                    max_price=query.max_price,
                    amenities=query.amenities,
                    sort_by=query.sort_by,
                    offset=offset,
                    limit=query.page_size,
                )
                items = [HotelResponse.model_validate(h).model_dump() for h in hotels]
                total_pages = (total + query.page_size - 1) // query.page_size if total > 0 else 1
                return {
                    "items": items,
                    "total": total,
                    "page": query.page,
                    "page_size": query.page_size,
                    "total_pages": total_pages,
                    "has_next": query.page < total_pages,
                    "has_prev": query.page > 1,
                }

            if db and db.is_active:
                return await _run(db)
            else:
                async with AsyncSessionLocal() as session:
                    return await _run(session)

        data, tier, status = await cache_service.get_or_compute_with_thundering_herd_defense(
            key=cache_key,
            compute_fn=_query_hotel_db,
            ttl=l2_ttl,
            l1_ttl=l1_ttl,
            is_hot=is_hot,
            swr_window=86400,
        )

        resp = PaginatedResponse[HotelResponse](**data)
        if with_cache_meta:
            return resp, tier, status
        return resp

    @staticmethod
    async def search_flights(
        db: AsyncSession,
        query: FlightSearchQuery,
        with_cache_meta: bool = False,
    ) -> Union[PaginatedResponse[FlightResponse], Tuple[PaginatedResponse[FlightResponse], str, str]]:
        """
        Search scheduled flights with Two-Tier Caching, Brotli Compression, and Thundering-Herd Defense.
        Hot travel routes (e.g. DAC ➔ CXB, DAC ➔ SYL) utilize L1 15s TTL; L2 distributed TTL is 15 mins.
        """
        cache_key = SearchService._generate_cache_key("flights", query.model_dump())
        is_hot = cache_service.is_hot_flight_route(query.origin, query.destination)
        l1_ttl = settings.CACHE_L1_HOT_TTL_SECONDS if is_hot else settings.L1_CACHE_TTL_SECONDS
        l2_ttl = settings.CACHE_L2_TTL_SECONDS  # 15 minutes = 900s

        async def _query_flight_db() -> Dict[str, Any]:
            async def _run(session: AsyncSession) -> Dict[str, Any]:
                repo = FlightRepository(session)
                offset = (query.page - 1) * query.page_size
                flights, total = await repo.search_flights(
                    origin=query.origin,
                    destination=query.destination,
                    departure_date=query.departure_date,
                    cabin_class=query.cabin_class,
                    max_price=query.max_price,
                    airline_code=query.airline_code,
                    offset=offset,
                    limit=query.page_size,
                )
                items = [FlightResponse.model_validate(f).model_dump() for f in flights]
                total_pages = (total + query.page_size - 1) // query.page_size if total > 0 else 1
                return {
                    "items": items,
                    "total": total,
                    "page": query.page,
                    "page_size": query.page_size,
                    "total_pages": total_pages,
                    "has_next": query.page < total_pages,
                    "has_prev": query.page > 1,
                }

            if db and db.is_active:
                return await _run(db)
            else:
                async with AsyncSessionLocal() as session:
                    return await _run(session)

        data, tier, status = await cache_service.get_or_compute_with_thundering_herd_defense(
            key=cache_key,
            compute_fn=_query_flight_db,
            ttl=l2_ttl,
            l1_ttl=l1_ttl,
            is_hot=is_hot,
            swr_window=86400,
        )

        resp = PaginatedResponse[FlightResponse](**data)
        if with_cache_meta:
            return resp, tier, status
        return resp
