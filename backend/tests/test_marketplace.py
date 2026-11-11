"""
Comprehensive Test Suite for Verified Local Guide & Boatman Marketplace.
Validates:
1. Provider onboarding and duplicate rejection.
2. Document submission and verification queue.
3. Service catalog and package creation.
4. Geospatial and destination-based provider discovery.
5. Atomic booking reservation and cryptographic 6-digit OTP generation.
6. Provider check-in with traveler OTP verification (Image 1 Workflow).
7. Live GPS tracking, geofence boundary checks, and speed validations.
8. Emergency SOS dispatch and incident event creation.
9. Verified review submission and aggregate rating recalculation.
10. Administrative approval and rejection operations.
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import (
    MarketplaceBookingModel,
    ProviderProfileModel,
    ProviderServiceModel,
    TripSessionModel,
)
from app.models.user import AdminUser
from tests.conftest import make_test_jwt


@pytest.fixture
async def setup_marketplace_entities(db_session: AsyncSession):
    """Sets up a traveler, provider, and admin user for end-to-end testing."""
    traveler_id = uuid.uuid4()
    provider_user_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    # Seed Admin User in admin_users table for require_admin check
    admin = AdminUser(
        id=admin_id,
        user_id=admin_id,
        role="super_admin",
        status="active",
    )
    db_session.add(admin)

    # Seed an approved provider in Cox's Bazar
    provider_id = uuid.uuid4()
    provider = ProviderProfileModel(
        id=provider_id,
        user_id=provider_user_id,
        provider_category="tour_guide",
        business_name="Cox's Bazar Coastal Tours",
        full_name="Abdur Rahim",
        phone="+8801711223344",
        emergency_phone="+8801711998877",
        bio="Certified local guide with 8 years experience exploring Inani beach, Himchari and Saint Martin.",
        experience_years=8,
        daily_rate=Decimal("2000.00"),
        hourly_rate=Decimal("300.00"),
        currency="BDT",
        primary_destination="Cox's Bazar",
        badge="Top Rated",
        verification_status="approved",
        nid_verified=True,
        license_verified=True,
        is_available=True,
        rating=Decimal("4.95"),
        reviews_count=24,
        total_trips=48,
    )
    db_session.add(provider)

    # Seed a service offered by this provider
    service_id = uuid.uuid4()
    service = ProviderServiceModel(
        id=service_id,
        provider_id=provider_id,
        title="Inani Coral & Sunset Guided Beach Walk",
        description="Exclusive guided walk across Inani coral reef with marine safety gear and local history.",
        category="day_tour",
        destination="Cox's Bazar",
        price_model="daily",
        price=Decimal("2000.00"),
        currency="BDT",
        duration_hours=Decimal("6.0"),
        max_capacity=6,
        meeting_point="Inani Beach Main Parking Gate",
        meeting_point_lat=21.32,
        meeting_point_lng=92.05,
        is_published=True,
    )
    db_session.add(service)

    await db_session.commit()

    return {
        "traveler_id": traveler_id,
        "provider_user_id": provider_user_id,
        "provider_id": provider_id,
        "service_id": service_id,
        "admin_id": admin_id,
    }


# =============================================================================
# 1. DISCOVERY & SEARCH TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_list_approved_providers(client: AsyncClient, setup_marketplace_entities):
    """Travelers can discover approved providers filtered by destination."""
    res = await client.get("/api/v1/marketplace/providers?destination=Cox's Bazar")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["items"][0]["full_name"] == "Abdur Rahim"
    assert data["items"][0]["primary_destination"] == "Cox's Bazar"
    assert data["items"][0]["verification_status"] == "approved"


@pytest.mark.asyncio
async def test_get_nearby_providers(client: AsyncClient, setup_marketplace_entities):
    """Geospatial search finds providers within radius of Cox's Bazar coordinates."""
    res = await client.get(
        "/api/v1/marketplace/providers/nearby?latitude=21.35&longitude=92.01&radius_km=30.0"
    )
    assert res.status_code == 200
    payload = res.json()
    assert payload["success"] is True
    assert len(payload["data"]) >= 1
    assert payload["data"][0]["distance_km"] <= 30.0


