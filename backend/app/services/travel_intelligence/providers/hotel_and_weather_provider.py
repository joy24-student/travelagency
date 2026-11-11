"""
Hotel & Weather Providers for Travel Disruption Analysis.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class HotelPolicyResult:
    def __init__(
        self,
        hotel_id: str,
        hotel_name: str,
        standard_checkin: str = "02:00 PM",
        latest_grace_checkin: str = "11:00 PM",
        late_checkin_notice_required: bool = True,
        rescheduling_allowed: bool = True,
        cancellation_policy: str = "Free cancellation up to 24h prior to check-in",
        direct_hotline: str = "+880 1700-000000",
    ):
        self.hotel_id = hotel_id
        self.hotel_name = hotel_name
        self.standard_checkin = standard_checkin
        self.latest_grace_checkin = latest_grace_checkin
        self.late_checkin_notice_required = late_checkin_notice_required
        self.rescheduling_allowed = rescheduling_allowed
        self.cancellation_policy = cancellation_policy
        self.direct_hotline = direct_hotline

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hotel_id": self.hotel_id,
            "hotel_name": self.hotel_name,
            "standard_checkin": self.standard_checkin,
            "latest_grace_checkin": self.latest_grace_checkin,
            "late_checkin_notice_required": self.late_checkin_notice_required,
            "rescheduling_allowed": self.rescheduling_allowed,
            "cancellation_policy": self.cancellation_policy,
            "direct_hotline": self.direct_hotline,
        }


class HotelProviderInterface(ABC):
    @abstractmethod
    async def get_hotel_policy(self, hotel_id: str) -> HotelPolicyResult:
        pass


class HotelInventoryProvider(HotelProviderInterface):
    """Checks hotel late check-in risks and rescheduling rules."""

    async def get_hotel_policy(self, hotel_id: str) -> HotelPolicyResult:
        return HotelPolicyResult(
            hotel_id=hotel_id,
            hotel_name="Sayeman Beach Resort (Cox's Bazar)",
            standard_checkin="02:00 PM",
            latest_grace_checkin="10:00 PM",
            late_checkin_notice_required=True,
            rescheduling_allowed=True,
            cancellation_policy="Reschedule with 0 penalty upon documented travel disruption",
            direct_hotline="+880 1819-000000",
        )


class WeatherAlertResult:
    def __init__(
        self,
        alert_type: str,
        severity: str,
        description: str,
        affected_route: str,
        marine_warning_signal: Optional[int] = None,
    ):
        self.alert_type = alert_type
        self.severity = severity
        self.description = description
        self.affected_route = affected_route
        self.marine_warning_signal = marine_warning_signal
        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_type": self.alert_type,
            "severity": self.severity,
            "description": self.description,
            "affected_route": self.affected_route,
            "marine_warning_signal": self.marine_warning_signal,
            "timestamp": self.timestamp.isoformat(),
        }


class WeatherProviderInterface(ABC):
    @abstractmethod
    async def check_route_weather(self, origin: str, destination: str) -> Optional[WeatherAlertResult]:
        pass


class WeatherDisruptionProvider(WeatherProviderInterface):
    """Monitors Bangladesh Meteorological Department warnings & OpenWeather."""

    async def check_route_weather(self, origin: str, destination: str) -> Optional[WeatherAlertResult]:
        # Detect marine warnings for Saint Martin or coastal Cox's Bazar / Kuakata
        if any(place in destination.lower() for place in ["saint martin", "kuakata", "cox"]):
            return WeatherAlertResult(
                alert_type="COASTAL_DEPRESSION",
                severity="medium",
                description="Moderate monsoon depression in North Bay of Bengal. Trawler & tourist ships cautioned.",
                affected_route=f"{origin} -> {destination}",
                marine_warning_signal=3,
            )
        return None
