"""
Comprehensive Test Suite for Price Alerts, Fare Calendar, and Celery Automation.
Covers:
1. Alert trigger rules (target price, drop percentage)
2. Notification deduplication window (24 hours)
3. Quiet hours enforcement in Asia/Dhaka (22:00 - 07:00)
4. 10-alert active cap per user
5. RLS and tenant data isolation
6. Fare calendar Redis caching and cache hits
"""

from datetime import date, datetime, timedelta, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheService
from app.core.exceptions import BadRequestError, PermissionDeniedError
from app.models.price_alert import PriceAlert, PriceSnapshot
from app.repositories.price_alert_repository import (
    MAX_ACTIVE_ALERTS_PER_USER,
    PriceAlertRepository,
    build_route_key,
)
from app.schemas.price_alert import PriceAlertCreate, PriceAlertUpdate
from app.services.fare_calendar_service import FareCalendarService
from app.services.price_provider import fake_price_provider
from app.tasks.price_alert_tasks import (
    DEDUPE_WINDOW_HOURS,
    _evaluate_alerts_async,
    is_in_quiet_hours,
    is_within_dedupe_window,
    should_trigger_alert,
)
from tests.conftest import make_test_jwt


# ============================================================================
# 1. Alert Trigger Rules
# ============================================================================

def test_alert_trigger_target_price():
    """Verify target price threshold trigger rules."""
    # Target 5,000 BDT (500,000 paisa)
    target = 500000

    # Case A: Price is below target -> Triggered
    triggered, reason = should_trigger_alert(
        current_lowest_paisa=450000,
        target_price_paisa=target,
        drop_percent=None,
    )
    assert triggered is True
    assert "Target price met" in reason

    # Case B: Price equals target -> Triggered
    triggered, _ = should_trigger_alert(
        current_lowest_paisa=500000,
        target_price_paisa=target,
        drop_percent=None,
    )
    assert triggered is True

    # Case C: Price is above target -> NOT triggered
    triggered, reason = should_trigger_alert(
        current_lowest_paisa=550000,
        target_price_paisa=target,
        drop_percent=None,
    )
    assert triggered is False


def test_alert_trigger_drop_percent():
    """Verify drop percentage threshold trigger rules."""
    baseline = 600000  # 6,000 BDT in paisa
    drop_threshold = 15.0  # 15% drop

    # Case A: Price dropped from 6,000 to 4,800 (20% drop >= 15%) -> Triggered
    triggered, reason = should_trigger_alert(
        current_lowest_paisa=480000,
        target_price_paisa=None,
        drop_percent=drop_threshold,
        baseline_price_paisa=baseline,
    )
    assert triggered is True
    assert "20.0%" in reason

    # Case B: Price dropped from 6,000 to 5,400 (10% drop < 15%) -> NOT triggered
    triggered, _ = should_trigger_alert(
        current_lowest_paisa=540000,
        target_price_paisa=None,
        drop_percent=drop_threshold,
        baseline_price_paisa=baseline,
    )
    assert triggered is False


# ============================================================================
# 2. Notification Deduplication Window (24h)
# ============================================================================

def test_dedupe_window_logic():
    """Verify notification deduplication suppression window."""
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=timezone.utc)

    # 1. Never notified before -> NOT deduplicated (should notify)
    assert is_within_dedupe_window(None, now=now, window_hours=24) is False

    # 2. Notified 2 hours ago -> WITHIN dedupe window (suppress notification)
    notified_2h_ago = now - timedelta(hours=2)
    assert is_within_dedupe_window(notified_2h_ago, now=now, window_hours=24) is True

    # 3. Notified 23 hours and 59 minutes ago -> WITHIN window (suppress)
    notified_almost_24h = now - timedelta(hours=23, minutes=59)
    assert is_within_dedupe_window(notified_almost_24h, now=now, window_hours=24) is True

    # 4. Notified 25 hours ago -> OUTSIDE window (should notify again)
    notified_25h_ago = now - timedelta(hours=25)
    assert is_within_dedupe_window(notified_25h_ago, now=now, window_hours=24) is False


