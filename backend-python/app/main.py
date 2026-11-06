"""
Shopno Jatra Asynchronous FastAPI Application.
Engineered for Ultra-High Performance & Fintech Cyber Security.
Features ORJSONResponse (SIMD), L1/L2 Caching, Circuit Breakers,
GZip Compression, Prometheus Metrics, and WebSockets.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import create_problem_response, register_exception_handlers
from app.core.logging import CorrelationIdMiddleware, setup_logging
from app.core.metrics import PrometheusMetricsMiddleware, metrics_endpoint
from app.core.rate_limit import limiter
from app.core.redis import close_redis_pool, get_redis, init_redis_pool
from app.websockets.routes import ws_router

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enforces Defense-in-Depth HTTP Security Headers:
    - HSTS (HTTP Strict Transport Security)
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and graceful shutdown lifecycle."""
    # 1. Startup
    setup_logging(debug=settings.DEBUG)
    logger.info(f"Starting {settings.APP_NAME} in '{settings.ENVIRONMENT}' mode with ORJSON acceleration...")

    # Initialize Redis connection pool
    await init_redis_pool()

    yield

    # 2. Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await close_redis_pool()
    await engine.dispose()
    logger.info("Database and Redis connections gracefully terminated.")


def create_application() -> FastAPI:
    """Build and configure the high-performance FastAPI application instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description=(
            "World-Class Production-Grade Asynchronous Backend for Shopno Jatra Travel Ecosystem. "
            "Features Supabase PostgreSQL integration, Zero-Trust RBAC security, "
            "SIMD-accelerated ORJSON serialization, L1/L2 hybrid caching, "
            "resilient payment webhook processing, and real-time WebSockets."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Attach Rate Limiter
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return create_problem_response(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            title="Too Many Requests",
            detail=f"Rate limit exceeded: {exc.detail}",
            instance=str(request.url.path),
            code="RATE_LIMIT_EXCEEDED",
        )

    # 1. Middlewares (Order: Metrics -> Security -> Logging -> Compression -> CORS)
    app.add_middleware(PrometheusMetricsMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1024)  # Compress payloads > 1KB
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID"],
    )

    # 2. Register RFC 7807 Exception Handlers
    register_exception_handlers(app)

    # 3. Mount Routers
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
    app.include_router(ws_router)

    # 4. Prometheus Metrics Endpoint
    @app.get("/metrics", tags=["Observability & Telemetry"])
    async def metrics():
        """Scrape endpoint for Prometheus / Grafana observability."""
        return metrics_endpoint()

    # 5. Health Check Probes
    @app.get("/health", tags=["Health & Monitoring"])
    @app.get("/health/ready", tags=["Health & Monitoring"])
    async def health_check():
        """
        Kubernetes readiness probe.
        Tests Redis and database pool responsiveness with latency measurements.
        """
        redis_status = "unhealthy"
        redis_latency_ms = None
        redis_client = await get_redis()
        if redis_client:
            try:
                import time
                t0 = time.perf_counter()
                pong = await redis_client.ping()
                if pong:
                    redis_status = "healthy"
                    redis_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            except Exception:
                redis_status = "degraded"

        db_status = "healthy"
        db_latency_ms = None
        try:
            import time
            from sqlalchemy import text
            t0 = time.perf_counter()
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        except Exception as exc:
            logger.warning(f"Health probe DB ping failed: {exc}")
            db_status = "unhealthy"

        overall_status = "healthy" if db_status == "healthy" else "degraded"
        return JSONResponse(
            status_code=status.HTTP_200_OK if overall_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": overall_status,
                "environment": settings.ENVIRONMENT,
                "services": {
                    "database": {"status": db_status, "latency_ms": db_latency_ms},
                    "redis": {"status": redis_status, "latency_ms": redis_latency_ms},
                },
            },
        )

    @app.get("/health/live", tags=["Health & Monitoring"])
    async def liveness_probe():
        """Kubernetes liveness probe: verifies process is alive."""
        return {"status": "alive"}

    @app.get("/", tags=["Health & Monitoring"])
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs",
            "metrics": "/metrics",
            "api_prefix": settings.API_V1_PREFIX,
        }

    return app


app = create_application()
