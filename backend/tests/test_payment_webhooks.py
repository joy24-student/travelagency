"""
Tests for bKash and Nagad HMAC-SHA256 Webhook Signature Verification.
"""

import hashlib
import hmac
import json
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.booking import Booking


def compute_hmac_sha256(secret: str, data: bytes) -> str:
    """Compute HMAC-SHA256 hex digest for testing."""
    return hmac.new(secret.encode("utf-8"), data, hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_bkash_webhook_valid_signature_confirms_booking(client: AsyncClient, db_session: AsyncSession):
    """bKash webhook with valid signature confirms booking state atomically."""
    user_id = uuid.uuid4()
    booking_ref = f"SJ-{uuid.uuid4().hex[:8].upper()}"

    booking = Booking(
        user_id=user_id,
        booking_reference=booking_ref,
        product_type="hotel",
        status="pending_payment",
        destination_city="Cox's Bazar",
        total_price=200.0,
        final_price=210.0,
    )
    db_session.add(booking)
    await db_session.commit()

    payload_dict = {
        "paymentID": f"TR000{uuid.uuid4().hex[:6]}",
        "trxID": "BKH987654321",
        "amount": "210.00",
        "transactionStatus": "Completed",
        "merchantInvoiceNumber": booking_ref,
        "currency": "BDT",
    }
    raw_payload = json.dumps(payload_dict).encode("utf-8")

    # Compute valid HMAC-SHA256
    valid_signature = compute_hmac_sha256(settings.BKASH_WEBHOOK_SECRET, raw_payload)

    response = await client.post(
        "/api/v1/payments/webhook/bkash",
        content=raw_payload,
        headers={
            "Content-Type": "application/json",
            "X-Signature": valid_signature,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "completed"
    assert data["booking_reference"] == booking_ref

    # Verify DB status updated
    await db_session.refresh(booking)
    assert booking.status == "confirmed"
    assert booking.confirmed_at is not None


@pytest.mark.asyncio
async def test_bkash_webhook_invalid_signature_rejected(client: AsyncClient):
    """bKash webhook with fraudulent/invalid signature must be rejected with 401."""
    payload_dict = {
        "paymentID": "FAKETRN123",
        "transactionStatus": "Completed",
        "merchantInvoiceNumber": "SJ-INVALID",
    }
    raw_payload = json.dumps(payload_dict).encode("utf-8")

    response = await client.post(
        "/api/v1/payments/webhook/bkash",
        content=raw_payload,
        headers={
            "Content-Type": "application/json",
            "X-Signature": "invalid-tampered-hmac-signature-string",
        },
    )
    assert response.status_code == 401
    problem = response.json()
    assert problem["status"] == 401
    assert "Invalid bKash webhook HMAC" in problem["detail"]


@pytest.mark.asyncio
async def test_nagad_webhook_valid_signature(client: AsyncClient, db_session: AsyncSession):
    """Nagad webhook with valid HMAC signature succeeds."""
    user_id = uuid.uuid4()
    booking_ref = f"SJ-{uuid.uuid4().hex[:8].upper()}"

    booking = Booking(
        user_id=user_id,
        booking_reference=booking_ref,
        product_type="flight",
        status="pending_payment",
        destination_city="Sylhet",
        total_price=100.0,
        final_price=105.0,
    )
    db_session.add(booking)
    await db_session.commit()

    payload_dict = {
        "merchantId": "NGD_MERCHANT_01",
        "orderId": booking_ref,
        "paymentRefId": "NGD-TXN-456",
        "amount": "105.00",
        "status": "Success",
    }
    raw_payload = json.dumps(payload_dict).encode("utf-8")
    valid_sig = compute_hmac_sha256(settings.NAGAD_WEBHOOK_SECRET, raw_payload)

    response = await client.post(
        "/api/v1/payments/webhook/nagad",
        content=raw_payload,
        headers={
            "Content-Type": "application/json",
            "X-KM-Signature": valid_sig,
        },
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    await db_session.refresh(booking)
    assert booking.status == "confirmed"
