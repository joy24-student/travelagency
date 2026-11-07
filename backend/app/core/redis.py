"""
High-Performance Redis Client & Hybrid L1/L2 Cache Manager with orjson acceleration.
Features Cache Stampede Protection (XFetch & Mutex Leases), connection pooling,
and graceful degradation during Redis downtime.
"""

import logging
import math
import random
import time
from typing import Any, Callable, Coroutine, Optional
import orjson
import redis.asyncio as aioredis
from redis.asyncio.connection import ConnectionPool

from app.core.config import settings
from app.core.l1_cache import l1_cache

logger = logging.getLogger(__name__)

# Connection pool
_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[aioredis.Redis] = None


async def init_redis_pool() -> Optional[aioredis.Redis]:
    """Initialize Redis connection pool during application startup."""
    global _redis_pool, _redis_client
    if not settings.REDIS_URL:
        logger.info("REDIS_URL not set; running in local in-memory L1 cache mode.")
        return None

    try:
        _redis_pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            decode_responses=False,  # Use raw bytes for orjson acceleration
        )
        _redis_client = aioredis.Redis(connection_pool=_redis_pool)
        await _redis_client.ping()
        logger.info("Successfully established connection to Redis cache pool with orjson acceleration.")
        return _redis_client
    except Exception as exc:
        logger.warning(
            f"Could not connect to Redis at {settings.REDIS_URL}: {exc}. "
            "Backend will gracefully operate using high-speed L1 in-memory cache."
        )
        _redis_client = None
        return None


async def close_redis_pool() -> None:
    """Close Redis connection pool gracefully during shutdown."""
    global _redis_client, _redis_pool
    if _redis_client:
        await _redis_client.close()
    if _redis_pool:
        await _redis_pool.disconnect()
    logger.info("Redis connection pool closed.")


async def get_redis() -> Optional[aioredis.Redis]:
    """Dependency for obtaining Redis client instance."""
    global _redis_client
    return _redis_client


from app.core.cache import CacheService, cache_service

