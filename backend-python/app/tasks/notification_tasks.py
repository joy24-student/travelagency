"""
Transactional Email and SMS Delivery Tasks.
Handles booking confirmations, receipts, and SMS OTP notifications.
"""

import email.message
import logging
import smtplib
from typing import Any, Dict, Optional
import httpx

from app.core.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def send_email_sync(to_email: str, subject: str, html_content: str) -> bool:
    """Synchronous SMTP email delivery."""
    if not settings.SMTP_PASSWORD or settings.SMTP_PASSWORD == "mock-smtp-password":
        logger.info(f"[DEV MOCK] Simulated Email to {to_email}: Subject='{subject}'")
        return True

    try:
        msg = email.message.EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.set_content(html_content, subtype="html")

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Successfully dispatched transactional email to {to_email}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}", exc_info=True)
        return False


def send_sms_sync(phone: str, message: str) -> bool:
    """Synchronous SMS gateway dispatch."""
    if not settings.SMS_GATEWAY_API_KEY or settings.SMS_GATEWAY_API_KEY == "mock-sms-gateway-key":
        logger.info(f"[DEV MOCK] Simulated SMS to {phone}: '{message}'")
        return True

    try:
        payload = {
            "api_key": settings.SMS_GATEWAY_API_KEY,
            "sender_id": settings.SMS_SENDER_ID,
            "recipient": phone,
            "message": message,
        }
        resp = httpx.post(settings.SMS_GATEWAY_URL, json=payload, timeout=10.0)
        logger.info(f"SMS sent to {phone}. Gateway response status: {resp.status_code}")
        return resp.status_code in (200, 201)
    except Exception as exc:
        logger.error(f"Failed to dispatch SMS to {phone}: {exc}", exc_info=True)
        return False


@celery_app.task(name="send_booking_confirmation_email_task")
def send_booking_confirmation_email_task(recipient_email: str, booking_data: Dict[str, Any]) -> bool:
    """Celery background task for booking confirmation email."""
    ref = booking_data.get("booking_reference", "SJ-BOOKING")
    subject = f"Booking Confirmed: {ref} - {settings.COMPANY_NAME}"
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="background-color: #0D47A1; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">{settings.COMPANY_NAME}</h1>
          <p style="margin: 5px 0 0 0;">Your Travel Reservation is Confirmed!</p>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear Valued Traveler,</p>
          <p>Thank you for choosing {settings.COMPANY_NAME}. Your booking <strong>{ref}</strong> has been successfully confirmed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f4f4f4;"><td style="padding: 8px;"><strong>Reference:</strong></td><td style="padding: 8px;">{ref}</td></tr>
            <tr><td style="padding: 8px;"><strong>Destination:</strong></td><td style="padding: 8px;">{booking_data.get("destination_city", settings.DEFAULT_COUNTRY)}</td></tr>
            <tr style="background: #f4f4f4;"><td style="padding: 8px;"><strong>Total Paid:</strong></td><td style="padding: 8px;">{booking_data.get("final_price", "0.00")} {booking_data.get("currency", settings.DEFAULT_CURRENCY)}</td></tr>
          </table>
          <p>Your electronic boarding ticket is attached or available for download in the app.</p>
          <p style="color: #777; font-size: 12px; margin-top: 30px;">{settings.COMPANY_NAME} | 24/7 Helpline: {settings.SUPPORT_HELPLINE} | {settings.SUPPORT_EMAIL}</p>
        </div>
      </body>
    </html>
    """
    return send_email_sync(recipient_email, subject, html)


@celery_app.task(name="send_sms_otp_task")
def send_sms_otp_task(phone: str, otp_code: str) -> bool:
    """Celery background task for SMS OTP delivery."""
    message = f"Your {settings.COMPANY_NAME} verification OTP is: {otp_code}. Valid for 5 minutes. Do not share this code."
    return send_sms_sync(phone, message)
