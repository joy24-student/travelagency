"""
Pytest Suite for Travel Disruption Intelligence & Journey Monitoring.
Tests flight delay detection, deduplication, AI impact analysis, and alternative search.
"""

import pytest
from datetime import datetime, timezone
import uuid

from app.models.travel_intelligence import JourneyMonitor
from app.services.travel_intelligence.disruption_engine import DisruptionEngineService
from app.services.travel_intelligence.impact_analyzer import DisruptionImpactAnalyzer
from app.services.travel_intelligence.providers.flight_provider import MockFlightProvider
from app.services.travel_intelligence.providers.rail_provider import BangladeshRailwayProvider
from app.services.travel_intelligence.providers.bus_provider import BangladeshBusProvider


@pytest.mark.asyncio
async def test_flight_delay_telemetry():
    provider = MockFlightProvider()
    res = await provider.get_flight_status("BG-433", "2026-12-05")
    assert res.flight_number == "BG-433"
    assert res.airline == "Biman Bangladesh Airlines"
    assert res.delay_minutes >= 0
    assert res.confidence > 0.9


@pytest.mark.asyncio
async def test_bangladesh_railway_delay_telemetry():
    provider = BangladeshRailwayProvider()
    res = await provider.get_train_status("701", "2026-12-05")
    assert res.train_name == "Subarna Express"
    assert res.data_source == "bangladesh_railway_bulletin"
    assert res.is_live_telemetry is True


@pytest.mark.asyncio
async def test_disruption_deduplication_hash():
    monitor_id = str(uuid.uuid4())
    event_type = "FLIGHT_DELAYED"
    delay = 45
    date_str = "2026-12-05"

    hash1 = DisruptionEngineService.calculate_dedup_hash(monitor_id, event_type, delay, date_str)
    hash2 = DisruptionEngineService.calculate_dedup_hash(monitor_id, event_type, delay, date_str)
    assert hash1 == hash2

    hash3 = DisruptionEngineService.calculate_dedup_hash(monitor_id, event_type, 60, date_str)
    assert hash1 != hash3


@pytest.mark.asyncio
async def test_ai_impact_analysis_hotel_conflict():
    now = datetime.now(timezone.utc)
    downstream = [
        {"type": "hotel", "name": "Sayeman Beach Resort"}
    ]
    alternatives = [
        {"operator_name": "Green Line", "fare_bdt": 1800, "verified_inventory": True}
    ]

    analysis = await DisruptionImpactAnalyzer.analyze_impact(
        service_type="flight",
        service_number="BG-433",
        origin="DAC",
        destination="CXB",
        delay_minutes=75,
        scheduled_arrival=now,
        downstream_services=downstream,
        available_alternatives=alternatives,
    )

    assert analysis.severity == "high"
    assert analysis.hotel_conflict_detected is True
    assert analysis.requires_user_approval is True
    assert len(analysis.recommendations) >= 1