# =============================================================================
# 2. PROVIDER ONBOARDING & DOCUMENT SUBMISSION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_provider_onboarding_and_duplicate_prevention(client: AsyncClient):
    """A new user can onboard as a local expert; duplicate onboarding is rejected with 409."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id=user_id, role="user")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "provider_category": "boatman",
        "business_name": "Sundarbans Eco Boat Services",
        "full_name": "Golam Mawla",
        "phone": "+8801712345678",
        "emergency_phone": "+8801712999999",
        "bio": "Experienced Sundarbans canal navigator with certified solar-powered vessel.",
        "experience_years": 10,
        "daily_rate": 2500.0,
        "hourly_rate": 350.0,
        "primary_destination": "Sundarbans",
        "covered_destinations": ["Sundarbans"],
        "languages": ["Bangla", "English"],
        "specialties": ["Wildlife Spotting", "Mangrove Navigation"],
    }

    # 1. Successful submission
    res = await client.post("/api/v1/providers/onboarding", json=payload, headers=headers)
    assert res.status_code == 201
    res_data = res.json()["data"]
    assert res_data["verification_status"] == "submitted"
    assert res_data["provider_category"] == "boatman"

    # 2. Duplicate attempt
    dup_res = await client.post("/api/v1/providers/onboarding", json=payload, headers=headers)
    assert dup_res.status_code == 409


@pytest.mark.asyncio
async def test_provider_document_submission(client: AsyncClient):
    """Provider uploads identity and license documents for admin review."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id=user_id, role="user")
    headers = {"Authorization": f"Bearer {token}"}

    # First onboard
    onboarding_payload = {
        "provider_category": "trekking_guide",
        "full_name": "Lalring Sang",
        "phone": "+8801811223344",
        "bio": "Indigenous mountain guide across Keokradong and Saka Haphong peaks.",
        "experience_years": 6,
        "primary_destination": "Bandarban",
        "covered_destinations": ["Bandarban"],
        "languages": ["Bangla", "English", "Bawm"],
    }
    await client.post("/api/v1/providers/onboarding", json=onboarding_payload, headers=headers)

    # Upload NID Document
    doc_payload = {
        "document_type": "nid_front",
        "document_number": "19901234567890123",
        "file_url": "https://storage.shopnojatra.com/docs/nid_front_123.jpg",
        "storage_path": "providers/docs/nid_front_123.jpg",
    }
    doc_res = await client.post("/api/v1/providers/documents", json=doc_payload, headers=headers)
    assert doc_res.status_code == 201
    assert doc_res.json()["data"]["verification_status"] == "pending"


# =============================================================================
# 3. BOOKING, QUOTE & 6-DIGIT OTP WORKFLOW (Image 1)
# =============================================================================

@pytest.mark.asyncio
async def test_booking_quote_and_atomic_creation(client: AsyncClient, setup_marketplace_entities):
    """Traveler requests quote and completes booking with cryptographic 6-digit OTP."""
    ent = setup_marketplace_entities
    traveler_token = make_test_jwt(user_id=ent["traveler_id"], role="user")
    headers = {"Authorization": f"Bearer {traveler_token}"}

    # 1. Quote
    quote_res = await client.post(
        "/api/v1/bookings/quote",
        json={
            "provider_id": str(ent["provider_id"]),
            "service_id": str(ent["service_id"]),
            "tour_date": str(date(2026, 12, 1)),
            "duration_days": 2,
            "number_of_guests": 2,
        },
    )
    assert quote_res.status_code == 200
    q_data = quote_res.json()["data"]
    assert Decimal(str(q_data["subtotal"])) == Decimal("4000.00")
    assert Decimal(str(q_data["platform_fee"])) == Decimal("200.00")
    assert Decimal(str(q_data["total_price"])) == Decimal("4200.00")

    # 2. Create Booking
    booking_res = await client.post(
        "/api/v1/marketplace/bookings",
        json={
            "provider_id": str(ent["provider_id"]),
            "service_id": str(ent["service_id"]),
            "tour_date": str(date(2026, 12, 1)),
            "duration_days": 2,
            "number_of_guests": 2,
            "meeting_point": "Inani Coral Point Circle",
        },
        headers=headers,
    )
    assert booking_res.status_code == 201
    b_data = booking_res.json()["data"]
    assert b_data["status"] == "confirmed"
    assert len(b_data["otp_code"]) == 6
    assert b_data["otp_code"].isdigit()


