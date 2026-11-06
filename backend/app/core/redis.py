"""
Asynchronous Redis Client & Cache Manager.
Features connection pooling, JSON serialization, and graceful degradation on Redis downtime.
"""

import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from redis.asyncio.connection import ConnectionPool

from app.core.config import settings

logger = logging.getLogger(__name__)

# Connection pool
_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[aioredis.Redis] = None


async def init_redis_pool() -> Optional[aioredis.Redis]:
    """Initialize Redis connection pool during application startup."""
    global _redis_pool, _redis_client
    try:
        _redis_pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            decode_responses=True,
        )
        _redis_client = aioredis.Redis(connection_pool=_redis_pool)
        # Test connection with ping
        await _redis_client.ping()
        logger.info("Successfully established connection to Redis cache pool.")
        return _redis_client
    except Exception as exc:
        logger.warning(
            f"Could not connect to Redis at {settings.REDIS_URL}: {exc}. "
            "Backend will gracefully operate in direct database fallback mode without caching."
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


class CacheService:
    """Helper service for caching JSON-serializable responses in Redis."""

    @staticmethod
    async def get_json(key: str) -> Optional[Any]:
        """Fetch and deserialize JSON from Redis cache."""
        if not _redis_client:
            return None
        try:
            val = await _redis_client.get(key)
            if val:
                return json.loads(val)
        except Exception as exc:
            logger.warning(f"Redis GET failed for key '{key}': {exc}")
        return None

    @staticmethod
    async def set_json(key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Serialize and store JSON in Redis with TTL."""
        if not _redis_client:
            return False
        try:
            ttl_seconds = ttl if ttl is not None else settings.REDIS_CACHE_TTL_SECONDS
            serialized = json.dumps(value, default=str)
            await _redis_client.set(key, serialized, ex=ttl_seconds)
            return True
        except Exception as exc:
            logger.warning(f"Redis SET failed for key '{key}': {exc}")
            return False

    @staticmethod
    async def delete(key: str) -> bool:
        """Delete specific cache key."""
        if not _redis_client:
            return False
        try:
            await _redis_client.delete(key)
            return True
        except Exception as exc:
            logger.warning(f"Redis DELETE failed for key '{key}': {exc}")
            return False

    @staticmethod
    async def delete_pattern(pattern: str) -> int:
        """Delete keys matching pattern (e.g. 'search:hotels:*')."""
        if not _redis_client:
            return 0
        try:
            count = 0
            async for key in _redis_client.scan_iter(match=pattern):
                await _redis_client.delete(key)
                count += 1
            return count
        except Exception as exc:
            logger.warning(f"Redis delete_pattern failed for '{pattern}': {exc}")
            return 0
