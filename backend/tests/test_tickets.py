"""
Test Offline-Capable, Tamper-Proof E-Tickets and Scanner Verification.
Covers:
- Ed25519 signature round trip
- Tampered payload rejection
- Expired ticket detection
- Double scan prevention
- Revoked ticket handling
- RLS / RBAC access control on tickets and scans
"""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingPassenger
from app.models.ticket import Ticket, TicketScan
from app.models.user import Agency, HotelStaff
from app.models.hotel import Hotel
from app.services.ticket_service import (
    canonicalize_ticket_payload,
    sign_ticket,
    verify_ticket_signature,
    TicketService,
)
from tests.conftest import make_test_jwt


@pytest.mark.asyncio
async def test_signature_round_trip():
    """Verify that a generated Ed25519 signature verifies cleanly with the public key."""
    payload = {
        "ticket_id": str(uuid.uuid4()),
        "booking_id": str(uuid.uuid4()),
        "passenger_name": "Tariqul Islam",
        "service_type": "flight",
        "valid_from": "2026-11-08T00:00:00+00:00",
        "valid_to": "2026-11-09T00:00:00+00:00",
        "seat": "14B",
    }
    signature = sign_ticket(payload)
    assert len(signature) == 128  # 64 bytes in hex
    assert verify_ticket_signature(payload, signature) is True


@pytest.mark.asyncio
async def test_tampered_payload_rejected():
    """Ensure any alteration of passenger name, seat, or validity dates causes signature failure."""
    payload = {
        "ticket_id": str(uuid.uuid4()),
        "booking_id": str(uuid.uuid4()),
        "passenger_name": "Farhana Ahmed",
        "service_type": "hotel",
        "valid_from": "2026-11-08T00:00:00+00:00",
        "valid_to": "2026-11-10T00:00:00+00:00",
        "seat": "Suite 302",
    }
    signature = sign_ticket(payload)

    # 1. Tamper with passenger name
    tampered_name = dict(payload, passenger_name="Attacker Name")
    assert verify_ticket_signature(tampered_name, signature) is False

    # 2. Tamper with validity date
    tampered_dates = dict(payload, valid_to="2027-11-10T00:00:00+00:00")
    assert verify_ticket_signature(tampered_dates, signature) is False

    # 3. Tamper with seat
    tampered_seat = dict(payload, seat="Suite 999")
    assert verify_ticket_signature(tampered_seat, signature) is False

    # 4. Tamper with ticket id
    tampered_id = dict(payload, ticket_id=str(uuid.uuid4()))
    assert verify_ticket_signature(tampered_id, signature) is False


