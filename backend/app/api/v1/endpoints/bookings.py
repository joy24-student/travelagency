"""
Booking State Machine API Endpoints.
Guarantees atomic reservations, double-booking prevention, and lifecycle state management.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import PermissionDeniedError
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    BookingStatus,
    BookingStatusUpdateRequest,
)
from app.schemas.user import CurrentUser, UserRole
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["Bookings & State Machine"])


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Atomic Booking Reservation",
)
async def create_booking(
    request: BookingCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    """
    Atomically creates a new booking reservation.
    Applies PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) on rooms and flight seats
    to guarantee that double-booking is impossible under high concurrent traffic.
    """
    booking = await BookingService.create_booking(
        db=db,
        user_id=current_user.id,
        request=request,
    )
    return BookingResponse.model_validate(booking)


@router.get("", response_model=List[BookingResponse], summary="List User Bookings")
async def list_bookings(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (pending_payment, confirmed, cancelled)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[BookingResponse]:
    """Retrieve all bookings belonging to the currently logged in user."""
    bookings = await BookingService.list_user_bookings(
        db=db,
        user_id=current_user.id,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    return [BookingResponse.model_validate(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse, summary="Get Booking by ID")
async def get_booking(
    booking_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    """Retrieve complete details for a booking. Validates ownership or administrative role."""
    booking = await BookingService.get_booking_by_id(db=db, booking_id=booking_id)

    # Ownership / RBAC check
    if booking.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("You do not have access to view this booking")

    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/status", response_model=BookingResponse, summary="Transition Booking State")
async def transition_booking_status(
    booking_id: uuid.UUID,
    update_request: BookingStatusUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    """
    Transitions a booking between lifecycle states:
    - draft -> pending_payment -> confirmed -> cancelled
    - When cancelled, reserved flight seats and hotel availability counts are atomically released.
    """
    booking = await BookingService.get_booking_by_id(db=db, booking_id=booking_id)

    # Only owner or admin can transition
    if booking.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("You are not authorized to update this booking state")

    updated_booking = await BookingService.transition_status(
        db=db,
        booking_id=booking_id,
        request=update_request,
        actor_id=current_user.id,
    )
    return BookingResponse.model_validate(updated_booking)
