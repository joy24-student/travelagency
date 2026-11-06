"""
Rate Limiting Infrastructure using SlowAPI and Redis.
Enforces IP-based defense-in-depth against DDoS and brute-force abuse.
"""

import logging
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address considering reverse proxies (Cloudflare, Nginx).
    Falls back to direct connection host.
    """
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()

    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()

    return get_remote_address(request) or "127.0.0.1"


# Initialize SlowAPI limiter
# Uses Redis storage if REDIS_URL is configured, else falls back to memory
limiter = Limiter(
    key_func=get_client_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.REDIS_URL if settings.REDIS_URL else "memory://",
    strategy="fixed-window",
)
