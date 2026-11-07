"""
Algorithmic Dynamic Pricing & Surge Calculation Service.
Enforces Fair Price Ceiling (max 1.25x base fare), Demand Elasticity Modeling,
Transparent Pricing Breakdowns, and Cryptographically Guaranteed 15-Minute Price Locks.

Tailored for Bangladesh Intercity Travel Ecosystem:
- Bus Seats (e.g. Dhaka <-> Cox's Bazar, Sylhet, Chittagong, Bogura)
- Launch Cabins (e.g. Sadarghat <-> Barishal, Bhola, Patuakhali riverine routes)
- Holiday Stays & Resorts (e.g. Cox's Bazar, Sajek Valley, Sreemangal, Saint Martin)
"""

import hashlib
import hmac
import logging
import math
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.schemas.surge import (
    PricingAdjustmentItemResponse,
    ProductCategoryEnum,
    SurgeCalculationRequest,
    SurgeQuoteResponse,
    VerifyQuoteResponse,
    WeatherConditionInput,
    WeatherSignalSeverity,
)

logger = logging.getLogger(__name__)

# Core Algorithmic Constants
MAX_PLATFORM_SURGE_MULTIPLIER = 1.250  # Hard Platform Ceiling Cap (1.25x)
MIN_PLATFORM_PRICE_FLOOR = 0.850       # Maximum 15% discount floor
EMERGENCY_WEATHER_CAP = 1.000          # Anti-predatory ceiling during severe danger
PRICE_GUARANTEE_WINDOW_SECONDS = 900   # 15 minutes = 900 seconds


class FestivalEvent:
    def __init__(self, name: str, festival_date: date, peak_days_before: int = 3, peak_days_after: int = 2):
        self.name = name
        self.festival_date = festival_date
        self.peak_days_before = peak_days_before
        self.peak_days_after = peak_days_after

    def days_distance(self, target_date: date) -> int:
        """Signed days from target to festival date (positive = before festival, negative = after)."""
        return (self.festival_date - target_date).days

    def is_in_peak(self, target_date: date) -> bool:
        diff = self.days_distance(target_date)
        return -self.peak_days_after <= diff <= self.peak_days_before

    def is_in_shoulder(self, target_date: date) -> bool:
        diff = self.days_distance(target_date)
        # 4 to 7 days before festival, or 3 to 4 days after
        return (self.peak_days_before < diff <= self.peak_days_before + 4) or (
            -(self.peak_days_after + 2) <= diff < -self.peak_days_after
        )