# ============================================================================
# 3. Quiet Hours in Asia/Dhaka (22:00 - 07:00 local time)
# ============================================================================

def test_quiet_hours_dhaka_timezone():
    """Verify quiet hours detection according to Asia/Dhaka time (UTC+6)."""
    # 23:30 Dhaka time is 17:30 UTC -> Quiet hour active (night)
    dt_dhaka_night = datetime(2026, 11, 8, 17, 30, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(dt_dhaka_night) is True

    # 02:00 Dhaka time is 20:00 UTC previous day -> Quiet hour active
    dt_dhaka_midnight = datetime(2026, 11, 8, 20, 0, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(dt_dhaka_midnight) is True

    # 06:45 Dhaka time is 00:45 UTC -> Quiet hour active (before 07:00)
    dt_dhaka_early = datetime(2026, 11, 8, 0, 45, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(dt_dhaka_early) is True

    # 14:00 Dhaka time is 08:00 UTC -> Daytime, quiet hours NOT active
    dt_dhaka_day = datetime(2026, 11, 8, 8, 0, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(dt_dhaka_day) is False

    # 21:55 Dhaka time -> Just before 22:00 -> Quiet hours NOT active
    dt_dhaka_evening = datetime(2026, 11, 8, 15, 55, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(dt_dhaka_evening) is False


# ============================================================================
# 4. 10-Alert Active Cap per User
# ============================================================================

@pytest.mark.asyncio
async def test_max_10_active_alerts_cap(db_session: AsyncSession):
    """Enforce that a user cannot create more than 10 active alerts."""
    repo = PriceAlertRepository(db_session)
    user_id = uuid.uuid4()
    travel_date = date(2026, 11, 20)

    # Create 10 active alerts -> Should succeed
    created_ids = []
    for i in range(MAX_ACTIVE_ALERTS_PER_USER):
        alert_data = PriceAlertCreate(
            service_type="flight",
            origin="DAC",
            destination=f"D{i:02d}",
            travel_date=travel_date,
            target_price_paisa=500000,
        )
        alert = await repo.create_alert(user_id=user_id, data=alert_data)
        assert alert.id is not None
        created_ids.append(alert.id)

    # Attempt to create the 11th active alert -> Must fail with BadRequestError
    with pytest.raises(BadRequestError) as exc_info:
        await repo.create_alert(
            user_id=user_id,
            data=PriceAlertCreate(
                service_type="flight",
                origin="DAC",
                destination="D11",
                travel_date=travel_date,
                target_price_paisa=500000,
            ),
        )
    assert "limit of 10 active price alerts" in str(exc_info.value).lower()

    # Pause one of the alerts
    await repo.update_alert(
        alert_id=created_ids[0],
        user_id=user_id,
        update_data=PriceAlertUpdate(status="paused"),
    )

    # Now creating the 11th alert (when only 9 are active) must succeed
    eleventh_alert = await repo.create_alert(
        user_id=user_id,
        data=PriceAlertCreate(
            service_type="flight",
            origin="DAC",
            destination="D11",
            travel_date=travel_date,
            target_price_paisa=500000,
        ),
    )
    assert eleventh_alert.id is not None


# ============================================================================
# 5. RLS & Tenant Isolation
# ============================================================================

@pytest.mark.asyncio
async def test_price_alert_tenant_isolation(db_session: AsyncSession):
    """Verify that User A cannot view, update, or delete User B's price alerts."""
    repo = PriceAlertRepository(db_session)
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    # User A creates an alert
    alert_a = await repo.create_alert(
        user_id=user_a,
        data=PriceAlertCreate(
            service_type="flight",
            origin="DAC",
            destination="CXB",
            travel_date=date(2026, 11, 20),
            target_price_paisa=450000,
        ),
    )

    # User B attempts to access User A's alert -> Denied
    with pytest.raises(PermissionDeniedError):
        await repo.get_alert_by_id(alert_a.id, user_id=user_b)

    # User B attempts to update User A's alert -> Denied
    with pytest.raises(PermissionDeniedError):
        await repo.update_alert(
            alert_id=alert_a.id,
            user_id=user_b,
            update_data=PriceAlertUpdate(target_price_paisa=300000),
        )

    # User B attempts to delete User A's alert -> Denied
    with pytest.raises(PermissionDeniedError):
        await repo.delete_alert(alert_a.id, user_id=user_b)

    # Alert remains untouched in database
    fetched = await repo.get_alert_by_id(alert_a.id, user_id=user_a)
    assert fetched.target_price_paisa == 450000


# ============================================================================
# 6. Fare Calendar Endpoint & Cache Hit
# ============================================================================

@pytest.mark.asyncio
async def test_fare_calendar_cache_hit(client: AsyncClient, db_session: AsyncSession):
    """
    Verify GET /fares/calendar generates calendar and caches response in Redis.
    First call: X-Cache MISS. Second call: X-Cache HIT.
    """
    month = "2026-11"
    origin = "DAC"
    dest = "CXB"

    # Pre-clean any existing cache entry
    cache_key = FareCalendarService._build_cache_key("flight", origin, dest, month)
    await CacheService.delete(cache_key)

    # 1. First Request -> Cache Miss
    resp1 = await client.get(f"/fares/calendar?origin={origin}&destination={dest}&month={month}&service_type=flight")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["origin"] == "DAC"
    assert data1["destination"] == "CXB"
    assert len(data1["days"]) == 30  # November has 30 days
    assert data1["trend_hint"]["verdict"] in ("BUY_NOW", "WAIT", "STABLE")
    assert resp1.headers.get("X-Cache") == "MISS"

    # Verify cheapest day is identified
    assert data1["cheapest_date"] is not None
    assert any(day["is_cheapest"] for day in data1["days"])

    # 2. Second Request -> Cache Hit
    resp2 = await client.get(f"/fares/calendar?origin={origin}&destination={dest}&month={month}&service_type=flight")
    assert resp2.status_code == 200
    assert resp2.headers.get("X-Cache") == "HIT"
    data2 = resp2.json()
    assert data2["cached"] is True
    assert data2["cheapest_date"] == data1["cheapest_date"]


# ============================================================================
# 7. End-to-End API Workflow
# ============================================================================

@pytest.mark.asyncio
async def test_price_alerts_api_crud(client: AsyncClient):
    """Test full API CRUD lifecycle via HTTP client with signed JWT."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Price Alert
    payload = {
        "service_type": "flight",
        "origin": "DAC",
        "destination": "CXB",
        "travel_date": "2026-11-25",
        "date_flex_days": 2,
        "target_price_paisa": 480000,
        "drop_percent": 10.0,
    }
    post_res = await client.post("/price-alerts", json=payload, headers=headers)
    assert post_res.status_code == 201
    created_alert = post_res.json()
    alert_id = created_alert["id"]
    assert created_alert["origin"] == "DAC"
    assert created_alert["status"] == "active"
    assert created_alert["target_price_paisa"] == 480000

    # 2. List Alerts
    list_res = await client.get("/price-alerts", headers=headers)
    assert list_res.status_code == 200
    alerts_list = list_res.json()
    assert len(alerts_list) >= 1
    assert any(a["id"] == alert_id for a in alerts_list)

    # 3. Patch Alert (Pause)
    patch_res = await client.patch(
        f"/price-alerts/{alert_id}",
        json={"status": "paused"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "paused"

    # 4. Delete Alert
    del_res = await client.delete(f"/price-alerts/{alert_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 5. List Alerts after deletion
    list_res2 = await client.get("/price-alerts", headers=headers)
    assert not any(a["id"] == alert_id for a in list_res2.json())
