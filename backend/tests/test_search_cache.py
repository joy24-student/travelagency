"""
Test Travel Search API and Caching Behavior.
"""

import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import Airline, Airport, Flight
from app.models.hotel import Hotel, HotelRoom


@pytest.mark.asyncio
async def test_hotel_search_and_pagination(client: AsyncClient, db_session: AsyncSession):
    """Seed hotel records and test search filtering."""
    hotel = Hotel(
        id=uuid.uuid4(),
        name="Long Beach Hotel Cox's Bazar",
        city="Cox's Bazar",
        country="Bangladesh",
        star_rating=5,
        review_score=4.8,
        is_active=True,
    )
    room = HotelRoom(
        id=uuid.uuid4(),
        hotel_id=hotel.id,
        name="Deluxe Sea View Room",
        room_type="deluxe",
        base_price_per_night=8500.0,
        currency="BDT",
        is_available=True,
    )
    hotel.rooms.append(room)
    db_session.add(hotel)
    await db_session.commit()

    resp = await client.get("/api/v1/hotels/search?city=Cox's Bazar&page=1&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["name"] == "Long Beach Hotel Cox's Bazar"
    assert len(data["items"][0]["rooms"]) >= 1


@pytest.mark.asyncio
async def test_flight_search(client: AsyncClient, db_session: AsyncSession):
    """Seed flight routes and test search query."""
    from sqlalchemy import select

    code_suffix = uuid.uuid4().hex[:4].upper()
    airline_code = f"B{code_suffix[:2]}"
    origin_code = f"D{code_suffix[:2]}"
    dest_code = f"C{code_suffix[2:]}"

    airline = Airline(id=uuid.uuid4(), code=airline_code, name="Biman Bangladesh Airlines")
    origin = Airport(id=uuid.uuid4(), code=origin_code, name="Hazrat Shahjalal International Airport", city=f"Dhaka_{code_suffix}")
    dest = Airport(id=uuid.uuid4(), code=dest_code, name="Cox's Bazar Airport", city=f"Cox_{code_suffix}")

    db_session.add_all([airline, origin, dest])
    await db_session.flush()

    flight = Flight(
        id=uuid.uuid4(),
        flight_number=f"BG-{code_suffix}",
        airline_id=airline.id,
        origin_airport_id=origin.id,
        destination_airport_id=dest.id,
        departure_time=datetime(2026, 11, 10, 8, 30, tzinfo=timezone.utc),
        arrival_time=datetime(2026, 11, 10, 9, 30, tzinfo=timezone.utc),
        duration_minutes=60,
        base_price=4500.0,
        currency="BDT",
        available_seats=120,
        status="scheduled",
    )
    db_session.add(flight)
    await db_session.commit()

    resp = await client.get(f"/api/v1/flights/search?origin={origin_code}&destination={dest_code}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["flight_number"] == f"BG-{code_suffix}"
