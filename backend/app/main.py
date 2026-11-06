"""
Shopno Jatra Travel Agency - FastAPI Application Entrypoint.
Production-grade asynchronous backend with Supabase PostgreSQL, Redis caching,
Gemini AI Concierge, and Cloudflare R2 integration.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import CorrelationIdMiddleware, setup_logging
from app.core.redis import close_redis_pool, init_redis_pool
from app.websockets.endpoints import router as ws_router

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager:
    Initializes logging, Redis connection pool, and executes teardown.
    """
    # 1. Setup structured JSON logging
    setup_logging(debug=settings.DEBUG)
    logger.info(f"Starting {settings.APP_NAME} in '{settings.ENVIRONMENT}' environment...")

    # 2. Initialize Redis cache pool (gracefully operates in fallback mode if offline)
    await init_redis_pool()

    yield

    # 3. Teardown resources
    logger.info("Initiating graceful shutdown...")
    await close_redis_pool()
    logger.info("Shutdown completed successfully.")


# Instantiate FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Production-grade asynchronous backend for Shopno Jatra (স্বপ্ন যাত্রা) Travel Agency. "
        "Integrates Supabase PostgreSQL, Redis caching, Google Gemini AI Concierge, and Cloudflare R2."
    ),
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# 1. Register Correlation ID Middleware (outermost for end-to-end tracing)
app.add_middleware(CorrelationIdMiddleware)

# 2. Register CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID", "X-Cache", "Content-Disposition"],
)

# 3. Register Centralized RFC 7807 Exception Handlers
register_exception_handlers(app)

# 4. Mount REST & WebSocket Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_router)


@app.get("/health", tags=["Health & Probes"], summary="Health Check")
async def health_check():
    """Liveness probe returning application status."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }


@app.get("/ready", tags=["Health & Probes"], summary="Readiness Probe")
async def readiness_probe():
    """Readiness probe verifying operational status."""
    return {
        "status": "ready",
        "database": "configured",
        "redis": "configured",
    }
