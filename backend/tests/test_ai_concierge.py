"""
Tests for AI Travel Concierge Structured Itinerary Generation.
"""

import uuid
import pytest
from httpx import AsyncClient

from tests.conftest import create_test_jwt


@pytest.mark.asyncio
async def test_ai_plan_trip_structured_output(client: AsyncClient):
    """Test generating a structured itinerary with budget and traveler preferences."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id)

    payload = {
        "destination": "Cox's Bazar",
        "origin": "Dhaka",
        "start_date": "2026-12-15",
        "end_date": "2026-12-18",
        "travelers": 2,
        "interests": ["beach", "seafood", "relaxation"],
        "budget": 500.0,
        "currency": "USD",
        "travel_style": "mid-range",
        "save_to_account": False,
    }

    response = await client.post(
        "/api/v1/ai/plan-trip",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    plan = response.json()
    assert "title" in plan
    assert plan["destination"] == "Cox's Bazar"
    assert len(plan["days"]) >= 1
    assert "budget_breakdown" in plan
    assert len(plan["budget_breakdown"]) >= 1
    assert "tips" in plan
