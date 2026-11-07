"""
API Version 1 Router Aggregation.
Combines all domain endpoint modules under /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.bookings import router as bookings_router
from app.api.v1.endpoints.flights import router as flights_router
from app.api.v1.endpoints.forecast import router as forecast_router
from app.api.v1.endpoints.hotels import router as hotels_router
from app.api.v1.endpoints.ml import router as ml_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.pricing import router as pricing_router
from app.api.v1.endpoints.storage import router as storage_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(flights_router)
api_v1_router.include_router(hotels_router)
api_v1_router.include_router(bookings_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(storage_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(pricing_router)
api_v1_router.include_router(forecast_router)
api_v1_router.include_router(ml_router)
