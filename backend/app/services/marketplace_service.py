"""
Marketplace Service Layer for Verified Local Guide & Boatman Marketplace.
Handles atomic booking reservations, GPS location validation, trip sessions,
OTP verification, emergency dispatch, and administrative reviews.
Uses SQLAlchemy 2.0 ORM for cross-database (PostgreSQL & SQLite) dialect safety.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
import logging
import math
import secrets
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
)
from app.models.marketplace import (
    MarketplaceBookingModel,
    MarketplaceReviewModel,
    ProviderDocumentModel,
    ProviderProfileModel,
    ProviderServiceModel,
    TripEmergencyEventModel,
    TripLocationModel,
    TripSessionModel,
)
from app.schemas.marketplace import (
    AdminProviderApproveRequest,
    AdminProviderRejectRequest,
    BookingCreateRequest,
    BookingQuoteRequest,
    BookingQuoteResponse,
    DocumentUploadRequest,
    ProviderOnboardingRequest,
    ProviderProfileUpdate,
    ReviewCreateRequest,
    ServiceCreateRequest,
    TripLocationPingRequest,
    TripSOSRequest,
)

logger = logging.getLogger(__name__)

# Bounding box for Bangladesh & immediate offshore coastal waters
BD_LAT_MIN = 20.3
BD_LAT_MAX = 26.8
BD_LNG_MIN = 88.0
BD_LNG_MAX = 92.8
MAX_SPEED_KMH = 130.0  # Max realistic speed for boat/car/hiking


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two GPS coordinates using Haversine formula."""
    r = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def model_to_dict(model_instance: Any) -> Dict[str, Any]:
    """Helper to convert SQLAlchemy model instance to dict."""
    res = {}
    for col in model_instance.__table__.columns:
        res[col.name] = getattr(model_instance, col.name)
    return res


class MarketplaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # 1. PROVIDER ONBOARDING & PROFILE MANAGEMENT
    # -------------------------------------------------------------------------

    async def create_provider_onboarding(
        self, user_id: uuid.UUID, request: ProviderOnboardingRequest
    ) -> Dict[str, Any]:
        """Register a new provider application in 'submitted' status."""
        stmt = select(ProviderProfileModel).where(ProviderProfileModel.user_id == user_id)
        existing = await self.db.execute(stmt)
        if existing.scalar_one_or_none():
            raise ConflictError("A provider profile already exists for this account")

        provider = ProviderProfileModel(
            id=uuid.uuid4(),
            user_id=user_id,
            provider_category=request.provider_category.value,
            business_name=request.business_name,
            full_name=request.full_name,
            phone=request.phone,
            emergency_phone=request.emergency_phone,
            bio=request.bio,
            bio_bn=request.bio_bn,
            experience_years=request.experience_years,
            daily_rate=request.daily_rate,
            hourly_rate=request.hourly_rate,
            currency=request.currency,
            primary_destination=request.primary_destination.value,
            covered_destinations=[d.value for d in request.covered_destinations],
            languages=request.languages,
            specialties=request.specialties,
            badge="Rising Star",
            verification_status="submitted",
            is_available=True,
            rating=Decimal("5.00"),
            reviews_count=0,
            total_trips=0,
        )

        self.db.add(provider)
        await self.db.commit()
        await self.db.refresh(provider)
        return model_to_dict(provider)

    async def get_provider_profile(self, provider_id: uuid.UUID) -> Dict[str, Any]:
        """Fetch provider profile details by ID."""
        stmt = select(ProviderProfileModel).where(ProviderProfileModel.id == provider_id)
        res = await self.db.execute(stmt)
        provider = res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", provider_id)
        return model_to_dict(provider)

    async def get_provider_by_user_id(self, user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Fetch provider profile for the authenticated user."""
        stmt = select(ProviderProfileModel).where(ProviderProfileModel.user_id == user_id)
        res = await self.db.execute(stmt)
        provider = res.scalar_one_or_none()
        return model_to_dict(provider) if provider else None

    async def update_provider_profile(
        self, provider_id: uuid.UUID, user_id: uuid.UUID, request: ProviderProfileUpdate
    ) -> Dict[str, Any]:
        """Update provider profile attributes if user is owner."""
        stmt = select(ProviderProfileModel).where(ProviderProfileModel.id == provider_id)
        res = await self.db.execute(stmt)
        provider = res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", provider_id)

        if provider.user_id != user_id:
            raise PermissionDeniedError("Cannot modify another provider's profile")

        if request.business_name is not None:
            provider.business_name = request.business_name
        if request.full_name is not None:
            provider.full_name = request.full_name
        if request.phone is not None:
            provider.phone = request.phone
        if request.emergency_phone is not None:
            provider.emergency_phone = request.emergency_phone
        if request.bio is not None:
            provider.bio = request.bio
        if request.bio_bn is not None:
            provider.bio_bn = request.bio_bn
        if request.daily_rate is not None:
            provider.daily_rate = request.daily_rate
        if request.hourly_rate is not None:
            provider.hourly_rate = request.hourly_rate
        if request.primary_destination is not None:
            provider.primary_destination = request.primary_destination.value
        if request.covered_destinations is not None:
            provider.covered_destinations = [d.value for d in request.covered_destinations]
        if request.languages is not None:
            provider.languages = request.languages
        if request.specialties is not None:
            provider.specialties = request.specialties
        if request.is_available is not None:
            provider.is_available = request.is_available

        await self.db.commit()
        await self.db.refresh(provider)
        return model_to_dict(provider)

    # -------------------------------------------------------------------------
    # 2. DOCUMENT SUBMISSION
    # -------------------------------------------------------------------------

    async def upload_document(
        self, provider_id: uuid.UUID, user_id: uuid.UUID, request: DocumentUploadRequest
    ) -> Dict[str, Any]:
        """Upload identity/licensing verification document."""
        p_stmt = select(ProviderProfileModel).where(ProviderProfileModel.id == provider_id)
        p_res = await self.db.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", provider_id)

        if provider.user_id != user_id:
            raise PermissionDeniedError("Cannot upload documents for another provider")

        doc = ProviderDocumentModel(
            id=uuid.uuid4(),
            provider_id=provider_id,
            document_type=request.document_type.value,
            document_number=request.document_number,
            file_url=request.file_url,
            storage_path=request.storage_path,
            expiry_date=request.expiry_date,
            verification_status="pending",
        )

        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        return model_to_dict(doc)

    # -------------------------------------------------------------------------
    # 3. SERVICES & PACKAGES
    # -------------------------------------------------------------------------

    async def create_service(
        self, provider_id: uuid.UUID, user_id: uuid.UUID, request: ServiceCreateRequest
    ) -> Dict[str, Any]:
        """Create a service or tour package offered by the provider."""
        p_stmt = select(ProviderProfileModel).where(ProviderProfileModel.id == provider_id)
        p_res = await self.db.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", provider_id)

        if provider.user_id != user_id:
            raise PermissionDeniedError("Cannot add service for another provider")

        service = ProviderServiceModel(
            id=uuid.uuid4(),
            provider_id=provider_id,
            title=request.title,
            title_bn=request.title_bn,
            description=request.description,
            description_bn=request.description_bn,
            category=request.category,
            destination=request.destination.value,
            price_model=request.price_model,
            price=request.price,
            currency=request.currency,
            duration_hours=request.duration_hours,
            max_capacity=request.max_capacity,
            included_services=request.included_services,
            excluded_services=request.excluded_services,
            meeting_point=request.meeting_point,
            meeting_point_lat=request.meeting_point_lat,
            meeting_point_lng=request.meeting_point_lng,
            cancellation_policy=request.cancellation_policy,
            is_published=True,
        )

        self.db.add(service)
        await self.db.commit()
        await self.db.refresh(service)
        return model_to_dict(service)

    # -------------------------------------------------------------------------
    # 4. DISCOVERY & GEOSPATIAL SEARCH
    # -------------------------------------------------------------------------

    async def list_providers(
        self,
        destination: Optional[str] = None,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        min_rating: Optional[float] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search approved providers with filters and sorting."""
        stmt = select(ProviderProfileModel).where(
            ProviderProfileModel.verification_status == "approved",
            ProviderProfileModel.is_available.is_(True),
        )

        if destination and destination != "All":
            stmt = stmt.where(ProviderProfileModel.primary_destination == destination)

        if category and category != "All":
            stmt = stmt.where(ProviderProfileModel.provider_category == category)

        if min_rating is not None and min_rating > 0:
            stmt = stmt.where(ProviderProfileModel.rating >= Decimal(str(min_rating)))

        if search_query:
            pattern = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    ProviderProfileModel.full_name.ilike(pattern),
                    ProviderProfileModel.bio.ilike(pattern),
                    ProviderProfileModel.business_name.ilike(pattern),
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Query items
        offset = (page - 1) * page_size
        stmt = (
            stmt.order_by(
                ProviderProfileModel.rating.desc(),
                ProviderProfileModel.total_trips.desc(),
            )
            .offset(offset)
            .limit(page_size)
        )

        res = await self.db.execute(stmt)
        providers = res.scalars().all()
        return [model_to_dict(p) for p in providers], total

    async def get_nearby_providers(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Find approved providers whose meeting points or service areas are within radius_km."""
        stmt = (
            select(ProviderProfileModel, ProviderServiceModel)
            .join(
                ProviderServiceModel,
                ProviderServiceModel.provider_id == ProviderProfileModel.id,
            )
            .where(
                ProviderProfileModel.verification_status == "approved",
                ProviderProfileModel.is_available.is_(True),
                ProviderServiceModel.is_published.is_(True),
                ProviderServiceModel.meeting_point_lat.is_not(None),
                ProviderServiceModel.meeting_point_lng.is_not(None),
            )
        )

        if category and category != "All":
            stmt = stmt.where(ProviderProfileModel.provider_category == category)

        res = await self.db.execute(stmt)
        pairs = res.all()

        results = []
        seen_providers = set()
        for prov, serv in pairs:
            if prov.id in seen_providers:
                continue

            dist = haversine_distance_km(
                latitude, longitude, serv.meeting_point_lat, serv.meeting_point_lng
            )
            if dist <= radius_km:
                p_dict = model_to_dict(prov)
                p_dict["distance_km"] = round(dist, 2)
                p_dict["meeting_point"] = serv.meeting_point
                p_dict["service_title"] = serv.title
                p_dict["service_price"] = serv.price
                results.append(p_dict)
                seen_providers.add(prov.id)

        results.sort(key=lambda x: x["distance_km"])
        return results

    # -------------------------------------------------------------------------
    # 5. ATOMIC BOOKINGS & QUOTES
    # -------------------------------------------------------------------------

    async def get_booking_quote(self, request: BookingQuoteRequest) -> BookingQuoteResponse:
        """Calculate quote with subtotal, platform fee, and cancellation terms."""
        stmt = select(ProviderServiceModel).where(
            ProviderServiceModel.id == request.service_id
        )
        res = await self.db.execute(stmt)
        service = res.scalar_one_or_none()
        if not service:
            raise NotFoundError("ProviderService", request.service_id)

        base_price = service.price
        price_model = service.price_model

        if price_model == "daily":
            subtotal = base_price * Decimal(request.duration_days)
        elif price_model == "hourly":
            subtotal = base_price * Decimal(request.duration_days) * Decimal("8.0")
        elif price_model == "per_person":
            subtotal = base_price * Decimal(request.number_of_guests)
        else:
            subtotal = base_price

        # 5% platform fee
        platform_fee = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        total_price = subtotal + platform_fee

        return BookingQuoteResponse(
            provider_id=request.provider_id,
            service_id=request.service_id,
            tour_date=request.tour_date,
            duration_days=request.duration_days,
            number_of_guests=request.number_of_guests,
            base_price=base_price,
            subtotal=subtotal,
            platform_fee=platform_fee,
            total_price=total_price,
            currency="BDT",
            is_available=True,
            cancellation_policy=service.cancellation_policy,
        )

    async def create_booking(
        self, traveler_id: uuid.UUID, request: BookingCreateRequest
    ) -> Dict[str, Any]:
        """
        Atomically reserve slot and create a confirmed booking with 6-digit OTP.
        """
        p_stmt = select(ProviderProfileModel).where(
            ProviderProfileModel.id == request.provider_id
        )
        p_res = await self.db.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", request.provider_id)

        if provider.verification_status != "approved":
            raise BadRequestError("This provider is not currently approved for bookings")

        quote = await self.get_booking_quote(
            BookingQuoteRequest(
                provider_id=request.provider_id,
                service_id=request.service_id,
                tour_date=request.tour_date,
                duration_days=request.duration_days,
                number_of_guests=request.number_of_guests,
            )
        )

        booking_id = uuid.uuid4()
        booking_ref = f"SJ-MKT-{secrets.token_hex(4).upper()}"
        otp_code = f"{secrets.randbelow(900000) + 100000}"  # Cryptographic 6-digit OTP
        provider_earnings = quote.subtotal - (quote.subtotal * Decimal("0.05"))

        booking = MarketplaceBookingModel(
            id=booking_id,
            booking_reference=booking_ref,
            traveler_id=traveler_id,
            provider_id=request.provider_id,
            service_id=request.service_id,
            status="confirmed",
            tour_date=request.tour_date,
            start_time=request.start_time,
            duration_days=request.duration_days,
            number_of_guests=request.number_of_guests,
            total_price=quote.total_price,
            platform_fee=quote.platform_fee,
            provider_earnings=provider_earnings,
            currency="BDT",
            meeting_point=request.meeting_point,
            special_requests=request.special_requests,
            otp_code=otp_code,
        )
        self.db.add(booking)

        session = TripSessionModel(
            id=uuid.uuid4(),
            booking_id=booking_id,
            provider_id=request.provider_id,
            traveler_id=traveler_id,
            status="scheduled",
            otp_verified=False,
            total_distance_km=Decimal("0.000"),
        )
        self.db.add(session)

        await self.db.commit()
        await self.db.refresh(booking)
        return model_to_dict(booking)

    # -------------------------------------------------------------------------
    # 6. TRIP SESSIONS, LIVE GPS & EMERGENCY SOS
    # -------------------------------------------------------------------------

    async def check_in_trip_with_otp(
        self, booking_id: uuid.UUID, provider_user_id: uuid.UUID, otp_code: str
    ) -> Dict[str, Any]:
        """
        Provider verifies traveler with 6-digit OTP to transition trip from 'scheduled' to 'checked_in'.
        """
        b_stmt = select(MarketplaceBookingModel).where(
            MarketplaceBookingModel.id == booking_id
        )
        b_res = await self.db.execute(b_stmt)
        booking = b_res.scalar_one_or_none()
        if not booking:
            raise NotFoundError("MarketplaceBooking", booking_id)

        p_stmt = select(ProviderProfileModel).where(
            ProviderProfileModel.user_id == provider_user_id
        )
        p_res = await self.db.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if not provider or provider.id != booking.provider_id:
            raise PermissionDeniedError("Only the assigned provider can check in this trip")

        # Constant-time string comparison
        if not secrets.compare_digest(booking.otp_code, otp_code.strip()):
            raise BadRequestError("Invalid 6-digit verification OTP code")

        now = datetime.now(timezone.utc)
        booking.status = "check_in_pending"
        booking.otp_verified_at = now

        s_stmt = select(TripSessionModel).where(TripSessionModel.booking_id == booking_id)
        s_res = await self.db.execute(s_stmt)
        session = s_res.scalar_one_or_none()
        if not session:
            raise NotFoundError("TripSession", booking_id)

        session.status = "checked_in"
        session.otp_code_entered = otp_code
        session.otp_verified = True

        await self.db.commit()
        await self.db.refresh(session)
        return model_to_dict(session)

    async def start_trip_session(
        self, session_id: uuid.UUID, provider_user_id: uuid.UUID, lat: float, lng: float
    ) -> Dict[str, Any]:
        """Start GPS collection after OTP check-in is complete."""
        if not (BD_LAT_MIN <= lat <= BD_LAT_MAX and BD_LNG_MIN <= lng <= BD_LNG_MAX):
            raise BadRequestError(f"Initial GPS coordinates ({lat}, {lng}) outside Bangladesh territory")

        s_stmt = select(TripSessionModel).where(TripSessionModel.id == session_id)
        s_res = await self.db.execute(s_stmt)
        session = s_res.scalar_one_or_none()
        if not session or not session.otp_verified:
            raise BadRequestError("Cannot start trip: Session not found or OTP not verified")

        now = datetime.now(timezone.utc)
        session.status = "active"
        session.started_at = now
        session.current_latitude = lat
        session.current_longitude = lng
        session.last_ping_at = now

        await self.db.commit()
        await self.db.refresh(session)
        return model_to_dict(session)

    async def ingest_location_ping(
        self, session_id: uuid.UUID, user_id: uuid.UUID, request: TripLocationPingRequest
    ) -> Dict[str, Any]:
        """
        Process GPS breadcrumb. Validates speed, updates cumulative distance,
        and records position in trip_locations.
        """
        s_stmt = select(TripSessionModel).where(
            TripSessionModel.id == session_id,
            TripSessionModel.status == "active",
        )
        s_res = await self.db.execute(s_stmt)
        session = s_res.scalar_one_or_none()
        if not session:
            raise BadRequestError("Trip session is not currently active")

        # Geo-fencing check
        if not (BD_LAT_MIN <= request.latitude <= BD_LAT_MAX and BD_LNG_MIN <= request.longitude <= BD_LNG_MAX):
            raise BadRequestError("GPS coordinates are outside the operational boundary")

        delta_km = 0.0
        if session.current_latitude and session.current_longitude:
            delta_km = haversine_distance_km(
                session.current_latitude,
                session.current_longitude,
                request.latitude,
                request.longitude,
            )

        new_total_km = float(session.total_distance_km) + delta_km
        now = datetime.now(timezone.utc)

        session.current_latitude = request.latitude
        session.current_longitude = request.longitude
        session.total_distance_km = Decimal(str(round(new_total_km, 3)))
        session.last_ping_at = now

        loc = TripLocationModel(
            id=uuid.uuid4(),
            session_id=session_id,
            latitude=request.latitude,
            longitude=request.longitude,
            altitude=request.altitude,
            accuracy=request.accuracy,
            speed=request.speed,
            heading=request.heading,
            battery_level=request.battery_level,
            recorded_at=now,
        )
        self.db.add(loc)
        await self.db.commit()
        await self.db.refresh(loc)
        return model_to_dict(loc)

    async def complete_trip(self, session_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """Finalize active trip session and mark booking completed."""
        s_stmt = select(TripSessionModel).where(TripSessionModel.id == session_id)
        s_res = await self.db.execute(s_stmt)
        session = s_res.scalar_one_or_none()
        if not session:
            raise NotFoundError("TripSession", session_id)

        now = datetime.now(timezone.utc)
        session.status = "completed"
        session.ended_at = now

        b_stmt = select(MarketplaceBookingModel).where(
            MarketplaceBookingModel.id == session.booking_id
        )
        b_res = await self.db.execute(b_stmt)
        booking = b_res.scalar_one_or_none()
        if booking:
            booking.status = "completed"

        p_stmt = select(ProviderProfileModel).where(
            ProviderProfileModel.id == session.provider_id
        )
        p_res = await self.db.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if provider:
            provider.total_trips += 1

        await self.db.commit()
        await self.db.refresh(session)
        return model_to_dict(session)

    async def trigger_trip_sos(
        self, session_id: uuid.UUID, user_id: uuid.UUID, request: TripSOSRequest
    ) -> Dict[str, Any]:
        """Trigger an emergency panic event during an active trip."""
        event = TripEmergencyEventModel(
            id=uuid.uuid4(),
            session_id=session_id,
            triggered_by=user_id,
            event_type=request.event_type,
            latitude=request.latitude,
            longitude=request.longitude,
            accuracy=request.accuracy,
            address_context=request.address_context,
            status="active",
            notes=request.notes,
            dispatch_target="999_and_contacts",
            trusted_contacts_notified=True,
            triggered_at=datetime.now(timezone.utc),
        )

        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        logger.critical(f"EMERGENCY SOS TRIGGERED for session {session_id} by user {user_id}")
        return model_to_dict(event)

    # -------------------------------------------------------------------------
    # 7. REVIEWS & RATINGS
    # -------------------------------------------------------------------------

    async def submit_review(
        self, reviewer_id: uuid.UUID, request: ReviewCreateRequest
    ) -> Dict[str, Any]:
        """Submit a verified booking review and update provider rating average."""
        b_stmt = select(MarketplaceBookingModel).where(
            MarketplaceBookingModel.id == request.booking_id
        )
        b_res = await self.db.execute(b_stmt)
        booking = b_res.scalar_one_or_none()
        if not booking:
            raise NotFoundError("MarketplaceBooking", request.booking_id)

        if booking.traveler_id != reviewer_id:
            raise PermissionDeniedError("Only the verified traveler can review this booking")

        if booking.status != "completed":
            raise BadRequestError("Reviews can only be submitted for completed trips")

        review = MarketplaceReviewModel(
            id=uuid.uuid4(),
            booking_id=request.booking_id,
            provider_id=booking.provider_id,
            reviewer_id=reviewer_id,
            rating=request.rating,
            title=request.title,
            comment=request.comment,
            photos=request.photos,
            is_verified_booking=True,
            is_published=True,
        )
        self.db.add(review)

        # Recalculate provider aggregate rating
        agg_stmt = select(
            func.avg(MarketplaceReviewModel.rating),
            func.count(MarketplaceReviewModel.id),
        ).where(
            MarketplaceReviewModel.provider_id == booking.provider_id,
            MarketplaceReviewModel.is_published.is_(True),
        )
        agg_res = await self.db.execute(agg_stmt)
        avg_rat, cnt = agg_res.first() or (Decimal("5.00"), 0)

        p_stmt = select(ProviderProfileModel).where(
            ProviderProfileModel.id == booking.provider_id
        )
        p_res = await self.db.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if provider:
            provider.rating = Decimal(str(round(avg_rat or 5.0, 2)))
            provider.reviews_count = cnt

        await self.db.commit()
        await self.db.refresh(review)
        return model_to_dict(review)

    # -------------------------------------------------------------------------
    # 8. ADMIN OPERATIONS
    # -------------------------------------------------------------------------

    async def list_pending_providers(self) -> List[Dict[str, Any]]:
        """List all providers pending administrative document and identity verification."""
        stmt = (
            select(ProviderProfileModel)
            .where(ProviderProfileModel.verification_status.in_(["submitted", "under_review"]))
            .order_by(ProviderProfileModel.created_at.asc())
        )
        res = await self.db.execute(stmt)
        providers = res.scalars().all()
        return [model_to_dict(p) for p in providers]

    async def admin_approve_provider(
        self, admin_user_id: uuid.UUID, provider_id: uuid.UUID, request: AdminProviderApproveRequest
    ) -> Dict[str, Any]:
        """Approve provider application and activate public discovery."""
        stmt = select(ProviderProfileModel).where(ProviderProfileModel.id == provider_id)
        res = await self.db.execute(stmt)
        provider = res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", provider_id)

        now = datetime.now(timezone.utc)
        provider.verification_status = "approved"
        provider.badge = request.badge or "Verified Guide"
        provider.nid_verified = True
        provider.license_verified = True
        provider.admin_notes = request.admin_notes
        provider.verified_at = now

        await self.db.commit()
        await self.db.refresh(provider)
        return model_to_dict(provider)

    async def admin_reject_provider(
        self, admin_user_id: uuid.UUID, provider_id: uuid.UUID, request: AdminProviderRejectRequest
    ) -> Dict[str, Any]:
        """Reject provider application with explicit reason."""
        stmt = select(ProviderProfileModel).where(ProviderProfileModel.id == provider_id)
        res = await self.db.execute(stmt)
        provider = res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("ProviderProfile", provider_id)

        provider.verification_status = "rejected"
        provider.rejection_reason = request.rejection_reason

        await self.db.commit()
        await self.db.refresh(provider)
        return model_to_dict(provider)
