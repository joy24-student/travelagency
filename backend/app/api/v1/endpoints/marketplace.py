"""
Verified Local Guide & Boatman Marketplace Endpoints.
Covers Discovery, Provider Profiles, Document Submissions, Atomic Bookings,
Live GPS Tracking & Geofencing, Emergency SOS, Reviews, and Admin Verification.
"""

import logging
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin
from app.core.exceptions import BadRequestError, NotFoundError, PermissionDeniedError
from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.marketplace import (
    AdminProviderApproveRequest,
    AdminProviderRejectRequest,
    AvailabilitySetRequest,
    BookingCreateRequest,
    BookingQuoteRequest,
    BookingQuoteResponse,
    BookingResponse,
    DocumentResponse,
    DocumentUploadRequest,
    ProviderOnboardingRequest,
    ProviderProfileResponse,
    ProviderProfileUpdate,
    ReviewCreateRequest,
    ReviewResponse,
    ServiceCreateRequest,
    ServiceResponse,
    TripCheckInRequest,
    TripEmergencyEventResponse,
    TripLocationPingRequest,
    TripSOSRequest,
    TripSessionResponse,
    TripStartRequest,
)
from app.schemas.user import CurrentUser
from app.services.marketplace_service import MarketplaceService

router = APIRouter(tags=["Verified Guide & Boatman Marketplace"])
logger = logging.getLogger(__name__)


# ============================================================================
# 1. DISCOVERY & SEARCH
# ============================================================================