class SurgePricingService:
    """
    Algorithmic Dynamic Pricing Engine.
    Combines inventory scarcity elasticity, regional festival proximity,
    meteorological river/coastal signals, and strict consumer protection ceilings.
    """

    @classmethod
    def get_known_festivals(cls, year: int) -> List[FestivalEvent]:
        """
        Retrieves Bangladeshi cultural, religious, and holiday calendars for a given year.
        Includes Eid-ul-Fitr, Eid-ul-Adha, Durga Puja, Pohela Boishakh, and New Year.
        """
        # Calendar table for 2025, 2026, 2027
        festival_map = {
            2025: [
                FestivalEvent("Eid-ul-Fitr", date(2025, 3, 31), peak_days_before=4, peak_days_after=3),
                FestivalEvent("Pohela Boishakh (Bangla New Year)", date(2025, 4, 14), peak_days_before=2, peak_days_after=1),
                FestivalEvent("Eid-ul-Adha (Qurbani Eid)", date(2025, 6, 7), peak_days_before=4, peak_days_after=3),
                FestivalEvent("Durga Puja (Dashami)", date(2025, 10, 2), peak_days_before=3, peak_days_after=2),
                FestivalEvent("Winter Year-End Holiday", date(2025, 12, 31), peak_days_before=4, peak_days_after=2),
            ],
            2026: [
                FestivalEvent("Eid-ul-Fitr", date(2026, 3, 20), peak_days_before=4, peak_days_after=3),
                FestivalEvent("Pohela Boishakh (Bangla New Year)", date(2026, 4, 14), peak_days_before=2, peak_days_after=1),
                FestivalEvent("Eid-ul-Adha (Qurbani Eid)", date(2026, 5, 27), peak_days_before=4, peak_days_after=3),
                FestivalEvent("Durga Puja (Dashami)", date(2026, 10, 20), peak_days_before=3, peak_days_after=2),
                FestivalEvent("Winter Year-End Holiday", date(2026, 12, 31), peak_days_before=4, peak_days_after=2),
            ],
            2027: [
                FestivalEvent("Eid-ul-Fitr", date(2027, 3, 10), peak_days_before=4, peak_days_after=3),
                FestivalEvent("Pohela Boishakh (Bangla New Year)", date(2027, 4, 14), peak_days_before=2, peak_days_after=1),
                FestivalEvent("Eid-ul-Adha (Qurbani Eid)", date(2027, 5, 16), peak_days_before=4, peak_days_after=3),
                FestivalEvent("Durga Puja (Dashami)", date(2027, 10, 10), peak_days_before=3, peak_days_after=2),
                FestivalEvent("Winter Year-End Holiday", date(2027, 12, 31), peak_days_before=4, peak_days_after=2),
            ],
        }

        if year in festival_map:
            return festival_map[year]

        # Generic recurring fallback for arbitrary year
        return [
            FestivalEvent("Pohela Boishakh (Bangla New Year)", date(year, 4, 14), peak_days_before=2, peak_days_after=1),
            FestivalEvent("Winter Year-End Holiday", date(year, 12, 31), peak_days_before=4, peak_days_after=2),
            FestivalEvent("Spring Cultural Festival", date(year, 2, 21), peak_days_before=1, peak_days_after=1),
        ]

    @classmethod
    def evaluate_festival_proximity(
        cls, travel_date: date, category: ProductCategoryEnum
    ) -> Tuple[float, Optional[str], Optional[str]]:
        """
        Computes demand multiplier delta from nearby cultural and religious festivals.
        Returns: (multiplier_delta, label, explanation)
        """
        festivals = cls.get_known_festivals(travel_date.year)
        # Also check adjacent years in case travel date is near Jan 1 or Dec 31
        if travel_date.month == 1:
            festivals.extend(cls.get_known_festivals(travel_date.year - 1))
        elif travel_date.month == 12:
            festivals.extend(cls.get_known_festivals(travel_date.year + 1))

        closest_event: Optional[FestivalEvent] = None
        min_abs_days = 9999

        for event in festivals:
            dist = abs(event.days_distance(travel_date))
            if dist < min_abs_days:
                min_abs_days = dist
                closest_event = event

        if not closest_event:
            return 0.0, None, None

        is_transit = category in (ProductCategoryEnum.BUS, ProductCategoryEnum.LAUNCH)

        # 1. PEAK FESTIVAL WINDOW (0-3 days)
        if closest_event.is_in_peak(travel_date):
            if is_transit:
                # Bus & launch mass transit rush
                delta = 0.12
                label = f"{closest_event.name} Transit Demand +12%"
                explanation = (
                    f"Peak homecoming travel surge observed across major transit corridors "
                    f"for {closest_event.name}."
                )
            else:
                # Holiday stays / resort rush
                delta = 0.14
                label = f"{closest_event.name} Holiday Rush +14%"
                explanation = (
                    f"Peak resort and vacation destination occupancy for {closest_event.name} holiday period."
                )
            return delta, label, explanation

        # 2. SHOULDER WINDOW (4-7 days)
        if closest_event.is_in_shoulder(travel_date):
            if is_transit:
                delta = 0.06
                label = f"Pre-{closest_event.name} Transit Flow +6%"
                explanation = f"Heightened travel booking flow leading into {closest_event.name} holidays."
            else:
                delta = 0.07
                label = f"Shoulder {closest_event.name} Vacation Flow +7%"
                explanation = f"Early vacation arrivals for {closest_event.name} seasonal getaway."
            return delta, label, explanation

        # 3. EARLY BIRD WINDOW (8-14 days)
        if min_abs_days <= 14:
            delta = 0.02
            label = f"{closest_event.name} Advance Booking Trend +2%"
            explanation = f"Mild advance booking acceleration preceding {closest_event.name}."
            return delta, label, explanation

        return 0.0, None, None

    @classmethod
    def evaluate_quota_elasticity(
        cls, remaining_quota: int, total_quota: int, category: ProductCategoryEnum
    ) -> Tuple[float, Optional[str], Optional[str]]:
        """
        Calculates non-linear inventory scarcity elasticity.
        Returns: (multiplier_delta, label, explanation)
        """
        if total_quota <= 0:
            return 0.0, None, None

        scarcity_ratio = max(0.0, min(1.0, remaining_quota / total_quota))

        # Specialized naming based on category
        unit_name = "seats"
        if category == ProductCategoryEnum.LAUNCH:
            unit_name = "cabins"
        elif category in (ProductCategoryEnum.HOTEL, ProductCategoryEnum.STAY):
            unit_name = "rooms"

        # A. Critical Scarcity: <= 8% quota remaining (or <= 2 units left)
        if scarcity_ratio <= 0.08 or remaining_quota <= 2:
            delta = 0.14
            pct_left = max(1, round(scarcity_ratio * 100))
            label = f"Critical Scarcity Surge ({remaining_quota} {unit_name} left) +14%"
            explanation = (
                f"Less than {pct_left}% remaining capacity ({remaining_quota} {unit_name} left). "
                f"High-frequency booking velocity detected."
            )
            return delta, label, explanation

        # B. High Scarcity: 9% to 20% remaining
        if scarcity_ratio <= 0.20:
            delta = 0.09
            label = f"Scarce Inventory Surge (<20% {unit_name} left) +9%"
            explanation = (
                f"Inventory is running low with only {remaining_quota} of {total_quota} {unit_name} available."
            )
            return delta, label, explanation

        # C. Moderate Scarcity: 21% to 35% remaining
        if scarcity_ratio <= 0.35:
            delta = 0.05
            label = f"Route Demand Surge (<35% {unit_name} left) +5%"
            explanation = f"Elevated route occupancy with {remaining_quota} {unit_name} remaining."
            return delta, label, explanation

        # D. Balanced Capacity: 36% to 75% remaining
        if scarcity_ratio <= 0.75:
            return 0.0, None, None

        # E. Ample Vacancy / Off-Peak Incentive: > 75% remaining
        delta = -0.05
        label = f"Early Booking Saver ({unit_name.capitalize()} Availability >75%) -5%"
        explanation = (
            f"Ample seats/cabins available ({remaining_quota} open). "
            f"Early bird promotional incentive applied to reward early planning."
        )
        return delta, label, explanation

    @classmethod
    def evaluate_weather_impact(
        cls,
        weather: Optional[WeatherConditionInput],
        category: ProductCategoryEnum,
        travel_date: date,
    ) -> Tuple[float, Optional[str], Optional[str], bool]:
        """
        Evaluates weather conditions, riverine warning signals (1-4), and coastal storm alerts.
        Returns: (multiplier_delta, label, explanation, is_severe_danger)
        """
        if not weather:
            # Fallback check for seasonal winter fog (Dec - Jan) on river/highway routes
            if travel_date.month in (12, 1) and category in (ProductCategoryEnum.BUS, ProductCategoryEnum.LAUNCH):
                return (
                    -0.02,
                    "Winter Fog Advisory Buffer -2%",
                    "Seasonal winter fog conditions on river and highway routes; buffer applied.",
                    False,
                )
            return 0.0, None, None, False

        condition = (weather.condition or "").strip().lower()
        signal = weather.warning_signal or 0
        severity = weather.severity or WeatherSignalSeverity.NONE

        # 1. SEVERE WEATHER / CYCLONE / DANGER SIGNALS
        # Anti-predatory rule: NEVER surge during disaster, storm, or danger signals!
        is_severe = (
            severity == WeatherSignalSeverity.SEVERE_DANGER
            or signal >= 3
            or "cyclone" in condition
            or "storm" in condition
            or "danger" in condition
        )

        if is_severe:
            # Provide fare relief / freeze during severe weather
            label = "Disaster Weather Advisory Fare Protection -5%"
            explanation = (
                f"BMD Weather Danger Signal {signal or 'Active'} detected ('{condition}'). "
                f"Platform fare surge strictly suspended and safety relief discount applied."
            )
            return -0.05, label, explanation, True

        # 2. MODERATE WEATHER / RIVER WARNING SIGNAL 2 / DENSE FOG
        is_moderate = (
            severity == WeatherSignalSeverity.MODERATE_WARNING
            or signal == 2
            or "fog" in condition
            or "monsoon" in condition
            or "heavy_rain" in condition
        )

        if is_moderate:
            if category == ProductCategoryEnum.LAUNCH:
                label = "River Weather Advisory Buffer -3%"
                explanation = (
                    f"Inland river port cautionary signal {signal} ('{condition}'). "
                    f"Navigation buffer applied to support passenger travel flexibility."
                )
            else:
                label = "Highway Weather Advisory Buffer -2%"
                explanation = f"Inclement weather conditions ('{condition}') reported along transit corridor."
            return -0.03, label, explanation, False

        # 3. CAUTIONARY SIGNAL 1
        if signal == 1 or severity == WeatherSignalSeverity.CAUTIONARY:
            label = "River Cautionary Signal 1 Monitored 0%"
            explanation = "Light weather alert monitored by maritime authorities. Normal operations ongoing."
            return 0.0, label, explanation, False

        # 4. OPTIMAL TOURISM WEATHER (Clear Winter Coastal Season)
        if condition in ("clear", "sunny", "pleasant") and travel_date.month in (11, 12, 1, 2):
            if category in (ProductCategoryEnum.HOTEL, ProductCategoryEnum.STAY):
                label = "Peak Winter Tourism Season +3%"
                explanation = "Optimal coastal and hill tract weather during peak dry travel season."
                return 0.03, label, explanation, False

        return 0.0, None, None, False

    @classmethod
    def evaluate_day_of_week_elasticity(
        cls, travel_date: date, category: ProductCategoryEnum
    ) -> Tuple[float, Optional[str], Optional[str]]:
        """
        Bangladesh Weekend Pattern:
        Thursday evening & Friday = Peak departure.
        Saturday = Weekend return / resort stay.
        """
        weekday = travel_date.weekday()  # Monday is 0, Sunday is 6. Thursday=3, Friday=4, Saturday=5
        is_transit = category in (ProductCategoryEnum.BUS, ProductCategoryEnum.LAUNCH)

        if is_transit and weekday in (3, 4):  # Thursday & Friday
            day_name = "Thursday Evening" if weekday == 3 else "Friday Morning"
            return (
                0.04,
                f"Weekend Transit Commute ({day_name}) +4%",
                f"High-volume intercity departure demand during the Bangladeshi weekend transition.",
            )
        elif not is_transit and weekday in (4, 5):  # Friday & Saturday hotel stays
            return (
                0.05,
                "Weekend Leisure Stay Surge +5%",
                "Elevated weekend resort and hotel occupancy demand across prime holiday destinations.",
            )

        return 0.0, None, None

    @classmethod
    def generate_hmac_signature(
        cls, quote_id: str, product_id: str, final_price: float, expires_at_iso: str
    ) -> str:
        """
        Generates a cryptographic HMAC-SHA256 signature to guarantee quote integrity.
        Prevents client tampering with locked prices.
        """
        secret = settings.SECRET_KEY.encode("utf-8")
        payload = f"{quote_id}:{product_id}:{final_price:.2f}:{expires_at_iso}".encode("utf-8")
        return hmac.new(secret, payload, hashlib.sha256).hexdigest()

    @classmethod
    def calculate_surge_quote(
        cls,
        request: SurgeCalculationRequest,
        reference_time: Optional[datetime] = None,
    ) -> SurgeQuoteResponse:
        """
        Primary Algorithmic Pricing Engine.
        Executes multi-factor demand elasticity modeling:
        1. Remaining Quota Scarcity
        2. Local Festival Proximity (Eid, Puja, Bangla New Year, English New Year)
        3. Meteorological Warning Signals & Riverine Caution
        4. Day-of-week demand patterns
        5. Hard Fair Price Platform Ceiling (max 1.25x)
        6. Generates 15-minute cryptographically signed quote
        """
        now = reference_time or datetime.now(timezone.utc)
        travel_date = request.travel_date or now.date()
        base_price = float(request.base_price)

        breakdown_items: List[PricingAdjustmentItemResponse] = []
        raw_multiplier = 1.0

        # Factor 1: Remaining Quota Scarcity
        quota_delta, quota_label, quota_exp = cls.evaluate_quota_elasticity(
            remaining_quota=request.remaining_quota,
            total_quota=request.total_quota,
            category=request.category,
        )
        if quota_delta != 0.0 and quota_label:
            raw_multiplier += quota_delta
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="QUOTA_ELASTICITY",
                    label=quota_label,
                    percentage=round(quota_delta * 100, 1),
                    factor_str=f"{quota_delta * 100:+.1f}%",
                    amount=round(base_price * quota_delta, 2),
                    description=quota_exp or "",
                )
            )

        # Factor 2: Local Festival Proximity
        fest_delta, fest_label, fest_exp = cls.evaluate_festival_proximity(
            travel_date=travel_date, category=request.category
        )
        if fest_delta != 0.0 and fest_label:
            raw_multiplier += fest_delta
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="FESTIVAL_PROXIMITY",
                    label=fest_label,
                    percentage=round(fest_delta * 100, 1),
                    factor_str=f"{fest_delta * 100:+.1f}%",
                    amount=round(base_price * fest_delta, 2),
                    description=fest_exp or "",
                )
            )

        # Factor 3: Weather & Safety Warnings
        weather_delta, weather_label, weather_exp, is_severe_danger = cls.evaluate_weather_impact(
            weather=request.weather,
            category=request.category,
            travel_date=travel_date,
        )
        if weather_delta != 0.0 and weather_label:
            raw_multiplier += weather_delta
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="WEATHER_SAFETY",
                    label=weather_label,
                    percentage=round(weather_delta * 100, 1),
                    factor_str=f"{weather_delta * 100:+.1f}%",
                    amount=round(base_price * weather_delta, 2),
                    description=weather_exp or "",
                )
            )

        # Factor 4: Day of Week Trend
        dow_delta, dow_label, dow_exp = cls.evaluate_day_of_week_elasticity(
            travel_date=travel_date, category=request.category
        )
        if dow_delta != 0.0 and dow_label:
            raw_multiplier += dow_delta
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="WEEKEND_TIMING",
                    label=dow_label,
                    percentage=round(dow_delta * 100, 1),
                    factor_str=f"{dow_delta * 100:+.1f}%",
                    amount=round(base_price * dow_delta, 2),
                    description=dow_exp or "",
                )
            )

        # -------------------------------------------------------------
        # CEILING CAP & FAIR PRICING GOVERNANCE
        # -------------------------------------------------------------
        is_capped = False
        cap_savings_amount = 0.0
        effective_multiplier = raw_multiplier

        # Rule A: Severe Weather Safety Ceiling (Cap at 1.00x during storm/disaster danger)
        if is_severe_danger and effective_multiplier > EMERGENCY_WEATHER_CAP:
            cap_diff = effective_multiplier - EMERGENCY_WEATHER_CAP
            cap_savings_amount += round(cap_diff * base_price, 2)
            effective_multiplier = EMERGENCY_WEATHER_CAP
            is_capped = True
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="EMERGENCY_WEATHER_CAP",
                    label="Disaster Weather Safety Cap Enforced",
                    percentage=round(-cap_diff * 100, 1),
                    factor_str=f"{-cap_diff * 100:+.1f}%",
                    amount=-round(cap_diff * base_price, 2),
                    description=(
                        "Anti-gouging protection: All fare surges are strictly frozen during "
                        "severe weather signals and maritime warnings."
                    ),
                )
            )

        # Rule B: Hard Platform Ceiling (Cap at 1.25x max)
        if effective_multiplier > MAX_PLATFORM_SURGE_MULTIPLIER:
            excess = effective_multiplier - MAX_PLATFORM_SURGE_MULTIPLIER
            cap_savings_amount += round(excess * base_price, 2)
            effective_multiplier = MAX_PLATFORM_SURGE_MULTIPLIER
            is_capped = True
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="FAIR_PRICE_CEILING_CAP",
                    label="Fair Price Ceiling (1.25x Platform Cap)",
                    percentage=round(-excess * 100, 1),
                    factor_str=f"{-excess * 100:+.1f}%",
                    amount=-round(excess * base_price, 2),
                    description=(
                        f"Consumer Fair Price Protection: Surge strictly capped at 1.25x base fare "
                        f"to prevent predatory pricing during peak travel seasons."
                    ),
                )
            )

        # Rule C: Floor Enforcement (Floor at 0.85x min)
        if effective_multiplier < MIN_PLATFORM_PRICE_FLOOR:
            floor_diff = MIN_PLATFORM_PRICE_FLOOR - effective_multiplier
            effective_multiplier = MIN_PLATFORM_PRICE_FLOOR
            breakdown_items.append(
                PricingAdjustmentItemResponse(
                    code="FAIR_PRICE_FLOOR",
                    label="Platform Fair Price Floor (0.85x)",
                    percentage=round(floor_diff * 100, 1),
                    factor_str=f"{floor_diff * 100:+.1f}%",
                    amount=round(floor_diff * base_price, 2),
                    description="Standard promotional floor enforced to preserve transport operator sustainability.",
                )
            )

        # Calculate Final Rounded Fare
        calculated_fare = base_price * effective_multiplier
        final_price = float(round(calculated_fare))

        # Guarantee Window: 15 minutes = 900 seconds
        expires_at = now + timedelta(seconds=PRICE_GUARANTEE_WINDOW_SECONDS)
        expires_at_iso = expires_at.isoformat()

        # Generate Cryptographic Quote ID & Signature
        short_uuid = uuid.uuid4().hex[:8].upper()
        date_stamp = now.strftime("%Y%m%d")
        quote_id = f"SJ-Q-{date_stamp}-{request.category.value[:3].upper()}-{short_uuid}"

        signature = cls.generate_hmac_signature(
            quote_id=quote_id,
            product_id=request.product_id,
            final_price=final_price,
            expires_at_iso=expires_at_iso,
        )

        return SurgeQuoteResponse(
            quote_id=quote_id,
            product_id=request.product_id,
            category=request.category.value,
            base_price=base_price,
            final_price=final_price,
            surge_multiplier=round(effective_multiplier, 3),
            raw_multiplier=round(raw_multiplier, 3),
            is_capped=is_capped,
            cap_savings_amount=cap_savings_amount,
            currency=request.currency or "BDT",
            guarantee_window_seconds=PRICE_GUARANTEE_WINDOW_SECONDS,
            created_at=now,
            expires_at=expires_at,
            breakdown=breakdown_items,
            guarantee_text="Price guaranteed for 15:00 minutes",
            signature=signature,
        )

    @classmethod
    def verify_quote(
        cls,
        quote_id: str,
        signature: str,
        product_id: str,
        final_price: float,
        expires_at: datetime,
        current_time: Optional[datetime] = None,
    ) -> VerifyQuoteResponse:
        """
        Validates the authenticity and expiration window of a previously issued dynamic pricing quote.
        """
        now = current_time or datetime.now(timezone.utc)
        expires_at_utc = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)

        expected_sig = cls.generate_hmac_signature(
            quote_id=quote_id,
            product_id=product_id,
            final_price=final_price,
            expires_at_iso=expires_at_utc.isoformat(),
        )

        if not hmac.compare_digest(signature, expected_sig):
            return VerifyQuoteResponse(
                valid=False,
                is_expired=False,
                remaining_seconds=0,
                message="Tampered or invalid quote cryptographic signature.",
            )

        remaining_seconds = int((expires_at_utc - now).total_seconds())

        if remaining_seconds <= 0:
            return VerifyQuoteResponse(
                valid=True,
                is_expired=True,
                remaining_seconds=0,
                message="Quote 15-minute price guarantee has expired.",
            )

        return VerifyQuoteResponse(
            valid=True,
            is_expired=False,
            remaining_seconds=remaining_seconds,
            message=f"Quote is valid. Price locked for {remaining_seconds // 60}:{remaining_seconds % 60:02d} minutes.",
        )
