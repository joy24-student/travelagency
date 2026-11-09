"""
Price Provider Architecture for Transport Inventory.
Strictly respects ethical crawling policies: Uses only internal database inventory
and licensed API providers (no forbidden scraping).
All prices are returned as integer paisa (1 BDT = 100 paisa).
"""

from abc import ABC, abstractmethod
from datetime import date, datetime, time, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import Airport, Flight
from app.repositories.price_alert_repository import build_route_key


class BasePriceProvider(ABC):
    """Abstract interface for fare providers."""

    @abstractmethod
    async def get_lowest_price_paisa(
        self,
        service_type: str,
        origin: str,
        destination: str,
        travel_date: date,
    ) -> Optional[int]:
        """Fetch lowest price in integer paisa for a route and date."""
        pass


class InternalInventoryPriceProvider(BasePriceProvider):
    """
    Direct queries against Shopno Jatra's own internal inventory and database.
    Zero external scraping.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_lowest_price_paisa(
        self,
        service_type: str,
        origin: str,
        destination: str,
        travel_date: date,
    ) -> Optional[int]:
        origin_code = origin.strip().upper()
        dest_code = destination.strip().upper()

        if service_type == "flight":
            start_dt = datetime.combine(travel_date, time.min).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(travel_date, time.max).replace(tzinfo=timezone.utc)

            # Query lowest base_price from flights table using aliased airports
            orig_airport = aliased(Airport, name="orig_airport")
            dest_airport = aliased(Airport, name="dest_airport")

            stmt = (
                select(func.min(Flight.base_price))
                .join(orig_airport, Flight.origin_airport_id == orig_airport.id)
                .join(dest_airport, Flight.destination_airport_id == dest_airport.id)
                .where(
                    orig_airport.code == origin_code,
                    dest_airport.code == dest_code,
                    Flight.departure_time >= start_dt,
                    Flight.departure_time <= end_dt,
                    Flight.status == "scheduled",
                    Flight.available_seats > 0,
                )
            )
            res = await self.db.execute(stmt)
            min_price_bdt = res.scalar()

            if min_price_bdt is not None:
                # Convert BDT float/numeric to integer paisa
                return int(round(float(min_price_bdt) * 100))

            # If no scheduled flight in database, generate deterministic catalog benchmark
            # (e.g. for DAC-CXB standard domestic base 4,500 BDT = 450,000 paisa)
            return self._fallback_benchmark_paisa(origin_code, dest_code, travel_date)

        elif service_type == "train":
            # Standard Bangladesh Railway fare benchmark
            return self._fallback_benchmark_train_paisa(origin_code, dest_code)
        elif service_type in ("bus", "launch"):
            return self._fallback_benchmark_bus_paisa(origin_code, dest_code)

        return 450000  # Default 4,500 BDT in paisa

    def _fallback_benchmark_paisa(self, origin: str, dest: str, d: date) -> int:
        """Deterministic benchmark price for scheduled routes without live GDS hits."""
        base_rates = {
            ("DAC", "CXB"): 550000,  # ৳5,500
            ("CXB", "DAC"): 550000,
            ("DAC", "SYL"): 420000,  # ৳4,200
            ("SYL", "DAC"): 420000,
            ("DAC", "CGP"): 400000,  # ৳4,000
            ("CGP", "DAC"): 400000,
            ("DAC", "JSR"): 380000,  # ৳3,800
            ("JSR", "DAC"): 380000,
            ("DAC", "SPD"): 440000,  # ৳4,400
            ("SPD", "DAC"): 440000,
        }
        key = (origin, dest)
        base = base_rates.get(key, 500000)
        # Apply small deterministic variance based on day of week (weekend bump)
        day_factor = 1.15 if d.weekday() in (3, 4) else 1.0  # Thu/Fri in Bangladesh
        return int(base * day_factor)

    def _fallback_benchmark_train_paisa(self, origin: str, dest: str) -> int:
        rates = {
            ("DAC", "CXB"): 105000,  # ৳1,050
            ("DAC", "CTG"): 85000,   # ৳850
            ("DAC", "SYL"): 75000,   # ৳750
        }
        return rates.get((origin, dest), 65000)

    def _fallback_benchmark_bus_paisa(self, origin: str, dest: str) -> int:
        rates = {
            ("DAC", "CXB"): 120000,  # ৳1,200
            ("DAC", "CTG"): 90000,   # ৳900
            ("DAC", "SYL"): 80000,   # ৳800
        }
        return rates.get((origin, dest), 75000)


class FakePriceProvider(BasePriceProvider):
    """
    Fake / Mock Price Provider for deterministic automated testing and manual verifications.
    Allows test scripts to inject dynamic prices and simulate drops/surges on demand.
    """

    def __init__(self):
        self._price_registry: Dict[Tuple[str, str, str, str], int] = {}
        self.sample_call_count: int = 0

    def set_price(
        self,
        service_type: str,
        origin: str,
        destination: str,
        travel_date: date,
        price_paisa: int,
    ) -> None:
        """Register a mock price point in integer paisa."""
        key = (
            service_type.lower(),
            origin.strip().upper(),
            destination.strip().upper(),
            travel_date.isoformat(),
        )
        self._price_registry[key] = price_paisa

    def clear(self) -> None:
        self._price_registry.clear()
        self.sample_call_count = 0

    async def get_lowest_price_paisa(
        self,
        service_type: str,
        origin: str,
        destination: str,
        travel_date: date,
    ) -> Optional[int]:
        self.sample_call_count += 1
        key = (
            service_type.lower(),
            origin.strip().upper(),
            destination.strip().upper(),
            travel_date.isoformat(),
        )
        if key in self._price_registry:
            return self._price_registry[key]

        # Generic default for testing: 5,000 BDT (500,000 paisa)
        return 500000


# Global fake provider instance for manual tests and test suites
fake_price_provider = FakePriceProvider()
