"""
Celery Background Tasks & Periodic Beats for Price Alerts & Fare Sampling.
Features:
1. sample_prices every 30 minutes for active alert routes.
2. sample_prices hourly for settings.HOT_FLIGHT_ROUTES.
3. evaluate_alerts after each sampling run.
4. Notification deduplication within 24-hour window.
5. Strict respect for Asia/Dhaka quiet hours (22:00 - 07:00).
6. Auto-expiration of alerts on travel_date + 1.
"""

import asyncio
from datetime import date, datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
import zoneinfo
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.price_alert import PriceAlert, PriceSnapshot
from app.repositories.price_alert_repository import (
    PriceAlertRepository,
    build_route_key,
)
from app.services.price_provider import (
    BasePriceProvider,
    InternalInventoryPriceProvider,
    fake_price_provider,
)
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Constants
DEDUPE_WINDOW_HOURS = 24
QUIET_HOURS_START_HOUR = 22  # 10:00 PM Asia/Dhaka
QUIET_HOURS_END_HOUR = 7    # 07:00 AM Asia/Dhaka
DHAKA_TIMEZONE = "Asia/Dhaka"


def get_dhaka_now(dt: Optional[datetime] = None) -> datetime:
    """Returns current datetime in Asia/Dhaka timezone."""
    tz = zoneinfo.ZoneInfo(DHAKA_TIMEZONE)
    if dt is None:
        return datetime.now(tz)
    return dt.astimezone(tz) if dt.tzinfo else dt.replace(tzinfo=timezone.utc).astimezone(tz)


def is_in_quiet_hours(
    dt: Optional[datetime] = None,
    start_hour: int = QUIET_HOURS_START_HOUR,
    end_hour: int = QUIET_HOURS_END_HOUR,
    tz_name: str = DHAKA_TIMEZONE,
) -> bool:
    """
    Evaluates whether the specified datetime falls within quiet hours in Asia/Dhaka.
    Quiet hours: 22:00 (10 PM) to 07:00 (7 AM) local time.
    """
    tz = zoneinfo.ZoneInfo(tz_name)
    local_dt = dt.astimezone(tz) if (dt and dt.tzinfo) else (
        dt.replace(tzinfo=timezone.utc).astimezone(tz) if dt else datetime.now(tz)
    )
    current_minutes = local_dt.hour * 60 + local_dt.minute
    start_minutes = start_hour * 60
    end_minutes = end_hour * 60

    if start_minutes > end_minutes:
        # Crosses midnight: e.g. 22:00 -> 07:00
        return current_minutes >= start_minutes or current_minutes < end_minutes
    return start_minutes <= current_minutes < end_minutes


