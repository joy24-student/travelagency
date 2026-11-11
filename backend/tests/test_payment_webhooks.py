"""
Test Payment Webhooks with HMAC-SHA256 Verification and Atomic Ledger Updates.
"""

import hashlib
import hmac
import json
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.agency import AgencyCommission
from app.models.booking import Booking
from app.models.loyalty import LoyaltyAccount
from app.models.user import Agency


def compute_hmac(secret: str, body_bytes: bytes) -> str:
    """Helper to generate valid HMAC-SHA256 signature."""
    return hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_bkash_webhook_invalid_signature_rejected(client: AsyncClient):
    """bKash webhook with invalid HMAC signature is rejected with 401 Unauthorized."""
    payload = {
        "paymentID": "BKASH-TEST-9999",
        "trxID": "TRX-FAKE-001",
        "transactionStatus": "Completed",
        "merchantInvoiceNumber": "SJ-20261106-MOCK01",
    }
    raw_body = json.dumps(payload).encode("utf-8")

    resp = await client.post(
        "/api/v1/payments/webhook/bkash",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-bKash-Signature": "invalid-tampered-signature-digest",
        },
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_bkash_webhook_valid_signature_atomic_confirmation(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Valid bKash webhook confirms booking, credits agency commission, and awards loyalty points."""
    user_id = uuid.uuid4()
    agency_owner_id = uuid.uuid4()

    # 1. Seed Agency
    agency = Agency(
        id=uuid.uuid4(),
        owner_user_id=agency_owner_id,
        name="Dhaka Horizon Travels",
        status="active",
    )
    db_session.add(agency)
    await db_session.flush()

    # 2. Seed Booking
    booking = Booking(
        id=uuid.uuid4(),
        user_id=user_id,
        agency_id=agency.id,
        booking_reference="SJ-20261106-BKASH1",
        product_type="hotel",
        status="payment_pending",
        flow_step="payment",
        destination_city="Sylhet",
        final_price=10000.0,
        currency="BDT",
    )
    db_session.add(booking)
    await db_session.commit()

    # 3. Formulate bKash payload and compute HMAC
    payload = {
        "paymentID": "BKASH-PAY-12345",
        "trxID": "TRX-VALID-777",
        "transactionStatus": "Completed",
        "merchantInvoiceNumber": booking.booking_reference,
        "amount": "10000.00",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    valid_sig = compute_hmac(settings.BKASH_WEBHOOK_SECRET, raw_body)

    resp = await client.post(
        "/api/v1/payments/webhook/bkash",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-bKash-Signature": valid_sig,
        },
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    assert res_data["status"] == "completed"
    assert res_data["booking_reference"] == booking.booking_reference
    assert res_data["commission_credited"] == 500.0  # 5% of 10,000 BDT
    assert res_data["loyalty_points_awarded"] == 1000.0  # 1 point per 10 BDT

    # 4. Duplicate webhook test (Idempotency)
    dup_resp = await client.post(
        "/api/v1/payments/webhook/bkash",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-bKash-Signature": valid_sig,
        },
    )
    assert dup_resp.status_code == 200
    assert "already processed" in dup_resp.json()["message"]


@pytest.mark.asyncio
async def test_nagad_webhook_verification(client: AsyncClient, db_session: AsyncSession):
    """Nagad webhook HMAC verification."""
    user_id = uuid.uuid4()
    booking = Booking(
        id=uuid.uuid4(),
        user_id=user_id,
        booking_reference="SJ-20261106-NAGAD1",
        product_type="flight",
        status="payment_pending",
        destination_city="Cox's Bazar",
        final_price=5000.0,
        currency="BDT",
    )
    db_session.add(booking)
    await db_session.commit()

    payload = {
        "orderId": booking.booking_reference,
        "paymentRefId": "NAGAD-TXN-8888",
        "status": "Success",
        "amount": "5000.00",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    valid_sig = compute_hmac(settings.NAGAD_WEBHOOK_SECRET, raw_body)

    resp = await client.post(
        "/api/v1/payments/webhook/nagad",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-KM-Signature": valid_sig,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert resp.json()["loyalty_points_awarded"] == 500.0


@pytest.mark.asyncio
async def test_rocket_webhook_verification(client: AsyncClient, db_session: AsyncSession):
    """DBBL Rocket webhook HMAC verification."""
    user_id = uuid.uuid4()
    booking = Booking(
        id=uuid.uuid4(),
        user_id=user_id,
        booking_reference="SJ-20261106-ROCKET1",
        product_type="hotel",
        status="payment_pending",
        destination_city="Sajek",
        final_price=8000.0,
        currency="BDT",
    )
    db_session.add(booking)
    await db_session.commit()

    payload = {
        "rocketTransactionId": "ROCKET-TX-999",
        "invoiceNumber": booking.booking_reference,
        "amount": 8000.0,
        "status": "SUCCESS",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    valid_sig = compute_hmac(settings.ROCKET_WEBHOOK_SECRET, raw_body)

    resp = await client.post(
        "/api/v1/payments/webhook/rocket",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Rocket-Signature": valid_sig,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_card_webhook_verification(client: AsyncClient, db_session: AsyncSession):
    """Card gateway webhook HMAC verification."""
    user_id = uuid.uuid4()
    booking = Booking(
        id=uuid.uuid4(),
        user_id=user_id,
        booking_reference="SJ-20261106-CARD1",
        product_type="tour",
        status="payment_pending",
        destination_city="Sundarbans",
        final_price=12000.0,
        currency="BDT",
    )
    db_session.add(booking)
    await db_session.commit()

    payload = {
        "tran_id": booking.booking_reference,
        "val_id": "CARD-VAL-1111",
        "amount": 12000.0,
        "status": "VALID",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    valid_sig = compute_hmac(settings.CARD_WEBHOOK_SECRET, raw_body)

    resp = await client.post(
        "/api/v1/payments/webhook/card",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Signature": valid_sig,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True
