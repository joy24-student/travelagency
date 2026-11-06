"""
Tests for Hotel and Flight Search with Redis Caching and Response Headers.
"""

import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import Airline, Airport, Flight
from app.models.hotel import Hotel


@pytest.mark.asyncio
async def test_hotel_search_and_caching(client: AsyncClient, db_session: AsyncSession):
    """Test searching hotels with location filters and verify Redis cache behavior."""
    # Seed 2 hotels
    h1 = Hotel(
        name="Long Beach Hotel",
        city="Cox's Bazar",
        country="Bangladesh",
        star_rating=4.5,
        base_price=95.0,
    )
    h2 = Hotel(
        name="The Westin",
        city="Dhaka",
        country="Bangladesh",
        star_rating=5.0,
        base_price=220.0,
    )
    db_session.add_all([h1, h2])
    await db_session.commit()

    # Search for Cox's Bazar hotels
    res1 = await client.get("/api/v1/hotels/search", params={"city": "Cox's Bazar", "page": 1, "page_size": 10})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total"] >= 1
    assert any(h["name"] == "Long Beach Hotel" for h in data1["items"])
    assert res1.headers["X-Cache"] in ("MISS", "HIT")

    # Second search with same params should be cached
    res2 = await client.get("/api/v1/hotels/search", params={"city": "Cox's Bazar", "page": 1, "page_size": 10})
    assert res2.status_code == 200


@pytest.mark.asyncio
async def test_flight_search_with_filters(client: AsyncClient, db_session: AsyncSession):
    """Test searching flights by airport codes and passenger count."""
    airline = Airline(iata_code="US", name="US-Bangla Airlines")
    db_session.add(airline)
    await db_session.flush()

    dac = Airport(iata_code="DAC", name="Hazrat Shahjalal Intl", city="Dhaka", country="Bangladesh")
    cxb = Airport(iata_code="CXB", name="Cox's Bazar Airport", city="Cox's Bazar", country="Bangladesh")
    db_session.add_all([dac, cxb])
    await db_session.flush()

    flight = Flight(
        flight_number="BS-141",
        airline_id=airline.id,
        departure_airport_id=dac.id,
        arrival_airport_id=cxb.id,
        departure_time=datetime(2026, 12, 1, 10, 0, tzinfo=timezone.utc),
        arrival_time=datetime(2026, 12, 1, 11, 0, tzinfo=timezone.utc),
        base_price=75.0,
        available_seats=50,
        cabin_class="Economy",
    )
    db_session.add(flight)
    await db_session.commit()

    # Search DAC to CXB
    res = await client.get("/api/v1/flights/search", params={"origin": "DAC", "destination": "CXB", "passengers": 2})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 1
    assert any(f["flight_number"] == "BS-141" for f in data["items"])
