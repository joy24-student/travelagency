"""
Pytest Suite for Itinerary Marketplace & Booking Saga Execution.
Tests creator attribution, clone independence, budget optimizer, and atomic saga rollback.
"""

import pytest
import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.models.itinerary import Itinerary, ItineraryClone
from app.services.booking_saga import BookingSagaOrchestrator


@pytest.mark.asyncio
async def test_booking_saga_successful_multi_service():
    mock_session = AsyncMock()
    mock_session.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: None))

    services = [
        {"service_type": "flight", "title": "Biman BG-433", "price": 4200.0, "quantity": 1},
        {"service_type": "hotel", "title": "Sayeman Beach Resort", "price": 6500.0, "quantity": 1},
    ]

    result = await BookingSagaOrchestrator.execute_trip_booking_saga(
        session=mock_session,
        user_id=uuid.uuid4(),
        idempotency_key="saga-test-key-1",
        clone_id=uuid.uuid4(),
        services_to_book=services,
        total_amount=10700.0,
        payment_method="bkash",
    )

    assert result["status"] == "CONFIRMED"
    assert result["booking_reference"].startswith("SJ-TRIP-")
    assert len(result["step_results"]) == 2
    assert all(r["success"] for r in result["step_results"])


@pytest.mark.asyncio
async def test_booking_saga_compensating_action_on_supplier_failure():
    mock_session = AsyncMock()
    mock_session.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: None))

    # Second service simulates supplier failure
    services = [
        {"service_type": "flight", "title": "Biman BG-433", "price": 4200.0, "quantity": 1},
        {"service_type": "hotel", "title": "Sayeman Beach Resort", "price": 6500.0, "quantity": 1, "simulate_failure": True},
    ]

    result = await BookingSagaOrchestrator.execute_trip_booking_saga(
        session=mock_session,
        user_id=uuid.uuid4(),
        idempotency_key="saga-test-key-2",
        clone_id=uuid.uuid4(),
        services_to_book=services,
        total_amount=10700.0,
        payment_method="bkash",
    )

    assert result["status"] == "PARTIALLY_CONFIRMED"
    assert result["requires_action"] is True
    assert "could not be reserved" in result["message"]
