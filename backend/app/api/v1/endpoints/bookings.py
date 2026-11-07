"""
Booking API Endpoints and State Machine Lifecycle.
Guarantees double-booking prevention using row-level locking (SELECT ... FOR UPDATE).
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.repositories.booking_repository import BookingRepository
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    BookingStatus,
    BookingStatusUpdateRequest,
)
from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.user import CurrentUser, UserRole
from app.services.booking_service import BookingService
from app.tasks.ticket_tasks import build_ticket_pdf_buffer

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("", response_model=StandardResponse[BookingResponse], status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookingCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomically reserve hotel rooms or flight seats with row-level locks (FOR UPDATE).
    Enforces double-booking prevention and establishes booking state machine.
    """
    booking = await BookingService.create_booking(
        db=db,
        user_id=current_user.id,
        request=request,
    )
    return StandardResponse[BookingResponse](
        success=True,
        message="Booking successfully created and inventory locked",
        data=booking,
    )


@router.get("", response_model=PaginatedResponse[BookingResponse])
async def list_my_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List authenticated user's travel bookings with pagination."""
    repo = BookingRepository(db)
    offset = (page - 1) * page_size
    bookings, total = await repo.list_user_bookings(
        user_id=current_user.id,
        status=status_filter,
        offset=offset,
        limit=page_size,
    )
    items = [BookingResponse.model_validate(b) for b in bookings]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse[BookingResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/{booking_id}", response_model=StandardResponse[BookingResponse])
async def get_booking_by_id(
    booking_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full booking itinerary, passenger manifests, and payments."""
    repo = BookingRepository(db)
    booking = await repo.get_booking_with_details(booking_id)

    if not booking:
        raise NotFoundError("Booking", booking_id)

    # Authorization Check
    is_owner = booking.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN or UserRole.ADMIN.value in current_user.roles
    is_assigned_agency = booking.agency_id and booking.agency_id == current_user.agency_id

    if not (is_owner or is_admin or is_assigned_agency):
        raise PermissionDeniedError("You do not have permission to view this booking")

    return StandardResponse[BookingResponse](
        success=True,
        message="Booking retrieved",
        data=BookingResponse.model_validate(booking),
    )


@router.get("/{booking_id}/ticket")
async def download_booking_ticket(
    booking_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and stream official PDF travel ticket voucher with QR verification code.
    Accessible by booking traveler, agency manager, or admin.
    """
    repo = BookingRepository(db)
    booking = await repo.get_booking_with_details(booking_id)

    if not booking:
        raise NotFoundError("Booking", booking_id)

    is_owner = booking.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN or UserRole.ADMIN.value in current_user.roles
    is_assigned_agency = booking.agency_id and booking.agency_id == current_user.agency_id

    if not (is_owner or is_admin or is_assigned_agency):
        raise PermissionDeniedError("You do not have permission to download this travel voucher")

    passenger_name = "Valued Guest"
    if booking.passengers:
        passenger_name = f"{booking.passengers[0].first_name} {booking.passengers[0].last_name}"

    ticket_data = {
        "booking_reference": booking.booking_reference,
        "passenger_name": passenger_name,
        "destination_city": booking.destination_city,
        "start_date": str(booking.start_date) if booking.start_date else "Flexible",
        "end_date": str(booking.end_date) if booking.end_date else "Flexible",
        "total_price": f"{booking.final_price:.2f}",
        "currency": booking.currency,
        "product_type": booking.product_type,
        "issue_date": (booking.confirmed_at or booking.created_at).strftime("%Y-%m-%d"),
        "status_text": "CONFIRMED & PAID" if booking.status == "confirmed" else booking.status.upper(),
    }

    pdf_bytes = build_ticket_pdf_buffer(ticket_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="ticket-{booking.booking_reference}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.patch("/{booking_id}/status", response_model=StandardResponse[BookingResponse])
async def update_booking_status(
    booking_id: uuid.UUID,
    request: BookingStatusUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transition booking through state machine.
    Admins can execute forced overrides; users can trigger valid standard transitions.
    """
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundError("Booking", booking_id)

    is_owner = booking.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN or UserRole.ADMIN.value in current_user.roles

    if not (is_owner or is_admin):
        raise PermissionDeniedError("Only the booking owner or an administrator can update booking status")

    # Only admin can request administrative override
    if request.admin_override and not is_admin:
        request.admin_override = False

    updated_booking = await BookingService.transition_status(
        db=db,
        booking_id=booking_id,
        request=request,
    )
    return StandardResponse[BookingResponse](
        success=True,
        message=f"Booking status transitioned to {request.target_status.value}",
        data=updated_booking,
    )


@router.post("/{booking_id}/cancel", response_model=StandardResponse[BookingResponse])
async def cancel_booking(
    booking_id: uuid.UUID,
    cancellation_reason: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Shortcut endpoint for cancelling a booking."""
    return await update_booking_status(
        booking_id=booking_id,
        request=BookingStatusUpdateRequest(
            target_status=BookingStatus.CANCELLED,
            cancellation_reason=cancellation_reason,
        ),
        current_user=current_user,
        db=db,
    )
