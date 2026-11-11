"""
Export all Data Access Repositories.
"""

from app.repositories.base import BaseRepository
from app.repositories.hotel_repository import HotelRepository
from app.repositories.flight_repository import FlightRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.loyalty_repository import LoyaltyRepository
from app.repositories.agency_repository import AgencyRepository
from app.repositories.user_repository import UserRepository

__all__ = [
    "BaseRepository",
    "HotelRepository",
    "FlightRepository",
    "BookingRepository",
    "PaymentRepository",
    "LoyaltyRepository",
    "AgencyRepository",
    "UserRepository",
]
