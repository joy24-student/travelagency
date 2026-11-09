"""
Celery Task Module Exports.
"""

from app.tasks.celery_app import celery_app
from app.tasks.ticket_tasks import build_ticket_pdf_buffer, generate_travel_ticket_task
from app.tasks.notification_tasks import (
    send_booking_confirmation_email_task,
    send_sms_otp_task,
)
from app.tasks.ledger_tasks import (
    nightly_ledger_integrity_check_task,
    release_matured_bookings_task,
    weekly_create_payout_batch_task,
)
from app.tasks.price_alert_tasks import (
    evaluate_alerts_task,
    expire_outdated_alerts_task,
    sample_prices_active_routes_task,
    sample_prices_hot_routes_task,
    send_push_notification_task,
)
from app.tasks.kyc_tasks import (
    analyze_kyc_document,
    check_expiring_kyc_documents_task,
)

__all__ = [
    "celery_app",
    "build_ticket_pdf_buffer",
    "generate_travel_ticket_task",
    "send_booking_confirmation_email_task",
    "send_sms_otp_task",
    "sample_prices_active_routes_task",
    "sample_prices_hot_routes_task",
    "evaluate_alerts_task",
    "expire_outdated_alerts_task",
    "send_push_notification_task",
    "release_matured_bookings_task",
    "weekly_create_payout_batch_task",
    "nightly_ledger_integrity_check_task",
    "analyze_kyc_document",
    "check_expiring_kyc_documents_task",
]
