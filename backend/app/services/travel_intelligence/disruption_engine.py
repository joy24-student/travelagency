"""
Event-Driven Disruption Engine & Journey Monitor Service.
Provides idempotent deduplication, provider status polling, impact analysis,
and notification triggering for active traveler trips.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.travel_intelligence import (
    AlternativeRecommendation,
    DisruptionEvent,
    DisruptionImpact,
    DisruptionTimelineEntry,
    JourneyMonitor,
)
from app.services.travel_intelligence.impact_analyzer import DisruptionImpactAnalyzer
from app.services.travel_intelligence.providers.flight_provider import AmadeusFlightProvider, MockFlightProvider
from app.services.travel_intelligence.providers.rail_provider import BangladeshRailwayProvider
from app.services.travel_intelligence.providers.bus_provider import BangladeshBusProvider
from app.services.travel_intelligence.providers.hotel_and_weather_provider import (
    HotelInventoryProvider,
    WeatherDisruptionProvider,
)

logger = logging.getLogger(__name__)


class DisruptionEngineService:
    """
    Core Disruption Service executing event loops, deduplication, and alternative generation.
    """

    @staticmethod
    def calculate_dedup_hash(monitor_id: str, event_type: str, delay_minutes: int, date_str: str) -> str:
        """Computes deterministic hash to avoid duplicate disruption alerts on repeated checks."""
        payload = f"{monitor_id}:{event_type}:{delay_minutes}:{date_str}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    async def verify_journey_status(
        cls,
        session: AsyncSession,
        monitor: JourneyMonitor,
        force_delay_test: Optional[int] = None,
    ) -> Optional[DisruptionEvent]:
        """
        Polls the relevant provider adapter and detects schedule or route anomalies.
        """
        service_type = monitor.service_type.lower()
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        delay_minutes = 0
        current_status = "on_time"
        source_name = "carrier_feed"
        confidence = 0.95

        # 1. Fetch live or authorized telemetry from isolated provider
        if service_type == "flight":
            provider = MockFlightProvider()
            res = await provider.get_flight_status(monitor.service_number, today_str)
            delay_minutes = force_delay_test if force_delay_test is not None else res.delay_minutes
            current_status = res.flight_status
            source_name = res.data_source
            confidence = res.confidence
        elif service_type == "train":
            provider = BangladeshRailwayProvider()
            res = await provider.get_train_status(monitor.service_number, today_str)
            delay_minutes = force_delay_test if force_delay_test is not None else res.delay_minutes
            current_status = res.running_status
            source_name = res.data_source
            confidence = res.confidence

        # Update monitor with last verified check
        monitor.last_checked_at = now
        monitor.delay_minutes = delay_minutes
        monitor.current_status = current_status
        monitor.confidence_score = confidence
        monitor.data_source = source_name

        # If no significant disruption, return None
        if delay_minutes < 15 and current_status == "on_time":
            await session.commit()
            return None

        event_type = f"{service_type.upper()}_DELAYED" if current_status == "delayed" else f"{service_type.upper()}_DISRUPTED"
        dedup_hash = cls.calculate_dedup_hash(str(monitor.id), event_type, delay_minutes, today_str)

        # 2. Check for duplicate event
        existing_q = await session.execute(
            select(DisruptionEvent).where(DisruptionEvent.dedup_hash == dedup_hash)
        )
        existing_event = existing_q.scalars().first()
        if existing_event:
            logger.info(f"Duplicate disruption event suppressed for monitor {monitor.id} (hash {dedup_hash[:8]})")
            return existing_event

        # 3. Create new DisruptionEvent
        severity = "high" if delay_minutes >= 60 else "medium"
        new_event = DisruptionEvent(
            id=uuid.uuid4(),
            monitor_id=monitor.id,
            user_id=monitor.user_id,
            event_type=event_type,
            severity=severity,
            previous_state={"status": "on_time", "delay_minutes": 0},
            new_state={"status": current_status, "delay_minutes": delay_minutes},
            delay_minutes=delay_minutes,
            source=source_name,
            confidence=confidence,
            dedup_hash=dedup_hash,
            event_timestamp=now,
            processing_status="analyzed",
        )
        session.add(new_event)
        await session.flush()

        # 4. Search real verified alternatives
        bus_provider = BangladeshBusProvider()
        alternatives = await bus_provider.search_alternatives(
            origin=monitor.origin,
            destination=monitor.destination,
            travel_date=today_str,
            max_budget=float(monitor.max_alternative_budget or 5000.0),
        )

        # 5. Run AI Impact Analysis
        downstream = [
            {"type": "hotel", "name": f"Hotel Stay at {monitor.destination}"},
            {"type": "connecting_bus", "name": f"Connecting Coach to Central {monitor.destination}"},
        ]
        impact_analysis = await DisruptionImpactAnalyzer.analyze_impact(
            service_type=service_type,
            service_number=monitor.service_number,
            origin=monitor.origin,
            destination=monitor.destination,
            delay_minutes=delay_minutes,
            scheduled_arrival=monitor.scheduled_arrival,
            downstream_services=downstream,
            available_alternatives=[a.to_dict() for a in alternatives],
        )

        # 6. Save Disruption Impact record
        impact = DisruptionImpact(
            id=uuid.uuid4(),
            event_id=new_event.id,
            affected_service_type="hotel_and_connection",
            impact_summary=impact_analysis.summary,
            connection_missed=not impact_analysis.connection_feasible,
            hotel_checkin_missed=impact_analysis.hotel_conflict_detected,
            severity=impact_analysis.severity,
            ai_explanation=impact_analysis.explanation,
            requires_user_approval=True,
            resolved=False,
        )
        session.add(impact)

        # 7. Save Alternative Recommendations
        for alt in alternatives[:2]:
            rec = AlternativeRecommendation(
                id=uuid.uuid4(),
                event_id=new_event.id,
                transport_type="bus",
                title=f"Express Bus ({alt.operator_name})",
                operator_name=alt.operator_name,
                route_description=f"{alt.origin} to {alt.destination} via {alt.bus_class}",
                departure_time=alt.departure_time,
                arrival_time=alt.arrival_time,
                duration_minutes=360,
                estimated_price=alt.fare_bdt,
                price_difference=alt.fare_bdt,
                currency="BDT",
                verified_availability=alt.verified_inventory,
                reliability_score=0.92,
                booking_action="search",
                action_payload={"operator": alt.operator_name, "class": alt.bus_class, "fare": alt.fare_bdt},
            )
            session.add(rec)

        # 8. Record in Disruption Timeline
        timeline_entry = DisruptionTimelineEntry(
            id=uuid.uuid4(),
            monitor_id=monitor.id,
            event_id=new_event.id,
            title=f"{event_type.replace('_', ' ')} Detected",
            description=f"Delay of {delay_minutes} minutes detected via {source_name}. Alternatives formulated.",
            entry_type="detected_change",
            actor_id=monitor.user_id,
        )
        session.add(timeline_entry)

        await session.commit()
        return new_event