@pytest.mark.asyncio
async def test_expired_ticket_detection(client: AsyncClient, db_session: AsyncSession):
    """Test scanning a ticket whose validity period has elapsed."""
    staff_user_id = uuid.uuid4()
    agency_id = uuid.uuid4()
    staff_token = make_test_jwt(staff_user_id, role="agency")

    # Seed agency
    agency = Agency(
        id=agency_id,
        owner_user_id=staff_user_id,
        name="Dhaka Sky Travel",
        status="active",
        verification_status="verified",
    )
    db_session.add(agency)

    # Seed booking
    booking = Booking(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        agency_id=agency_id,
        booking_reference="SJ-TEST-EXP-01",
        product_type="flight",
        status="confirmed",
        flow_step="voucher_issued",
        destination_city="Cox's Bazar",
        final_price=5000.0,
    )
    db_session.add(booking)

    # Seed expired ticket
    now = datetime.now(timezone.utc)
    past_from = now - timedelta(days=5)
    past_to = now - timedelta(days=2)
    ticket_id = uuid.uuid4()
    ticket_payload = {
        "ticket_id": str(ticket_id),
        "booking_id": str(booking.id),
        "passenger_name": "Expired Passenger",
        "service_type": "flight",
        "valid_from": past_from.isoformat(),
        "valid_to": past_to.isoformat(),
        "seat": "1A",
    }
    sig = sign_ticket(ticket_payload)

    ticket = Ticket(
        id=ticket_id,
        booking_id=booking.id,
        passenger_name="Expired Passenger",
        service_type="flight",
        valid_from=past_from,
        valid_to=past_to,
        seat="1A",
        status="expired",
        signature=sig,
    )
    db_session.add(ticket)
    await db_session.commit()

    scan_id = uuid.uuid4()
    resp = await client.post(
        "/api/v1/tickets/scans",
        json={
            "scans": [
                {
                    "id": str(scan_id),
                    "ticket_id": str(ticket_id),
                    "scanner_device_id": "DEVICE-001",
                    "result": "expired",
                    "scanned_at": now.isoformat(),
                }
            ]
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp.status_code == 200
    res_data = resp.json()["data"]
    assert res_data["processed_count"] == 1
    assert res_data["results"][0]["result"] == "expired"


@pytest.mark.asyncio
async def test_double_scan_prevention(client: AsyncClient, db_session: AsyncSession):
    """Test that scanning a valid ticket marks it used and subsequent scans are flagged as already used."""
    staff_user_id = uuid.uuid4()
    agency_id = uuid.uuid4()
    staff_token = make_test_jwt(staff_user_id, role="agency")

    agency = Agency(
        id=agency_id,
        owner_user_id=staff_user_id,
        name="Bengal Express Tours",
        status="active",
        verification_status="verified",
    )
    db_session.add(agency)

    booking = Booking(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        agency_id=agency_id,
        booking_reference="SJ-TEST-DBL-01",
        product_type="tour",
        status="confirmed",
        flow_step="voucher_issued",
        destination_city="Sylhet",
        final_price=3500.0,
    )
    db_session.add(booking)

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=2)
    ticket_id = uuid.uuid4()
    payload = {
        "ticket_id": str(ticket_id),
        "booking_id": str(booking.id),
        "passenger_name": "Sadia Islam",
        "service_type": "tour",
        "valid_from": now.isoformat(),
        "valid_to": future.isoformat(),
        "seat": "Seat 7",
    }
    sig = sign_ticket(payload)

    ticket = Ticket(
        id=ticket_id,
        booking_id=booking.id,
        passenger_name="Sadia Islam",
        service_type="tour",
        valid_from=now,
        valid_to=future,
        seat="Seat 7",
        status="active",
        signature=sig,
    )
    db_session.add(ticket)
    await db_session.commit()

    # First Scan: Valid
    scan_id_1 = uuid.uuid4()
    resp1 = await client.post(
        "/api/v1/tickets/scans",
        json={
            "scans": [
                {
                    "id": str(scan_id_1),
                    "ticket_id": str(ticket_id),
                    "scanner_device_id": "DEVICE-GATE-A",
                    "result": "valid",
                    "scanned_at": now.isoformat(),
                }
            ]
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp1.status_code == 200
    res1 = resp1.json()["data"]["results"][0]
    assert res1["result"] == "valid"
    assert res1["status"] == "processed"

    # Second Scan: Double scan attempted with another scan id
    scan_id_2 = uuid.uuid4()
    resp2 = await client.post(
        "/api/v1/tickets/scans",
        json={
            "scans": [
                {
                    "id": str(scan_id_2),
                    "ticket_id": str(ticket_id),
                    "scanner_device_id": "DEVICE-GATE-B",
                    "result": "valid",
                    "scanned_at": (now + timedelta(seconds=30)).isoformat(),
                }
            ]
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp2.status_code == 200
    res2 = resp2.json()["data"]["results"][0]
    assert res2["result"] == "used"  # Marked as used! Double scan detected.

    # Idempotent re-submission of scan 1:
    resp1_retry = await client.post(
        "/api/v1/tickets/scans",
        json={
            "scans": [
                {
                    "id": str(scan_id_1),
                    "ticket_id": str(ticket_id),
                    "scanner_device_id": "DEVICE-GATE-A",
                    "result": "valid",
                    "scanned_at": now.isoformat(),
                }
            ]
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp1_retry.status_code == 200
    res1_retry = resp1_retry.json()["data"]["results"][0]
    assert res1_retry["status"] == "duplicate"


@pytest.mark.asyncio
async def test_revoked_ticket(client: AsyncClient, db_session: AsyncSession):
    """Test that a revoked ticket is rejected by scanners and included in sync revocations list."""
    staff_user_id = uuid.uuid4()
    agency_id = uuid.uuid4()
    staff_token = make_test_jwt(staff_user_id, role="agency")

    agency = Agency(
        id=agency_id,
        owner_user_id=staff_user_id,
        name="Sylhet Gateway",
        status="active",
        verification_status="verified",
    )
    db_session.add(agency)

    booking = Booking(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        agency_id=agency_id,
        booking_reference="SJ-TEST-RVK-01",
        product_type="flight",
        status="confirmed",
        flow_step="voucher_issued",
        destination_city="Sylhet",
        final_price=4200.0,
    )
    db_session.add(booking)

    now = datetime.now(timezone.utc)
    ticket_id = uuid.uuid4()
    payload = {
        "ticket_id": str(ticket_id),
        "booking_id": str(booking.id),
        "passenger_name": "Revoked Passenger",
        "service_type": "flight",
        "valid_from": now.isoformat(),
        "valid_to": (now + timedelta(days=1)).isoformat(),
        "seat": "2C",
    }
    sig = sign_ticket(payload)

    ticket = Ticket(
        id=ticket_id,
        booking_id=booking.id,
        passenger_name="Revoked Passenger",
        service_type="flight",
        valid_from=now,
        valid_to=now + timedelta(days=1),
        seat="2C",
        status="revoked",
        signature=sig,
    )
    db_session.add(ticket)
    await db_session.commit()

    # 1. Scan attempt receives 'revoked'
    resp = await client.post(
        "/api/v1/tickets/scans",
        json={
            "scans": [
                {
                    "id": str(uuid.uuid4()),
                    "ticket_id": str(ticket_id),
                    "scanner_device_id": "DEVICE-001",
                    "result": "valid",
                    "scanned_at": now.isoformat(),
                }
            ]
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["results"][0]["result"] == "revoked"

    # 2. Sync revocations endpoint includes this ticket
    revoc_resp = await client.get(
        "/api/v1/tickets/revocations",
        params={"since": (now - timedelta(hours=1)).isoformat()},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert revoc_resp.status_code == 200
    revoc_list = revoc_resp.json()["data"]["revocations"]
    assert any(r["ticket_id"] == str(ticket_id) and r["status"] == "revoked" for r in revoc_list)


@pytest.mark.asyncio
async def test_rls_on_tickets(client: AsyncClient, db_session: AsyncSession):
    """Test RLS policy enforcement: travelers see only their own tickets, other travelers get 403."""
    traveler_a = uuid.uuid4()
    traveler_b = uuid.uuid4()

    token_a = make_test_jwt(traveler_a, email="traveler.a@shopnojatra.com", role="user")
    token_b = make_test_jwt(traveler_b, email="traveler.b@shopnojatra.com", role="user")

    # Booking belongs to traveler A
    booking_a = Booking(
        id=uuid.uuid4(),
        user_id=traveler_a,
        booking_reference="SJ-RLS-TEST-A",
        product_type="flight",
        status="confirmed",
        destination_city="Chittagong",
        final_price=3000.0,
    )
    passenger = BookingPassenger(
        booking_id=booking_a.id,
        first_name="Traveler",
        last_name="Alpha",
        passenger_type="adult",
        seat_preference="12A",
    )
    booking_a.passengers.append(passenger)
    db_session.add(booking_a)
    await db_session.commit()

    # Traveler A can retrieve their tickets
    resp_a = await client.get(
        f"/api/v1/tickets/{booking_a.id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp_a.status_code == 200
    tickets_a = resp_a.json()["data"]
    assert len(tickets_a) == 1
    assert tickets_a[0]["passenger_name"] == "Traveler Alpha"
    assert "qr_payload" in tickets_a[0]

    # Traveler B trying to access traveler A's tickets is rejected with 403 Forbidden
    resp_b = await client.get(
        f"/api/v1/tickets/{booking_a.id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp_b.status_code == 403
