"""
Comprehensive Unit & Integration Test Suite for Algorithmic Surge Pricing Engine.
Validates:
1. Demand Elasticity (remaining quota, festival proximity, weather warnings)
2. Fair Price Ceiling (strict 1.25x hard cap)
3. Transparent Pricing Breakdown (human-readable explanations and itemized amounts)
4. 15-Minute Price Lock Guarantee & HMAC Signature Verification
5. HTTP Endpoints (/api/v1/pricing/surge-quote & /api/v1/pricing/verify-quote)
"""

from datetime import date, datetime, timedelta, timezone
import pytest
from httpx import AsyncClient

from app.schemas.surge import (
    ProductCategoryEnum,
    SurgeCalculationRequest,
    WeatherConditionInput,
    WeatherSignalSeverity,
)
from app.services.surge_service import (
    MAX_PLATFORM_SURGE_MULTIPLIER,
    PRICE_GUARANTEE_WINDOW_SECONDS,
    SurgePricingService,
)


@pytest.mark.asyncio
async def test_quota_scarcity_elasticity():
    """Test that dwindling quota increases fare smoothly, while high vacancy grants early bird saver."""
    # 1. Critical Scarcity (<= 8% quota remaining: 2 out of 36 seats)
    req_critical = SurgeCalculationRequest(
        category=ProductCategoryEnum.BUS,
        product_id="bus-hanif-1",
        base_price=1000.0,
        remaining_quota=2,
        total_quota=36,
        travel_date=date(2026, 8, 12),  # non-festival, mid-week Wednesday
    )
    quote_crit = SurgePricingService.calculate_surge_quote(req_critical)
    assert any(b.code == "QUOTA_ELASTICITY" and "Critical Scarcity" in b.label for b in quote_crit.breakdown)
    assert quote_crit.surge_multiplier > 1.0

    # 2. Ample Vacancy (> 75% remaining: 32 out of 36 seats) -> Early Booking Saver
    req_ample = SurgeCalculationRequest(
        category=ProductCategoryEnum.BUS,
        product_id="bus-hanif-1",
        base_price=1000.0,
        remaining_quota=32,
        total_quota=36,
        travel_date=date(2026, 8, 12),
    )
    quote_ample = SurgePricingService.calculate_surge_quote(req_ample)
    assert any(b.code == "QUOTA_ELASTICITY" and "Early Booking Saver" in b.label for b in quote_ample.breakdown)
    assert quote_ample.surge_multiplier < 1.0
    assert quote_ample.final_price == 950.0  # 1000 - 5% = 950


@pytest.mark.asyncio
async def test_local_festival_proximity():
    """Test Eid-ul-Fitr and Durga Puja mass transit and holiday stay demand spikes."""
    # Eid-ul-Fitr 2026 is around March 20. Travel on March 19 (peak window: 1 day before)
    req_eid_bus = SurgeCalculationRequest(
        category=ProductCategoryEnum.BUS,
        product_id="bus-gl-cox",
        base_price=2000.0,
        remaining_quota=15,
        total_quota=30,  # 50% capacity, quota neutral
        travel_date=date(2026, 3, 19),
    )
    quote_eid = SurgePricingService.calculate_surge_quote(req_eid_bus)
    fest_items = [b for b in quote_eid.breakdown if b.code == "FESTIVAL_PROXIMITY"]
    assert len(fest_items) == 1
    assert "Eid-ul-Fitr" in fest_items[0].label
    assert fest_items[0].percentage == 12.0
    assert fest_items[0].amount == 240.0  # 12% of 2000

    # Holiday Resort during Eid Peak (resorts get +14% peak)
    req_eid_hotel = SurgeCalculationRequest(
        category=ProductCategoryEnum.HOTEL,
        product_id="hotel-sayeman-1",
        base_price=10000.0,
        remaining_quota=10,
        total_quota=20,
        travel_date=date(2026, 3, 20),
    )
    quote_hotel = SurgePricingService.calculate_surge_quote(req_eid_hotel)
    hotel_fest = [b for b in quote_hotel.breakdown if b.code == "FESTIVAL_PROXIMITY"]
    assert len(hotel_fest) == 1
    assert "Holiday Rush +14%" in hotel_fest[0].label


@pytest.mark.asyncio
async def test_weather_warning_fair_pricing_and_disaster_freeze():
    """Test that severe weather or river danger signals strictly prevent surging and provide relief."""
    # Launch on river route during River Danger Signal 3
    req_storm = SurgeCalculationRequest(
        category=ProductCategoryEnum.LAUNCH,
        product_id="launch-manami-vip",
        base_price=5000.0,
        remaining_quota=1,  # Critical scarcity
        total_quota=10,
        travel_date=date(2026, 3, 20),  # During Eid peak!
        weather=WeatherConditionInput(
            condition="cyclone_approaching",
            warning_signal=3,
            severity=WeatherSignalSeverity.SEVERE_DANGER,
            description="River danger signal 3 hoisted at Sadarghat river port.",
        ),
    )
    quote_storm = SurgePricingService.calculate_surge_quote(req_storm)
    # Severe weather anti-predatory rule must cap fare to <= 1.00x base fare!
    assert quote_storm.surge_multiplier <= 1.000
    assert quote_storm.is_capped is True
    # Verify emergency weather cap line item exists
    assert any(b.code == "EMERGENCY_WEATHER_CAP" for b in quote_storm.breakdown)


