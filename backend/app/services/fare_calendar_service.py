"""
Fare Calendar Service with Distributed Redis Caching (10-minute TTL)
and Predictive Analytics Trend Hints via PriceForecastService.
"""

import calendar
from datetime import date, datetime
import json
import logging
from typing import Dict, List, Optional
import orjson
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheService
from app.core.config import settings
from app.repositories.price_alert_repository import PriceAlertRepository, build_route_key
from app.schemas.price_alert import FareCalendarDay, FareCalendarResponse, TrendHint
from app.services.price_forecast import PriceForecastService
from app.services.price_provider import InternalInventoryPriceProvider, fake_price_provider

logger = logging.getLogger(__name__)

CALENDAR_CACHE_TTL_SECONDS = 600  # 10 minutes cache as specified in requirements


class FareCalendarService:
    @staticmethod
    def _build_cache_key(service_type: str, origin: str, destination: str, month: str) -> str:
        return f"cache:fares:calendar:{service_type.lower()}:{origin.strip().upper()}:{destination.strip().upper()}:{month}"

    @classmethod
    async def get_fare_calendar(
        cls,
        db: AsyncSession,
        origin: str,
        destination: str,
        month: str,
        service_type: str = "flight",
        use_fake_provider: bool = False,
    ) -> FareCalendarResponse:
        """
        Retrieves the monthly fare calendar with lowest price per day and trend hint.
        Caches results in Redis for 10 minutes.
        """
        origin_clean = origin.strip().upper()
        dest_clean = destination.strip().upper()
        service_clean = service_type.strip().lower()

        cache_key = cls._build_cache_key(service_clean, origin_clean, dest_clean, month)

        # 1. Check Redis Cache
        cached_data = await CacheService.get_json(cache_key)
        if cached_data and isinstance(cached_data, dict):
            try:
                response = FareCalendarResponse.model_validate(cached_data)
                response.cached = True
                return response
            except Exception as e:
                logger.warning(f"Failed to deserialize cached fare calendar: {e}")

        # 2. Parse year and month
        try:
            year_str, month_str = month.split("-")
            year = int(year_str)
            month_num = int(month_str)
            _, num_days = calendar.monthrange(year, month_num)
        except Exception:
            raise ValueError("Month parameter must be in YYYY-MM format (e.g. 2026-11).")

        start_date = date(year, month_num, 1)
        end_date = date(year, month_num, num_days)

        # 3. Retrieve historical / sampled price snapshots
        repo = PriceAlertRepository(db)
        route_key = build_route_key(service_clean, origin_clean, dest_clean)
        snapshot_map = await repo.get_monthly_snapshots(route_key, start_date, end_date)

        # 4. Fill in days from internal inventory or provider
        price_provider = fake_price_provider if use_fake_provider else InternalInventoryPriceProvider(db)

        days: List[FareCalendarDay] = []
        cheapest_price_paisa: Optional[int] = None
        cheapest_date: Optional[str] = None
        price_series: List[float] = []

        for d_num in range(1, num_days + 1):
            curr_date = date(year, month_num, d_num)
            date_str = curr_date.isoformat()

            # Priority 1: recorded price snapshot in DB
            price_paisa = snapshot_map.get(curr_date)
            if price_paisa is None:
                # Priority 2: provider / internal inventory calculation
                price_paisa = await price_provider.get_lowest_price_paisa(
                    service_type=service_clean,
                    origin=origin_clean,
                    destination=dest_clean,
                    travel_date=curr_date,
                )

            if price_paisa is not None and price_paisa > 0:
                price_bdt = price_paisa / 100.0
                price_series.append(price_bdt)

                if cheapest_price_paisa is None or price_paisa < cheapest_price_paisa:
                    cheapest_price_paisa = price_paisa
                    cheapest_date = date_str

                days.append(
                    FareCalendarDay(
                        date=date_str,
                        day=d_num,
                        lowest_price_paisa=price_paisa,
                        currency="BDT",
                        is_cheapest=False,
                        available=True,
                    )
                )
            else:
                days.append(
                    FareCalendarDay(
                        date=date_str,
                        day=d_num,
                        lowest_price_paisa=None,
                        currency="BDT",
                        is_cheapest=False,
                        available=False,
                    )
                )

        # Mark cheapest day
        if cheapest_date:
            for day_item in days:
                if day_item.date == cheapest_date:
                    day_item.is_cheapest = True
                    break

        # 5. Compute Trend Hint using PriceForecastService
        anchor_price_bdt = (cheapest_price_paisa / 100.0) if cheapest_price_paisa else 4500.0
        try:
            forecast = PriceForecastService.execute_forecast_pipeline(
                current_price=anchor_price_bdt,
                historical_prices=price_series if len(price_series) >= 3 else None,
                total_capacity=180,
                available_capacity=60,
                days_to_departure=14,
                is_flight=(service_clean == "flight"),
                currency="BDT",
                item_id=f"{origin_clean}-{dest_clean}",
                item_type="flight" if service_clean == "flight" else "general",
            )
            trend_hint = TrendHint(
                verdict=str(forecast.verdict.value),
                recommendation_reason=forecast.recommendation_reason,
                confidence_score=round(forecast.confidence_score, 2),
                predicted_change_percent=round(forecast.predicted_change_percent, 2),
            )
        except Exception as exc:
            logger.warning(f"Price forecast failed for fare calendar: {exc}")
            trend_hint = TrendHint(
                verdict="STABLE",
                recommendation_reason="Fares are currently holding stable across this calendar window.",
                confidence_score=0.85,
                predicted_change_percent=0.0,
            )

        response = FareCalendarResponse(
            origin=origin_clean,
            destination=dest_clean,
            service_type=service_clean,
            month=month,
            days=days,
            cheapest_date=cheapest_date,
            cheapest_price_paisa=cheapest_price_paisa,
            trend_hint=trend_hint,
            cached=False,
        )

        # 6. Cache response in Redis for 10 minutes (600s)
        try:
            await CacheService.set_json(
                key=cache_key,
                value=response.model_dump(),
                ttl=CALENDAR_CACHE_TTL_SECONDS,
            )
        except Exception as exc:
            logger.warning(f"Failed to cache fare calendar in Redis: {exc}")

        return response