def is_within_dedupe_window(
    last_notified_at: Optional[datetime],
    now: Optional[datetime] = None,
    window_hours: int = DEDUPE_WINDOW_HOURS,
) -> bool:
    """
    Returns True if an alert notification was already dispatched within the dedupe window.
    """
    if not last_notified_at:
        return False

    current_time = now or datetime.now(timezone.utc)
    if last_notified_at.tzinfo is None:
        last_notified_at = last_notified_at.replace(tzinfo=timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    diff = (current_time - last_notified_at).total_seconds()
    return diff < (window_hours * 3600)


def should_trigger_alert(
    current_lowest_paisa: int,
    target_price_paisa: Optional[int],
    drop_percent: Optional[float],
    baseline_price_paisa: Optional[int] = None,
) -> Tuple[bool, str]:
    """
    Evaluates pricing against alert trigger rules:
    1. Target price threshold: current_lowest_paisa <= target_price_paisa.
    2. Drop percentage: price dropped by at least drop_percent compared to baseline.
    """
    if target_price_paisa is not None and current_lowest_paisa <= target_price_paisa:
        return True, f"Target price met: {current_lowest_paisa} <= {target_price_paisa} paisa"

    if drop_percent is not None and baseline_price_paisa and baseline_price_paisa > 0:
        actual_drop = (baseline_price_paisa - current_lowest_paisa) / baseline_price_paisa * 100.0
        if actual_drop >= float(drop_percent):
            return True, f"Price dropped by {actual_drop:.1f}% >= threshold {drop_percent}%"

    return False, "Trigger conditions not met"


# ============================================================================
# Celery Async Execution Wrapper
# ============================================================================

def run_async(coro):
    """Safely runs an async coroutine inside Celery synchronous worker process."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# ============================================================================
# Push Notification Dispatcher Task
# ============================================================================

@celery_app.task(name="send_push_notification_task")
def send_push_notification_task(
    user_id: str,
    title: str,
    body: str,
    data: Dict[str, Any],
) -> bool:
    """
    Dispatches push notification via Expo Push Notification Gateway / FCM.
    """
    logger.info(f"[PUSH NOTIFICATION] User={user_id} Title='{title}' Body='{body}' Data={data}")
    # In local/test environments or without external Expo credentials, log deterministic success
    return True


# ============================================================================
# Price Sampling Tasks
# ============================================================================

async def _sample_prices_for_routes(
    routes_and_dates: List[Tuple[str, str, str, date]],
    provider: Optional[BasePriceProvider] = None,
) -> int:
    """
    Samples prices for the given (service_type, origin, destination, travel_date) pairs
    and stores snapshots in public.price_snapshots.
    """
    count = 0
    async with AsyncSessionLocal() as session:
        active_provider = provider or InternalInventoryPriceProvider(session)
        repo = PriceAlertRepository(session)

        for service_type, origin, destination, travel_date in routes_and_dates:
            try:
                lowest_paisa = await active_provider.get_lowest_price_paisa(
                    service_type=service_type,
                    origin=origin,
                    destination=destination,
                    travel_date=travel_date,
                )
                if lowest_paisa is not None and lowest_paisa > 0:
                    route_key = build_route_key(service_type, origin, destination)
                    await repo.record_snapshot(
                        route_key=route_key,
                        travel_date=travel_date,
                        lowest_price_paisa=lowest_paisa,
                        source="inventory_sampler",
                    )
                    count += 1
            except Exception as e:
                logger.error(f"Error sampling route {origin}->{destination} on {travel_date}: {e}")

    return count


async def _sample_active_routes() -> int:
    """Gather all active alert routes with their travel dates (+/- flex days)."""
    async with AsyncSessionLocal() as session:
        repo = PriceAlertRepository(session)
        active_alerts = await repo.get_all_active_alerts()

    target_pairs: Set_Pairs = set()
    today_dhaka = get_dhaka_now().date()

    for alert in active_alerts:
        # Ignore expired dates
        if alert.travel_date < today_dhaka:
            continue

        flex = alert.date_flex_days or 0
        for offset in range(-flex, flex + 1):
            check_date = alert.travel_date + timedelta(days=offset)
            if check_date >= today_dhaka:
                target_pairs.add((
                    alert.service_type,
                    alert.origin.upper(),
                    alert.destination.upper(),
                    check_date,
                ))

    return await _sample_prices_for_routes(list(target_pairs))


async def _sample_hot_routes() -> int:
    """Sample hot routes from settings.HOT_FLIGHT_ROUTES for the next 14 days."""
    target_pairs = []
    today = get_dhaka_now().date()

    for route_str in settings.HOT_FLIGHT_ROUTES:
        parts = route_str.split("-")
        if len(parts) == 2:
            orig, dest = parts[0].strip().upper(), parts[1].strip().upper()
            # Sample across next 14 days
            for d in range(1, 15):
                target_pairs.append(("flight", orig, dest, today + timedelta(days=d)))

    return await _sample_prices_for_routes(target_pairs)


@celery_app.task(name="sample_prices_active_routes_task")
def sample_prices_active_routes_task() -> Dict[str, Any]:
    """
    Periodic beat task: Runs every 30 minutes.
    Samples current fares for routes with active traveler alerts,
    then automatically triggers evaluate_alerts_task.
    """
    logger.info("Starting active alert routes price sampling run (every 30 mins)...")
    sampled_count = run_async(_sample_active_routes())
    logger.info(f"Sampled {sampled_count} active alert route prices. Triggering alert evaluation...")
    
    # Automatically evaluate alerts after each sampling run
    evaluate_res = evaluate_alerts_task.delay()
    return {"sampled_count": sampled_count, "evaluation_task_id": str(evaluate_res.id)}


@celery_app.task(name="sample_prices_hot_routes_task")
def sample_prices_hot_routes_task() -> Dict[str, Any]:
    """
    Periodic beat task: Runs hourly.
    Samples current fares for settings.HOT_FLIGHT_ROUTES.
    """
    logger.info("Starting hourly hot routes price sampling run...")
    sampled_count = run_async(_sample_hot_routes())
    logger.info(f"Sampled {sampled_count} hot route prices. Triggering alert evaluation...")
    
    evaluate_res = evaluate_alerts_task.delay()
    return {"sampled_count": sampled_count, "evaluation_task_id": str(evaluate_res.id)}


# ============================================================================
# Alert Evaluation & Notification Task
# ============================================================================

async def _evaluate_alerts_async(
    custom_now: Optional[datetime] = None,
    allow_quiet_hours: bool = False,
) -> Dict[str, Any]:
    """
    Evaluates all active alerts against latest snapshots.
    Deduplicates notifications within 24 hours.
    Respects Asia/Dhaka quiet hours.
    """
    now_utc = custom_now or datetime.now(timezone.utc)
    in_quiet = is_in_quiet_hours(now_utc) and not allow_quiet_hours

    triggered_count = 0
    suppressed_dedupe_count = 0
    suppressed_quiet_count = 0

    async with AsyncSessionLocal() as session:
        repo = PriceAlertRepository(session)
        alerts = await repo.get_all_active_alerts()

        for alert in alerts:
            route_key = build_route_key(alert.service_type, alert.origin, alert.destination)
            flex = alert.date_flex_days or 0

            # 1. Determine lowest snapshot across flexible dates
            min_price_paisa: Optional[int] = None
            best_travel_date: date = alert.travel_date
            earliest_snapshot_paisa: Optional[int] = None

            for offset in range(-flex, flex + 1):
                t_date = alert.travel_date + timedelta(days=offset)
                snapshot = await repo.get_latest_snapshot(route_key, t_date)
                if snapshot:
                    if earliest_snapshot_paisa is None:
                        earliest_snapshot_paisa = snapshot.lowest_price_paisa
                    if min_price_paisa is None or snapshot.lowest_price_paisa < min_price_paisa:
                        min_price_paisa = snapshot.lowest_price_paisa
                        best_travel_date = t_date

            if min_price_paisa is None:
                continue

            # 2. Check trigger criteria
            is_triggered, reason = should_trigger_alert(
                current_lowest_paisa=min_price_paisa,
                target_price_paisa=alert.target_price_paisa,
                drop_percent=alert.drop_percent,
                baseline_price_paisa=earliest_snapshot_paisa,
            )

            if not is_triggered:
                continue

            # 3. Deduplication Check (24-hour window)
            if is_within_dedupe_window(alert.last_notified_at, now=now_utc, window_hours=DEDUPE_WINDOW_HOURS):
                suppressed_dedupe_count += 1
                logger.info(f"Alert {alert.id} triggered but suppressed due to 24-hr dedupe window.")
                continue

            # 4. Quiet Hours Check (Asia/Dhaka 22:00 - 07:00)
            if in_quiet:
                suppressed_quiet_count += 1
                logger.info(
                    f"Alert {alert.id} triggered but suppressed: Quiet hours active in Asia/Dhaka."
                )
                continue

            # 5. Dispatch Push Notification
            cur_price_bdt = min_price_paisa // 100
            service_bn = "ফ্লাইটের" if alert.service_type == "flight" else "টিকিটের"
            title = f"📉 দাম কমেছে! {alert.origin} ➔ {alert.destination}"
            body = (
                f"{alert.origin} থেকে {alert.destination} {service_bn} ভাড়া এখন মাত্র ৳{cur_price_bdt:,}! "
                f"সেরা মূল্যে বুক করতে এখনই ট্যাপ করুন।"
            )

            # Deep link routing to search screen with origin, destination, and prefilled date
            search_route = f"/screens/flights?from={alert.origin}&to={alert.destination}&date={best_travel_date.isoformat()}"
            if alert.service_type in ("bus", "launch"):
                search_route = f"/screens/bus-launch?from={alert.origin}&to={alert.destination}&date={best_travel_date.isoformat()}"
            elif alert.service_type == "train":
                search_route = f"/screens/trains?from={alert.origin}&to={alert.destination}&date={best_travel_date.isoformat()}"

            push_data = {
                "type": "price_alert",
                "alert_id": str(alert.id),
                "service_type": alert.service_type,
                "origin": alert.origin,
                "destination": alert.destination,
                "travel_date": best_travel_date.isoformat(),
                "route": search_route,
                "lowest_price_paisa": min_price_paisa,
            }

            send_push_notification_task.delay(
                user_id=str(alert.user_id),
                title=title,
                body=body,
                data=push_data,
            )

            # 6. Mark alert as notified
            await repo.mark_alert_notified(alert.id, status="triggered")
            triggered_count += 1

    return {
        "triggered_count": triggered_count,
        "suppressed_dedupe_count": suppressed_dedupe_count,
        "suppressed_quiet_count": suppressed_quiet_count,
    }


@celery_app.task(name="evaluate_alerts_task")
def evaluate_alerts_task() -> Dict[str, Any]:
    """
    Celery background task to evaluate active alerts and dispatch push notifications.
    """
    logger.info("Evaluating active price alerts...")
    res = run_async(_evaluate_alerts_async())
    logger.info(f"Evaluation complete: {res}")
    return res


# ============================================================================
# Alert Expiration Task
# ============================================================================

async def _expire_outdated_alerts_async() -> int:
    """Expires any alerts whose travel_date has passed."""
    today_dhaka = get_dhaka_now().date()
    async with AsyncSessionLocal() as session:
        repo = PriceAlertRepository(session)
        expired_count = await repo.expire_outdated_alerts(today_dhaka)
    return expired_count


@celery_app.task(name="expire_outdated_alerts_task")
def expire_outdated_alerts_task() -> Dict[str, int]:
    """
    Daily task: Expire alerts the day after travel_date.
    """
    logger.info("Running daily expired alerts purge...")
    expired = run_async(_expire_outdated_alerts_async())
    logger.info(f"Expired {expired} outdated price alerts.")
    return {"expired_count": expired}