@pytest.mark.asyncio
async def test_fair_price_ceiling_hard_cap_1_25x():
    """
    Test that regardless of compounding demand (critical scarcity + Eid + weekend),
    the hard platform cap strictly clamps multiplier to <= 1.25x.
    """
    # Compounding demand:
    # 1 seat left (scarcity +14%) + Eid peak (+12%) + Thursday weekend departure (+4%)
    # Raw multiplier = 1.0 + 0.14 + 0.12 + 0.04 = 1.30 (30% surge)
    req_compound = SurgeCalculationRequest(
        category=ProductCategoryEnum.BUS,
        product_id="bus-greenline-1",
        base_price=2000.0,
        remaining_quota=1,
        total_quota=30,
        travel_date=date(2026, 3, 19),  # 2026-03-19 is Thursday before Eid
    )
    quote = SurgePricingService.calculate_surge_quote(req_compound)

    # 1. Uncapped multiplier would exceed 1.25
    assert quote.raw_multiplier > 1.250

    # 2. Hard platform cap is enforced strictly at 1.25x
    assert quote.surge_multiplier == 1.250
    assert quote.final_price == 2500.0  # 2000 * 1.25 = 2500.0
    assert quote.is_capped is True
    assert quote.cap_savings_amount > 0.0

    # 3. Transparent breakdown contains ceiling cap explanation
    cap_items = [b for b in quote.breakdown if b.code == "FAIR_PRICE_CEILING_CAP"]
    assert len(cap_items) == 1
    assert "1.25x Platform Cap" in cap_items[0].label
    assert "Consumer Fair Price Protection" in cap_items[0].description


@pytest.mark.asyncio
async def test_price_guarantee_window_and_hmac_verification():
    """Test 15-minute lock window, quote generation, and cryptographic signature validation."""
    fixed_time = datetime(2026, 11, 6, 10, 0, 0, tzinfo=timezone.utc)
    req = SurgeCalculationRequest(
        category=ProductCategoryEnum.LAUNCH,
        product_id="cab-double-ac-101",
        base_price=2500.0,
        remaining_quota=4,
        total_quota=12,
        travel_date=date(2026, 11, 10),
    )
    quote = SurgePricingService.calculate_surge_quote(req, reference_time=fixed_time)

    # 1. Verify 15-minute guarantee window (900 seconds)
    assert quote.guarantee_window_seconds == PRICE_GUARANTEE_WINDOW_SECONDS
    expected_expiry = fixed_time + timedelta(seconds=900)
    assert quote.expires_at == expected_expiry
    assert quote.guarantee_text == "Price guaranteed for 15:00 minutes"
    assert quote.signature is not None

    # 2. Verify signature passes before expiry
    check_time = fixed_time + timedelta(minutes=5)
    verification = SurgePricingService.verify_quote(
        quote_id=quote.quote_id,
        signature=quote.signature,
        product_id=quote.product_id,
        final_price=quote.final_price,
        expires_at=quote.expires_at,
        current_time=check_time,
    )
    assert verification.valid is True
    assert verification.is_expired is False
    assert verification.remaining_seconds == 600  # 10 minutes left

    # 3. Verify signature fails when price is altered (tamper prevention)
    tampered_verification = SurgePricingService.verify_quote(
        quote_id=quote.quote_id,
        signature=quote.signature,
        product_id=quote.product_id,
        final_price=quote.final_price - 500.0,  # tampered
        expires_at=quote.expires_at,
        current_time=check_time,
    )
    assert tampered_verification.valid is False

    # 4. Verify expiration after 15 minutes
    expired_time = fixed_time + timedelta(minutes=16)
    expired_verification = SurgePricingService.verify_quote(
        quote_id=quote.quote_id,
        signature=quote.signature,
        product_id=quote.product_id,
        final_price=quote.final_price,
        expires_at=quote.expires_at,
        current_time=expired_time,
    )
    assert expired_verification.valid is True
    assert expired_verification.is_expired is True
    assert expired_verification.remaining_seconds == 0


@pytest.mark.asyncio
async def test_pricing_api_endpoints(client: AsyncClient):
    """Test FastAPI /api/v1/pricing/surge-quote and /api/v1/pricing/verify-quote HTTP endpoints."""
    payload = {
        "category": "launch",
        "product_id": "launch-manami-102",
        "product_title": "MV Manami Double AC Cabin",
        "base_price": 2500.0,
        "remaining_quota": 3,
        "total_quota": 15,
        "travel_date": "2026-11-20",
        "origin_city": "Dhaka Sadarghat",
        "destination_city": "Barishal Launch Ghat",
        "weather": {
            "condition": "clear",
            "warning_signal": 0,
            "severity": "none"
        }
    }
    resp = await client.post("/api/v1/pricing/surge-quote", json=payload)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    quote = res_data["data"]
    assert quote["category"] == "launch"
    assert quote["base_price"] == 2500.0
    assert quote["surge_multiplier"] <= 1.250
    assert len(quote["breakdown"]) >= 1
    assert "quote_id" in quote
    assert "signature" in quote

    # Test verify endpoint
    verify_resp = await client.post(
        f"/api/v1/pricing/verify-quote?expires_at={quote['expires_at']}",
        json={
            "quote_id": quote["quote_id"],
            "signature": quote["signature"],
            "product_id": quote["product_id"],
            "final_price": quote["final_price"],
        },
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["success"] is True
    assert verify_data["data"]["valid"] is True
    assert verify_data["data"]["is_expired"] is False
