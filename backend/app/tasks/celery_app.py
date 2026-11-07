"""
Celery Task Queue Configuration for Background Workers.
Uses Redis broker and result backend.
"""

import os
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "shopno_jatra_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ticket_tasks",
        "app.tasks.notification_tasks",
    ],
)

# Celery tuning for low-latency background execution
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
)