@router.get(
    "/marketplace/providers",
    response_model=PaginatedResponse[ProviderProfileResponse],
    status_code=status.HTTP_200_OK,
)
async def list_marketplace_providers(
    destination: Optional[str] = Query(None, description="Destination filter (e.g. Cox's Bazar, Sundarbans)"),
    category: Optional[str] = Query(None, description="Category (tour_guide, boatman, etc.)"),
    search: Optional[str] = Query(None, description="Keyword search in name/bio"),
    min_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Discover approved local guides and boatmen with regional filters."""
    service = MarketplaceService(db)
    items, total = await service.list_providers(
        destination=destination,
        category=category,
        search_query=search,
        min_rating=min_rating,
        page=page,
        page_size=page_size,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse[ProviderProfileResponse](
        items=[ProviderProfileResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get(
    "/marketplace/providers/nearby",
    response_model=StandardResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
)
async def get_nearby_providers(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(25.0, ge=1.0, le=200.0),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Find approved providers within radius_km of current GPS position."""
    service = MarketplaceService(db)
    results = await service.get_nearby_providers(
        latitude=latitude, longitude=longitude, radius_km=radius_km, category=category
    )
    return StandardResponse(data=results, message=f"Found {len(results)} providers nearby")


@router.get(
    "/marketplace/providers/{provider_id}",
    response_model=StandardResponse[ProviderProfileResponse],
    status_code=status.HTTP_200_OK,
)
async def get_provider_profile(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get full public profile of a provider."""
    service = MarketplaceService(db)
    data = await service.get_provider_profile(provider_id)
    return StandardResponse(data=ProviderProfileResponse.model_validate(data))


# ============================================================================
# 2. PROVIDER ONBOARDING & MANAGEMENT
# ============================================================================

@router.post(
    "/providers/onboarding",
    response_model=StandardResponse[ProviderProfileResponse],
    status_code=status.HTTP_201_CREATED,
)
async def provider_onboarding(
    request: ProviderOnboardingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit application to become a verified local guide or boatman."""
    service = MarketplaceService(db)
    result = await service.create_provider_onboarding(current_user.id, request)
    return StandardResponse(
        data=ProviderProfileResponse.model_validate(result),
        message="Provider application submitted successfully for administrative review",
    )


@router.patch(
    "/providers/profile",
    response_model=StandardResponse[ProviderProfileResponse],
    status_code=status.HTTP_200_OK,
)
async def update_my_provider_profile(
    request: ProviderProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update authenticated provider's profile."""
    service = MarketplaceService(db)
    my_profile = await service.get_provider_by_user_id(current_user.id)
    if not my_profile:
        raise NotFoundError("ProviderProfile", current_user.id)

    updated = await service.update_provider_profile(
        uuid.UUID(str(my_profile["id"])), current_user.id, request
    )
    return StandardResponse(
        data=ProviderProfileResponse.model_validate(updated),
        message="Profile updated successfully",
    )


@router.post(
    "/providers/documents",
    response_model=StandardResponse[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_provider_document(
    request: DocumentUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload verification document (NID, Tourist Police license, Boat Fitness)."""
    service = MarketplaceService(db)
    my_profile = await service.get_provider_by_user_id(current_user.id)
    if not my_profile:
        raise NotFoundError("ProviderProfile", current_user.id)

    doc = await service.upload_document(
        uuid.UUID(str(my_profile["id"])), current_user.id, request
    )
    return StandardResponse(
        data=DocumentResponse.model_validate(doc),
        message="Document uploaded and queued for administrative review",
    )


@router.post(
    "/providers/services",
    response_model=StandardResponse[ServiceResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_provider_service(
    request: ServiceCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish a new service package or day tour."""
    service = MarketplaceService(db)
    my_profile = await service.get_provider_by_user_id(current_user.id)
    if not my_profile:
        raise NotFoundError("ProviderProfile", current_user.id)

    created = await service.create_service(
        uuid.UUID(str(my_profile["id"])), current_user.id, request
    )
    return StandardResponse(
        data=ServiceResponse.model_validate(created),
        message="Service package created successfully",
    )


# ============================================================================
# 3. BOOKINGS & QUOTES
# ============================================================================

@router.post(
    "/marketplace/bookings/quote",
    response_model=StandardResponse[BookingQuoteResponse],
    status_code=status.HTTP_200_OK,
)
@router.post(
    "/bookings/quote",
    response_model=StandardResponse[BookingQuoteResponse],
    status_code=status.HTTP_200_OK,
)
async def get_booking_quote(
    request: BookingQuoteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Calculate quotation with subtotal, platform fee, and terms."""
    service = MarketplaceService(db)
    quote = await service.get_booking_quote(request)
    return StandardResponse(data=quote)


@router.post(
    "/marketplace/bookings",
    response_model=StandardResponse[BookingResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_marketplace_booking(
    request: BookingCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reserve slot atomically and generate booking with 6-digit Trip OTP."""
    service = MarketplaceService(db)
    booking = await service.create_booking(current_user.id, request)
    return StandardResponse(
        data=BookingResponse.model_validate(booking),
        message="Booking confirmed! Trip check-in OTP generated.",
    )


# ============================================================================
# 4. TRIPS, LIVE GPS & EMERGENCY SOS
# ============================================================================

@router.post(
    "/trips/{booking_id}/check-in",
    response_model=StandardResponse[TripSessionResponse],
    status_code=status.HTTP_200_OK,
)
async def provider_trip_check_in(
    booking_id: uuid.UUID,
    request: TripCheckInRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Provider verifies traveler with 6-digit OTP to authorize trip start."""
    service = MarketplaceService(db)
    session = await service.check_in_trip_with_otp(
        booking_id=booking_id,
        provider_user_id=current_user.id,
        otp_code=request.otp_code,
    )
    return StandardResponse(
        data=TripSessionResponse.model_validate(session),
        message="Traveler OTP verified! Trip checked-in successfully.",
    )


@router.post(
    "/trips/{session_id}/start",
    response_model=StandardResponse[TripSessionResponse],
    status_code=status.HTTP_200_OK,
)
async def start_trip_tracking(
    session_id: uuid.UUID,
    request: TripStartRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate live GPS tracking session."""
    service = MarketplaceService(db)
    session = await service.start_trip_session(
        session_id=session_id,
        provider_user_id=current_user.id,
        lat=request.initial_latitude,
        lng=request.initial_longitude,
    )
    return StandardResponse(
        data=TripSessionResponse.model_validate(session),
        message="Live GPS tracking started.",
    )


@router.post(
    "/trips/{session_id}/location",
    response_model=StandardResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
)
async def ingest_location_ping(
    session_id: uuid.UUID,
    request: TripLocationPingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ingest GPS location breadcrumb with geofence validation."""
    service = MarketplaceService(db)
    res = await service.ingest_location_ping(
        session_id=session_id,
        user_id=current_user.id,
        request=request,
    )
    return StandardResponse(data=res, message="Location updated")


@router.post(
    "/trips/{session_id}/complete",
    response_model=StandardResponse[TripSessionResponse],
    status_code=status.HTTP_200_OK,
)
async def complete_trip(
    session_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Finalize trip session and terminate GPS collection."""
    service = MarketplaceService(db)
    session = await service.complete_trip(session_id, current_user.id)
    return StandardResponse(
        data=TripSessionResponse.model_validate(session),
        message="Trip finalized and marked completed.",
    )


@router.post(
    "/trips/{session_id}/sos",
    response_model=StandardResponse[TripEmergencyEventResponse],
    status_code=status.HTTP_201_CREATED,
)
async def trigger_trip_emergency_sos(
    session_id: uuid.UUID,
    request: TripSOSRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger verified SOS emergency event with coordinates."""
    service = MarketplaceService(db)
    event = await service.trigger_trip_sos(
        session_id=session_id,
        user_id=current_user.id,
        request=request,
    )
    return StandardResponse(
        data=TripEmergencyEventResponse.model_validate(event),
        message="CRITICAL: Emergency SOS dispatched to platform ops and trusted contacts",
    )


# ============================================================================
# 5. REVIEWS & RATINGS
# ============================================================================

@router.post(
    "/reviews",
    response_model=StandardResponse[ReviewResponse],
    status_code=status.HTTP_201_CREATED,
)
async def submit_verified_review(
    request: ReviewCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit post-trip review for completed booking."""
    service = MarketplaceService(db)
    review = await service.submit_review(current_user.id, request)
    return StandardResponse(
        data=ReviewResponse.model_validate(review),
        message="Thank you! Verified review submitted.",
    )


# ============================================================================
# 6. ADMIN OPERATIONS
# ============================================================================

@router.get(
    "/admin/marketplace/providers/pending",
    response_model=StandardResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
)
async def list_pending_providers(
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all provider applications pending admin document verification."""
    service = MarketplaceService(db)
    pending = await service.list_pending_providers()
    return StandardResponse(data=pending)


@router.post(
    "/admin/marketplace/providers/{provider_id}/approve",
    response_model=StandardResponse[ProviderProfileResponse],
    status_code=status.HTTP_200_OK,
)
async def admin_approve_provider(
    provider_id: uuid.UUID,
    request: AdminProviderApproveRequest,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve provider verification and grant verified badge."""
    service = MarketplaceService(db)
    approved = await service.admin_approve_provider(
        current_user.id, provider_id, request
    )
    return StandardResponse(
        data=ProviderProfileResponse.model_validate(approved),
        message="Provider approved and activated for discovery.",
    )


@router.post(
    "/admin/marketplace/providers/{provider_id}/reject",
    response_model=StandardResponse[ProviderProfileResponse],
    status_code=status.HTTP_200_OK,
)
async def admin_reject_provider(
    provider_id: uuid.UUID,
    request: AdminProviderRejectRequest,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reject provider verification with documented reason."""
    service = MarketplaceService(db)
    rejected = await service.admin_reject_provider(
        current_user.id, provider_id, request
    )
    return StandardResponse(
        data=ProviderProfileResponse.model_validate(rejected),
        message="Provider application rejected.",
    )


# ============================================================================
# Tidal & Coastal Water Navigation Intelligence Engine (Cox's Bazar / Sylhet / Sundarbans)
# ============================================================================

from app.services.tide_service import tide_engine, TIDAL_STATIONS


@router.get(
    "/marketplace/tides/stations",
    response_model=StandardResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
)
async def list_tidal_stations() -> StandardResponse[List[Dict[str, Any]]]:
    """List all geodetic observation stations in Bangladesh."""
    stations = list(TIDAL_STATIONS.values())
    return StandardResponse(
        data=stations,
        message="Observation stations retrieved successfully.",
    )


@router.get(
    "/marketplace/tides/nearby",
    response_model=StandardResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
)
async def get_nearby_tides(
    lat: float = Query(..., ge=20.0, le=27.0),
    lng: float = Query(..., ge=88.0, le=93.0),
) -> StandardResponse[Dict[str, Any]]:
    """Compute exact tidal or riverine water level for coordinates."""
    nearest = tide_engine.find_nearest_station(lat, lng)
    tide_data = tide_engine.calculate_tide(nearest["id"])
    return StandardResponse(
        data=tide_data,
        message="Local tidal intelligence calculated successfully.",
    )


@router.get(
    "/marketplace/tides/{station_id}",
    response_model=StandardResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
)
async def get_station_tides(
    station_id: str,
) -> StandardResponse[Dict[str, Any]]:
    """Get high-precision tidal and safe-sailing forecast for a specific station."""
    tide_data = tide_engine.calculate_tide(station_id)
    return StandardResponse(
        data=tide_data,
        message="Tidal calculations retrieved successfully.",
    )
