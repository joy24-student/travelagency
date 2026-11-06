"""
Tests for Booking State Machine and Concurrency Row Locking.
Verifies double-booking prevention and state transitions.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import Airline, Airport, Flight, FlightSeat
from app.models.hotel import Hotel, HotelRoom, HotelRoomAvailability
from tests.conftest import create_test_jwt


@pytest.mark.asyncio
async def test_create_booking_atomic_reservation(client: AsyncClient, db_session: AsyncSession):
    """Test creating a valid hotel booking reservation."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id)

    # Seed Hotel and Room
    hotel = Hotel(
        name="Cox's Bazar Sea Breeze Resort",
        city="Cox's Bazar",
        country="Bangladesh",
        base_price=120.0,
    )
    db_session.add(hotel)
    await db_session.flush()

    room = HotelRoom(
        hotel_id=hotel.id,
        room_type="Deluxe Ocean View",
        max_occupancy=2,
        base_price=120.0,
    )
    db_session.add(room)
    await db_session.flush()

    today = date.today()
    check_out = today + timedelta(days=3)

    availability = HotelRoomAvailability(
        room_id=room.id,
        check_in_date=today,
        check_out_date=check_out,
        available_count=5,
        price=120.0,
    )
    db_session.add(availability)
    await db_session.commit()

    # Create Booking Request
    payload = {
        "product_type": "hotel",
        "destination_city": "Cox's Bazar",
        "destination_country": "Bangladesh",
        "start_date": str(today),
        "end_date": str(check_out),
        "number_of_guests": 2,
        "items": [
            {
                "product_id": str(room.id),
                "product_type": "hotel",
                "product_name": "Deluxe Ocean View Room",
                "quantity": 2,
                "unit_price": 120.0,
                "metadata": {"room_id": str(room.id)},
            }
        ],
        "passengers": [
            {
                "first_name": "Rahim",
                "last_name": "Uddin",
                "email": "rahim@example.com",
                "is_primary": True,
            }
        ],
    }

    response = await client.post(
        "/api/v1/bookings",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    booking_data = response.json()
    assert booking_data["status"] == "pending_payment"
    assert booking_data["booking_reference"].startswith("SJ-")
    assert booking_data["number_of_guests"] == 2
    assert len(booking_data["items"]) == 1

    # Verify availability was decremented from 5 to 3
    await db_session.refresh(availability)
    assert availability.available_count == 3


@pytest.mark.asyncio
async def test_double_booking_prevention_on_flight_seats(client: AsyncClient, db_session: AsyncSession):
    """Attempting to book an already occupied seat must return 409 Conflict."""
    user_1_id = uuid.uuid4()
    user_2_id = uuid.uuid4()
    token_1 = create_test_jwt(user_id=user_1_id)
    token_2 = create_test_jwt(user_id=user_2_id)

    # Seed Airline, Flight and Seat
    airline = Airline(iata_code="BG", name="Biman Bangladesh Airlines")
    db_session.add(airline)
    await db_session.flush()

    flight = Flight(
        flight_number="BG-433",
        airline_id=airline.id,
        departure_time=datetime.now(timezone.utc) + timedelta(days=2),
        arrival_time=datetime.now(timezone.utc) + timedelta(days=2, hours=1),
        base_price=65.0,
        available_seats=1,
        total_seats=150,
    )
    db_session.add(flight)
    await db_session.flush()

    seat = FlightSeat(
        flight_id=flight.id,
        seat_number="12A",
        cabin_class="Economy",
        price=65.0,
        is_available=True,
    )
    db_session.add(seat)
    await db_session.commit()

    # User 1 books seat 12A
    payload_1 = {
        "product_type": "flight",
        "destination_city": "Cox's Bazar",
        "items": [
            {
                "product_id": str(flight.id),
                "product_type": "flight",
                "product_name": "Economy Flight BG-433",
                "quantity": 1,
                "unit_price": 65.0,
                "metadata": {"seat_numbers": ["12A"]},
            }
        ],
        "passengers": [{"first_name": "User", "last_name": "One"}],
    }

    res1 = await client.post("/api/v1/bookings", json=payload_1, headers={"Authorization": f"Bearer {token_1}"})
    assert res1.status_code == 201

    # User 2 attempts to concurrently book the SAME seat 12A
    payload_2 = {
        "product_type": "flight",
        "destination_city": "Cox's Bazar",
        "items": [
            {
                "product_id": str(flight.id),
                "product_type": "flight",
                "product_name": "Economy Flight BG-433",
                "quantity": 1,
                "unit_price": 65.0,
                "metadata": {"seat_numbers": ["12A"]},
            }
        ],
        "passengers": [{"first_name": "User", "last_name": "Two"}],
    }

    res2 = await client.post("/api/v1/bookings", json=payload_2, headers={"Authorization": f"Bearer {token_2}"})
    # MUST be rejected with 409 Conflict
    assert res2.status_code == 409
    problem = res2.json()
    assert problem["status"] == 409
    assert problem["title"] == "Resource Conflict"
    assert "already booked" in problem["detail"] or "available" in problem["detail"]


@pytest.mark.asyncio
async def test_booking_state_machine_transitions(client: AsyncClient, db_session: AsyncSession):
    """Test valid transitions and rejection of illegal state machine transitions."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id)

    # Create dummy hotel & room
    hotel = Hotel(name="Pan Pacific Sonargaon", city="Dhaka", country="Bangladesh", base_price=180.0)
    db_session.add(hotel)
    await db_session.flush()

    room = HotelRoom(hotel_id=hotel.id, room_type="Executive Suite", base_price=180.0)
    db_session.add(room)
    await db_session.commit()

    payload = {
        "product_type": "hotel",
        "destination_city": "Dhaka",
        "items": [
            {
                "product_id": str(room.id),
                "product_type": "hotel",
                "product_name": "Executive Suite",
                "quantity": 1,
                "unit_price": 180.0,
            }
        ],
        "passengers": [{"first_name": "Karim", "last_name": "Hasan"}],
    }

    create_res = await client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    booking_id = create_res.json()["id"]

    # 1. Transition pending_payment -> confirmed
    confirm_res = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"target_status": "confirmed", "payment_transaction_id": "TXN-TEST-123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"

    # 2. Transition confirmed -> cancelled
    cancel_res = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"target_status": "cancelled", "reason": "Travel plans changed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cancel_res.status_code == 200, cancel_res.text
    assert cancel_res.json()["status"] == "cancelled"

    # 3. Illegal transition: cancelled -> confirmed (must fail with 400 Bad Request)
    illegal_res = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"target_status": "confirmed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert illegal_res.status_code == 400
    problem = illegal_res.json()
    assert problem["status"] == 400
    assert "Cannot transition" in problem["detail"]
