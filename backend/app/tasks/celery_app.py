"""
Celery Task Queue Configuration for Background Workers & Periodic Beat Schedules.
Uses Redis broker and result backend.
"""

import os
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "shopno_jatra_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ticket_tasks",
        "app.tasks.notification_tasks",
        "app.tasks.price_alert_tasks",
        "app.tasks.ledger_tasks",
        "app.tasks.kyc_tasks",
    ],
)

# Celery tuning for low-latency background execution & Celery Beat Schedule
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_connection_retry_on_startup=False,
    broker_connection_timeout=1.0,
    broker_transport_options={"max_retries": 1},
    beat_schedule={
        # 1. Sample prices every 30 minutes for routes with active alerts
        "sample-prices-active-routes-every-30-mins": {
            "task": "sample_prices_active_routes_task",
            "schedule": crontab(minute="*/30"),
            "options": {"queue": "default"},
        },
        # 2. Sample prices hourly for hot routes in settings.HOT_FLIGHT_ROUTES
        "sample-prices-hot-routes-hourly": {
            "task": "sample_prices_hot_routes_task",
            "schedule": crontab(minute=0),
            "options": {"queue": "default"},
        },
        # 3. Expire alerts the day after travel_date (daily at 00:05 UTC)
        "expire-outdated-alerts-daily": {
            "task": "expire_outdated_alerts_task",
            "schedule": crontab(hour=0, minute=5),
            "options": {"queue": "default"},
        },
        # 4. Release matured escrowed bookings every hour
        "release-matured-escrow-hourly": {
            "task": "release_matured_bookings_task",
            "schedule": crontab(minute=15),
            "options": {"queue": "default"},
        },
        # 5. Weekly automated agency payout batch creation (Sundays at 00:00 UTC)
        "weekly-create-payout-batch": {
            "task": "weekly_create_payout_batch_task",
            "schedule": crontab(day_of_week=0, hour=0, minute=0),
            "options": {"queue": "default"},
        },
        # 6. Nightly double-entry ledger balance integrity audit (02:00 UTC)
        "nightly-ledger-integrity-check": {
            "task": "nightly_ledger_integrity_check_task",
            "schedule": crontab(hour=2, minute=0),
            "options": {"queue": "default"},
        },
        # 7. Celery beat reminder: check documents expiring within 30 days (daily at 03:00 UTC)
        "daily-check-expiring-kyc-documents": {
            "task": "check_expiring_kyc_documents_task",
            "schedule": crontab(hour=3, minute=0),
            "options": {"queue": "default"},
        },
    },
)