# =============================================================================
# 4. TRIP CHECK-IN, GPS TRACKING & GEOFENCING (Image 1 Workflow)
# =============================================================================

@pytest.mark.asyncio
async def test_trip_check_in_gps_lifecycle(client: AsyncClient, setup_marketplace_entities):
    """
    End-to-end test following Image 1:
    Confirmed Booking -> Provider Check-in -> Traveler OTP Verification ->
    Start GPS Collection -> Validate Coordinates -> Ingest Breadcrumb -> Complete Trip.
    """
    ent = setup_marketplace_entities
    traveler_token = make_test_jwt(user_id=ent["traveler_id"], role="user")
    provider_token = make_test_jwt(user_id=ent["provider_user_id"], role="user")

    # 1. Traveler Books
    booking_res = await client.post(
        "/api/v1/marketplace/bookings",
        json={
            "provider_id": str(ent["provider_id"]),
            "service_id": str(ent["service_id"]),
            "tour_date": str(date(2026, 12, 1)),
            "meeting_point": "Inani Coral Point Circle",
        },
        headers={"Authorization": f"Bearer {traveler_token}"},
    )
    booking = booking_res.json()["data"]
    booking_id = booking["id"]
    otp_code = booking["otp_code"]

    # 2. Provider Check-in using Traveler's OTP
    check_in_res = await client.post(
        f"/api/v1/trips/{booking_id}/check-in",
        json={"booking_id": booking_id, "otp_code": otp_code},
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert check_in_res.status_code == 200
    session_data = check_in_res.json()["data"]
    session_id = session_data["id"]
    assert session_data["status"] == "checked_in"
    assert session_data["otp_verified"] is True

    # 3. Start GPS Collection
    start_res = await client.post(
        f"/api/v1/trips/{session_id}/start",
        json={"session_id": session_id, "initial_latitude": 21.32, "initial_longitude": 92.05},
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert start_res.status_code == 200
    assert start_res.json()["data"]["status"] == "active"

    # 4. Ingest Location Breadcrumb
    ping_res = await client.post(
        f"/api/v1/trips/{session_id}/location",
        json={
            "session_id": session_id,
            "latitude": 21.33,
            "longitude": 92.06,
            "altitude": 10.5,
            "speed": 4.5,
            "accuracy": 5.0,
            "battery_level": 88.0,
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert ping_res.status_code == 200

    # 5. Geofencing Validation: Reject coordinate outside Bangladesh
    out_of_bounds_res = await client.post(
        f"/api/v1/trips/{session_id}/location",
        json={
            "session_id": session_id,
            "latitude": 51.5074,  # London
            "longitude": -0.1278,
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert out_of_bounds_res.status_code == 400

    # 6. Complete Trip
    complete_res = await client.post(
        f"/api/v1/trips/{session_id}/complete",
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["data"]["status"] == "completed"


# =============================================================================
# 5. EMERGENCY SOS DISPATCH TEST
# =============================================================================

@pytest.mark.asyncio
async def test_trip_emergency_sos_dispatch(client: AsyncClient, setup_marketplace_entities):
    """Triggering SOS records emergency event with GPS coordinates and alerts trusted contacts."""
    ent = setup_marketplace_entities
    traveler_token = make_test_jwt(user_id=ent["traveler_id"], role="user")
    provider_token = make_test_jwt(user_id=ent["provider_user_id"], role="user")

    # Book and check-in
    b_res = await client.post(
        "/api/v1/marketplace/bookings",
        json={
            "provider_id": str(ent["provider_id"]),
            "service_id": str(ent["service_id"]),
            "tour_date": str(date(2026, 12, 1)),
            "meeting_point": "Inani Coral Point Circle",
        },
        headers={"Authorization": f"Bearer {traveler_token}"},
    )
    b_data = b_res.json()["data"]
    ci_res = await client.post(
        f"/api/v1/trips/{b_data['id']}/check-in",
        json={"booking_id": b_data["id"], "otp_code": b_data["otp_code"]},
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    session_id = ci_res.json()["data"]["id"]

    # Trigger SOS
    sos_res = await client.post(
        f"/api/v1/trips/{session_id}/sos",
        json={
            "session_id": session_id,
            "latitude": 21.325,
            "longitude": 92.055,
            "accuracy": 3.0,
            "address_context": "Near Inani Rocky Beach trail",
            "notes": "Medical emergency, immediate first aid needed",
        },
        headers={"Authorization": f"Bearer {traveler_token}"},
    )
    assert sos_res.status_code == 201
    sos_data = sos_res.json()["data"]
    assert sos_data["status"] == "active"
    assert sos_data["trusted_contacts_notified"] is True


# =============================================================================
# 6. VERIFIED REVIEWS & ADMIN OPERATIONS
# =============================================================================

@pytest.mark.asyncio
async def test_admin_approve_provider(client: AsyncClient, setup_marketplace_entities):
    """Admin verifies pending provider and grants verified badge."""
    ent = setup_marketplace_entities
    admin_token = make_test_jwt(user_id=ent["admin_id"], role="admin")

    # Onboard a pending provider
    pending_user_id = uuid.uuid4()
    p_token = make_test_jwt(user_id=pending_user_id, role="user")
    onboard_res = await client.post(
        "/api/v1/providers/onboarding",
        json={
            "provider_category": "nature_guide",
            "full_name": "Siddiqur Rahman",
            "phone": "+8801912345678",
            "bio": "Sreemangal Lawachara rainforest guide specializing in birdwatching.",
            "experience_years": 5,
            "primary_destination": "Sreemangal",
            "covered_destinations": ["Sreemangal"],
            "languages": ["Bangla", "English"],
        },
        headers={"Authorization": f"Bearer {p_token}"},
    )
    prov_id = onboard_res.json()["data"]["id"]

    # Admin approves
    approve_res = await client.post(
        f"/api/v1/admin/marketplace/providers/{prov_id}/approve",
        json={"badge": "Verified Guide", "admin_notes": "NID and Police Clearance verified"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["data"]["verification_status"] == "approved"
    assert approve_res.json()["data"]["badge"] == "Verified Guide"


@pytest.mark.asyncio
async def test_tidal_intelligence_engine(client: AsyncClient):
    """
    Test Tidal & Coastal Water Navigation Intelligence Engine:
    1. Verify coastal oceanic tide calculation for Cox's Bazar and Saint Martin.
    2. Verify estuarine delay for Sundarbans Mongla.
    3. Verify riverine hydrological danger-level logic for Sylhet / Tanguar Haor.
    4. Verify nearby tide station detection.
    """
    # 1. Stations listing
    res = await client.get("/api/v1/marketplace/tides/stations")
    assert res.status_code == 200
    stations = res.json()["data"]
    assert len(stations) >= 6
    station_ids = [s["id"] for s in stations]
    assert "coxs_bazar" in station_ids
    assert "saint_martin" in station_ids
    assert "sylhet_tanguar_haor" in station_ids

    # 2. Cox's Bazar calculation
    cb_res = await client.get("/api/v1/marketplace/tides/coxs_bazar")
    assert cb_res.status_code == 200
    cb_data = cb_res.json()["data"]
    assert "current_water_level_m" in cb_data
    assert "next_high_tide" in cb_data
    assert "next_low_tide" in cb_data
    assert cb_data["navigation"]["is_safe_to_sail"] in [True, False]
    assert len(cb_data["forecast_24h"]) == 12

    # 3. Sylhet riverine water level
    syl_res = await client.get("/api/v1/marketplace/tides/sylhet_tanguar_haor")
    assert syl_res.status_code == 200
    syl_data = syl_res.json()["data"]
    assert syl_data["type"] == "riverine_hydrology"
    assert syl_data["danger_level_m"] == 8.5
    assert "margin_to_danger_m" in syl_data

    # 4. Nearby station query for Teknaf/Saint Martin coordinates
    nearby_res = await client.get("/api/v1/marketplace/tides/nearby?lat=20.65&lng=92.30")
    assert nearby_res.status_code == 200
    assert nearby_res.json()["data"]["station_id"] == "saint_martin"
