"""
Manual Test Script: Fare Calendar with Price Alerts and Push Notifications
Using Fake Price Provider.

Usage:
    backend/.venv/Scripts/python backend/scripts/manual_fare_alert_test.py
"""

import asyncio
from datetime import date, datetime, timedelta, timezone
import os
import sys
import uuid

# Set test environment flags
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = ""

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.cache import CacheService
from app.core.database import Base
from app.models.price_alert import PriceAlert
from app.repositories.price_alert_repository import PriceAlertRepository, build_route_key
from app.schemas.price_alert import PriceAlertCreate
from app.services.fare_calendar_service import FareCalendarService
from app.services.price_provider import fake_price_provider
from app.tasks.price_alert_tasks import (
    _evaluate_alerts_async,
    _sample_prices_for_routes,
    is_in_quiet_hours,
    is_within_dedupe_window,
    should_trigger_alert,
)


async def main():
    print("======================================================================")
    print("🚀 Shopno Jatra: Fare Calendar & Price Alerts Manual Verification")
    print("   Using Fake Price Provider (No external scraping, integer paisa)")
    print("======================================================================\n")

    # 1. Setup isolated SQLite in-memory database
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    test_user_id = uuid.uuid4()
    origin = "DAC"
    destination = "CXB"
    travel_date = date(2026, 11, 20)
    month = "2026-11"

    print(f"👤 Traveler UUID: {test_user_id}")
    print(f"✈️  Target Route: {origin} ➔ {destination}")
    print(f"📅 Travel Date:  {travel_date} ({month})\n")

    # 2. Step 1: Initialize Fake Price Provider with Baseline High Price
    print("--- [STEP 1] Setting initial baseline fare via FakePriceProvider ---")
    initial_paisa = 600000  # ৳6,000
    fake_price_provider.set_price("flight", origin, destination, travel_date, initial_paisa)
    print(f"   Provider fare set to: {initial_paisa} paisa (৳{initial_paisa // 100})\n")

    async with SessionLocal() as db:
        repo = PriceAlertRepository(db)

        # 3. Step 2: Traveler creates a Price Alert
        print("--- [STEP 2] Creating Traveler Price Alert ---")
        target_paisa = 500000  # ৳5,000 target
        alert_in = PriceAlertCreate(
            service_type="flight",
            origin=origin,
            destination=destination,
            travel_date=travel_date,
            date_flex_days=1,
            target_price_paisa=target_paisa,
            drop_percent=15.0,  # 15% drop trigger
        )
        alert = await repo.create_alert(user_id=test_user_id, data=alert_in)
        print(f"   ✅ Alert Created: ID={alert.id}")
        print(f"      Status={alert.status}, Target={alert.target_price_paisa} paisa (৳{alert.target_price_paisa // 100}), Drop={alert.drop_percent}%\n")

        # 4. Step 3: Run Fare Sampler at Baseline Price
        print("--- [STEP 3] Running Price Sampler at Baseline Fare ---")
        route_key = build_route_key("flight", origin, destination)
        await repo.record_snapshot(
            route_key=route_key,
            travel_date=travel_date,
            lowest_price_paisa=initial_paisa,
            source="fake_price_provider",
        )
        print(f"   Snapshot recorded: {route_key} on {travel_date} = ৳{initial_paisa // 100}")

        # Check trigger: 600,000 > 500,000 -> Should NOT trigger
        triggered, reason = should_trigger_alert(
            current_lowest_paisa=initial_paisa,
            target_price_paisa=target_paisa,
            drop_percent=15.0,
            baseline_price_paisa=initial_paisa,
        )
        print(f"   Trigger check: Triggered={triggered} ({reason})\n")
        assert not triggered, "Baseline fare should not trigger alert"

        # 5. Step 4: Simulate Price Drop via Fake Price Provider
        print("--- [STEP 4] Simulating Price Drop via FakePriceProvider ---")
        dropped_paisa = 450000  # ৳4,500 (25% drop from 6,000!)
        fake_price_provider.set_price("flight", origin, destination, travel_date, dropped_paisa)
        await repo.record_snapshot(
            route_key=route_key,
            travel_date=travel_date,
            lowest_price_paisa=dropped_paisa,
            source="fake_price_provider",
        )
        print(f"   New market price recorded: {dropped_paisa} paisa (৳{dropped_paisa // 100})")

        triggered, reason = should_trigger_alert(
            current_lowest_paisa=dropped_paisa,
            target_price_paisa=target_paisa,
            drop_percent=15.0,
            baseline_price_paisa=initial_paisa,
        )
        print(f"   Trigger check: Triggered={triggered} ({reason})")
        assert triggered, "Dropped price should trigger alert!"

        # 6. Step 5: Test Deduplication Window (24h)
        print("\n--- [STEP 5] Testing Notification Deduplication Window ---")
        now_utc = datetime.now(timezone.utc)
        print("   Checking dedupe with no prior notification...")
        assert not is_within_dedupe_window(None, now=now_utc)
        print("   ✅ Notification permitted (first notification)")

        print("   Recording alert notification at current timestamp...")
        await repo.mark_alert_notified(alert.id, status="triggered")
        alert = await repo.get_alert_by_id(alert.id)
        assert alert.last_notified_at is not None

        print("   Re-evaluating notification 1 hour later...")
        in_dedupe = is_within_dedupe_window(alert.last_notified_at, now=now_utc + timedelta(hours=1))
        print(f"   Dedupe active: {in_dedupe}")
        assert in_dedupe, "Notification within 24h should be suppressed"
        print("   ✅ Duplicate notification correctly suppressed within 24h window.")

        # 7. Step 6: Test Quiet Hours in Asia/Dhaka
        print("\n--- [STEP 6] Testing Quiet Hours in Asia/Dhaka (22:00 - 07:00) ---")
        # 23:00 Dhaka time (17:00 UTC) -> Night
        night_time_utc = datetime(2026, 11, 8, 17, 0, 0, tzinfo=timezone.utc)
        in_quiet_night = is_in_quiet_hours(night_time_utc)
        print(f"   Night in Dhaka (23:00 local): In quiet hours = {in_quiet_night}")
        assert in_quiet_night is True, "23:00 Dhaka time must be in quiet hours"

        # 12:00 Dhaka time (06:00 UTC) -> Day
        day_time_utc = datetime(2026, 11, 8, 6, 0, 0, tzinfo=timezone.utc)
        in_quiet_day = is_in_quiet_hours(day_time_utc)
        print(f"   Day in Dhaka (12:00 local):   In quiet hours = {in_quiet_day}")
        assert in_quiet_day is False, "12:00 Dhaka time must NOT be in quiet hours"
        print("   ✅ Asia/Dhaka quiet hours correctly enforced.")

        # 8. Step 7: Test Fare Calendar Generation & AI Trend Hint
        print("\n--- [STEP 7] Generating Monthly Fare Calendar with AI Trend Hint ---")
        calendar_res = await FareCalendarService.get_fare_calendar(
            db=db,
            origin=origin,
            destination=destination,
            month=month,
            service_type="flight",
            use_fake_provider=True,
        )
        print(f"   Calendar Month: {calendar_res.month} ({len(calendar_res.days)} days)")
        print(f"   Cheapest Date:  {calendar_res.cheapest_date} at ৳{calendar_res.cheapest_price_paisa // 100 if calendar_res.cheapest_price_paisa else 0}")
        print(f"   AI Trend Hint:  Verdict={calendar_res.trend_hint.verdict}")
        print(f"                   Confidence={calendar_res.trend_hint.confidence_score}")
        print(f"                   Reason='{calendar_res.trend_hint.recommendation_reason}'")
        print(f"                   Change%={calendar_res.trend_hint.predicted_change_percent}%")

        # 9. Step 8: Verify 10-Alert Active Cap
        print("\n--- [STEP 8] Verifying 10 Active Alerts Cap per User ---")
        active_count = await repo.count_active_alerts(test_user_id)
        print(f"   Current active alerts for user: {active_count}")
        # Add alerts up to 10
        for i in range(active_count, 10):
            await repo.create_alert(
                user_id=test_user_id,
                data=PriceAlertCreate(
                    service_type="flight",
                    origin="DAC",
                    destination=f"TST{i}",
                    travel_date=travel_date,
                    target_price_paisa=500000,
                ),
            )
        total_active = await repo.count_active_alerts(test_user_id)
        print(f"   Active alerts count now at limit: {total_active}")

        try:
            await repo.create_alert(
                user_id=test_user_id,
                data=PriceAlertCreate(
                    service_type="flight",
                    origin="DAC",
                    destination="OVERFLOW",
                    travel_date=travel_date,
                    target_price_paisa=500000,
                ),
            )
            print("   ❌ Error: 11th alert was allowed!")
            sys.exit(1)
        except Exception as e:
            print(f"   ✅ 11th alert correctly blocked by 10-alert cap: {e}")

    print("\n======================================================================")
    print("🎉 ALL MANUAL TEST CHECKS PASSED SUCCESSFULLY!")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(main())
