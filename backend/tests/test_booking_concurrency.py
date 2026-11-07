"""
Test Booking Atomic Creation, Concurrency, and State Machine.
"""

import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import Airline, Airport, Flight, FlightSeat
from app.models.hotel import Hotel, HotelRoom
from tests.conftest import make_test_jwt


@pytest.mark.asyncio
async def test_atomic_booking_creation_and_state_transition(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Create atomic booking with hotel room and transition through state machine."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id)

    hotel = Hotel(
        id=uuid.uuid4(),
        name="Hotel Sea Crown",
        city="Cox's Bazar",
        star_rating=4,
    )
    room = HotelRoom(
        id=uuid.uuid4(),
        hotel_id=hotel.id,
        name="Ocean Suite",
        base_price_per_night=6000.0,
        currency="BDT",
        is_available=True,
    )
    hotel.rooms.append(room)
    db_session.add(hotel)
    await db_session.commit()

    booking_payload = {
        "product_type": "hotel",
        "destination_city": "Cox's Bazar",
        "number_of_guests": 2,
        "items": [
            {
                "product_type": "hotel",
                "product_id": str(room.id),
                "product_name": "Ocean Suite",
                "quantity": 1,
                "unit_price": 6000.0,
            }
        ],
        "passengers": [
            {
                "first_name": "Rahim",
                "last_name": "Uddin",
                "email": "rahim@example.com",
            }
        ],
    }

    # 1. Create booking
    resp = await client.post(
        "/api/v1/bookings",
        json=booking_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    booking_data = resp.json()["data"]
    booking_id = booking_data["id"]
    assert booking_data["status"] == "payment_pending"
    assert booking_data["booking_reference"].startswith("SJ-")

    # 2. Transition status to confirmed
    status_resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"target_status": "confirmed", "payment_transaction_id": "TXN-TEST-1234"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["status"] == "confirmed"

    # 3. Download official PDF travel voucher
    ticket_resp = await client.get(
        f"/api/v1/bookings/{booking_id}/ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ticket_resp.status_code == 200
    assert ticket_resp.headers["content-type"] == "application/pdf"
    assert len(ticket_resp.content) > 1000
    assert ticket_resp.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_flight_seat_double_booking_prevention(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Reserving an already booked seat triggers 409 Conflict."""
    user1 = uuid.uuid4()
    user2 = uuid.uuid4()
    token1 = make_test_jwt(user1)
    token2 = make_test_jwt(user2)

    airline = Airline(id=uuid.uuid4(), code="VQ", name="Novoair")
    origin = Airport(id=uuid.uuid4(), code="DAC", name="Dhaka", city="Dhaka")
    dest = Airport(id=uuid.uuid4(), code="JSR", name="Jashore", city="Jashore")
    db_session.add_all([airline, origin, dest])
    await db_session.flush()

    flight = Flight(
        id=uuid.uuid4(),
        flight_number="VQ-901",
        airline_id=airline.id,
        origin_airport_id=origin.id,
        destination_airport_id=dest.id,
        departure_time=datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc),
        arrival_time=datetime(2026, 11, 15, 10, 45, tzinfo=timezone.utc),
        duration_minutes=45,
        base_price=3500.0,
        available_seats=1,
    )
    seat = FlightSeat(
        id=uuid.uuid4(),
        flight_id=flight.id,
        seat_number="1A",
        price=3500.0,
        is_available=True,
    )
    flight.seats.append(seat)
    db_session.add(flight)
    await db_session.commit()

    payload = {
        "product_type": "flight",
        "destination_city": "Jashore",
        "origin_city": "Dhaka",
        "number_of_guests": 1,
        "items": [
            {
                "product_type": "flight",
                "product_id": str(flight.id),
                "product_name": "Flight VQ-901",
                "quantity": 1,
                "unit_price": 3500.0,
            }
        ],
        "passengers": [
            {
                "first_name": "First",
                "last_name": "Traveler",
                "seat_id": str(seat.id),
            }
        ],
    }

    # First traveler books seat 1A
    resp1 = await client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token1}"})
    assert resp1.status_code == 201

    # Second traveler attempts to book the same seat 1A -> Conflict
    resp2 = await client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token2}"})
    assert resp2.status_code == 409
    assert resp2.json()["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_flight_seat_lock_and_release(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Temporary seat locking during checkout and release lifecycle."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id)

    airline = Airline(id=uuid.uuid4(), code="2A", name="Air Astra")
    origin = Airport(id=uuid.uuid4(), code="DAC2", name="Dhaka", city="Dhaka")
    dest = Airport(id=uuid.uuid4(), code="CXB2", name="Cox's Bazar", city="Cox's Bazar")
    db_session.add_all([airline, origin, dest])
    await db_session.flush()

    flight = Flight(
        id=uuid.uuid4(),
        flight_number="2A-511",
        airline_id=airline.id,
        origin_airport_id=origin.id,
        destination_airport_id=dest.id,
        departure_time=datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc),
        arrival_time=datetime(2026, 11, 20, 13, 0, tzinfo=timezone.utc),
        duration_minutes=60,
        base_price=4500.0,
        available_seats=10,
    )
    seat = FlightSeat(
        id=uuid.uuid4(),
        flight_id=flight.id,
        seat_number="3B",
        price=4500.0,
        is_available=True,
    )
    flight.seats.append(seat)
    db_session.add(flight)
    await db_session.commit()

    # 1. Lock seat
    lock_resp = await client.post(
        f"/api/v1/flights/{flight.id}/seats/{seat.id}/lock",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert lock_resp.status_code == 200
    lock_data = lock_resp.json()["data"]
    assert lock_data["seat_id"] == str(seat.id)
    assert lock_data["status"] == "locked"
    assert lock_data["expires_in_seconds"] > 0

    # 2. Release seat lock
    rel_resp = await client.delete(
        f"/api/v1/flights/{flight.id}/seats/{seat.id}/lock",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert rel_resp.status_code == 200
    assert rel_resp.json()["data"]["status"] == "released"
