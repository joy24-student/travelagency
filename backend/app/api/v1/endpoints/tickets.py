"""
Offline-Capable E-Tickets & Scanner Verification API Endpoints.
Provides tamper-proof Ed25519 e-tickets, revocation synchronization, and batch idempotent scans.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.booking import Booking
from app.schemas.common import StandardResponse
from app.schemas.ticket import (
    RevocationListResponse,
    ScanBatchRequest,
    ScanBatchResponse,
    TicketResponse,
)
from app.schemas.user import CurrentUser, UserRole
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get(
    "/revocations",
    response_model=StandardResponse[RevocationListResponse],
    summary="Get revoked, used, and expired tickets since timestamp for offline scanners",
)
async def get_revocations_sync(
    since: Optional[str] = Query(
        None,
        description="ISO-8601 timestamp string to retrieve changes occurred after",
    ),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve list of revoked, used, and expired ticket IDs since a timestamp.
    Enables offline scanner devices to keep local invalidation caches up to date.
    """
    is_staff_or_admin = (
        current_user.role in (UserRole.AGENCY, UserRole.HOTEL_STAFF, UserRole.ADMIN)
        or current_user.agency_id is not None
        or current_user.hotel_id is not None
        or "admin" in current_user.roles
        or "agency" in current_user.roles
        or "hotel_staff" in current_user.roles
    )
    if not is_staff_or_admin:
        raise PermissionDeniedError("Staff or Administrator credentials required to sync revocations")

    since_dt: Optional[datetime] = None
    if since:
        try:
            since_cleaned = since.strip().replace(" ", "+")
            if since_cleaned.endswith("Z"):
                since_cleaned = since_cleaned[:-1] + "+00:00"
            since_dt = datetime.fromisoformat(since_cleaned)
        except Exception:
            since_dt = None

    revocations_data = await TicketService.get_revocations(db=db, since=since_dt)
    return StandardResponse[RevocationListResponse](
        success=True,
        message="Revocation list synchronized successfully",
        data=revocations_data,
    )


@router.get(
    "/{booking_id}",
    response_model=StandardResponse[List[TicketResponse]],
    summary="Get signed e-tickets for a confirmed booking",
)
async def get_booking_tickets(
    booking_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve tamper-proof signed e-tickets for a confirmed booking.
    Enforces authorization:
    - Travelers read only their own booking tickets.
    - Agency and hotel staff read tickets for bookings linked to their business.
    - Admins can read all tickets.
    """
    stmt = select(Booking).where(Booking.id == booking_id)
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundError("Booking", booking_id)

    # Check access permission
    is_admin = (
        current_user.role == UserRole.ADMIN
        or "admin" in current_user.roles
    )
    is_owner = booking.user_id == current_user.id
    is_agency = current_user.agency_id is not None and booking.agency_id == current_user.agency_id
    is_hotel = (
        current_user.hotel_id is not None
        and hasattr(booking, "hotel_id")
        and booking.hotel_id == current_user.hotel_id
    )

    if not (is_admin or is_owner or is_agency or is_hotel):
        raise PermissionDeniedError("You do not have permission to view tickets for this booking")

    # If booking is confirmed but tickets were not generated yet, generate them now idempotently
    if booking.status == "confirmed":
        await TicketService.create_tickets_for_booking(db, booking)
        await db.commit()

    tickets = await TicketService.get_tickets_by_booking(db, booking_id)
    return StandardResponse[List[TicketResponse]](
        success=True,
        message="Tickets retrieved successfully",
        data=tickets,
    )


@router.post(
    "/scans",
    response_model=StandardResponse[ScanBatchResponse],
    summary="Batch upload ticket scans with idempotency",
)
async def upload_ticket_scans(
    request: ScanBatchRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a batch of offline ticket scans.
    Idempotent by client scan id: re-uploading an already uploaded scan id will not produce duplicate records.
    Scanners can only scan tickets belonging to their own agency or hotel.
    """
    is_admin = current_user.role == UserRole.ADMIN or "admin" in current_user.roles
    is_agency_or_hotel = (
        current_user.agency_id is not None
        or current_user.hotel_id is not None
        or is_admin
        or current_user.role in (UserRole.AGENCY, UserRole.HOTEL_STAFF)
    )

    if not is_agency_or_hotel:
        raise PermissionDeniedError("Scanner authorization required to upload ticket scans")

    batch_response = await TicketService.process_scans_batch(
        db=db,
        request=request,
        scanned_by=current_user.id,
        is_admin=is_admin,
        agency_id=current_user.agency_id,
        hotel_id=current_user.hotel_id,
    )

    return StandardResponse[ScanBatchResponse](
        success=True,
        message="Ticket scans batch processed successfully",
        data=batch_response,
    )
