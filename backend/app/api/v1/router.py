"""
API v1 Router aggregation.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, bookings, flights, hotels, payments, storage

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(hotels.router)
api_router.include_router(flights.router)
api_router.include_router(bookings.router)
api_router.include_router(ai.router)
api_router.include_router(storage.router)
api_router.include_router(payments.router)
