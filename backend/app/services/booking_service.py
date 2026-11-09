"""
Booking Domain Service & Concurrency Controller.
Enforces double-booking prevention using row-level locks (SELECT ... FOR UPDATE)
and manages the Booking State Machine lifecycle.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.models.booking import Booking, BookingEvent, BookingItem, BookingPassenger, BookingPayment
from app.models.flight import FlightSeat
from app.repositories.booking_repository import BookingRepository
from app.repositories.flight_repository import FlightRepository
from app.repositories.hotel_repository import HotelRepository
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    BookingStatus,
    BookingStatusUpdateRequest,
    ProductType,
)
from app.tasks.notification_tasks import send_booking_confirmation_email_task
from app.tasks.ticket_tasks import generate_travel_ticket_task

logger = logging.getLogger(__name__)

# Valid state machine transitions
VALID_TRANSITIONS = {
    BookingStatus.DRAFT: {BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED},
    BookingStatus.PENDING_PAYMENT: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REFUNDED},
    BookingStatus.CANCELLED: set(),
    BookingStatus.COMPLETED: set(),
    BookingStatus.REFUNDED: set(),
}


def generate_booking_reference() -> str:
    """Generate unique booking reference code (e.g. SJ-20261106-A4B7)."""
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:6].upper()
    return f"SJ-{date_str}-{random_part}"


class BookingService:

    @staticmethod
    async def create_booking(
        db: AsyncSession,
        user_id: uuid.UUID,
        request: BookingCreateRequest,
    ) -> BookingResponse:
        """
        Atomically reserve hotel rooms or flight seats with row-level locks (FOR UPDATE).
        Prevents concurrency race conditions and double-booking.
        """
        hotel_repo = HotelRepository(db)
        flight_repo = FlightRepository(db)
        booking_repo = BookingRepository(db)

        total_price = 0.0

        # Verify items and acquire locks
        for item in request.items:
            unit_total = item.unit_price * item.quantity
            total_price += unit_total

            # 1. HOTEL ROOM LOCKING & AVAILABILITY VERIFICATION
            if item.product_type == ProductType.HOTEL:
                room = await hotel_repo.lock_room_for_update(item.product_id)
                if not room:
                    raise NotFoundError("HotelRoom", item.product_id)

                if not room.is_available:
                    raise ConflictError(f"Hotel room '{room.name}' is currently marked unavailable.")

                if request.start_date and request.end_date:
                    is_available = await hotel_repo.check_and_reserve_availability(
                        room_id=room.id,
                        start_date=request.start_date,
                        end_date=request.end_date,
                        quantity=item.quantity,
                    )
                    if not is_available:
                        raise ConflictError(
                            f"Room '{room.name}' has insufficient availability for the selected dates."
                        )

            # 2. FLIGHT SEAT LOCKING & CAPACITY VERIFICATION
            elif item.product_type == ProductType.FLIGHT:
                flight = await flight_repo.lock_flight_for_update(item.product_id)
                if not flight:
                    raise NotFoundError("Flight", item.product_id)

                if flight.available_seats < item.quantity:
                    raise ConflictError(
                        f"Flight '{flight.flight_number}' has only {flight.available_seats} seats remaining; "
                        f"requested {item.quantity}."
                    )

                flight.available_seats -= item.quantity

        # Check individual flight seats if passengers selected specific seat UUIDs
        for passenger in request.passengers:
            if passenger.seat_id:
                seat = await flight_repo.lock_seat_for_update(passenger.seat_id)
                if not seat:
                    raise NotFoundError("FlightSeat", passenger.seat_id)
                if not seat.is_available:
                    raise ConflictError(f"Seat '{seat.seat_number}' has already been booked by another traveler.")
                seat.is_available = False

        # Calculate final price using parameterized configuration
        discount = 0.0
        tax = round(total_price * (settings.VAT_TAX_PERCENTAGE / 100.0), 2)
        service_fee = settings.BOOKING_SERVICE_FEE if total_price > 0 else 0.0
        final_price = total_price - discount + tax + service_fee

        booking = Booking(
            user_id=user_id,
            agency_id=request.agency_id,
            booking_reference=generate_booking_reference(),
            product_type=request.product_type.value,
            status=BookingStatus.PENDING_PAYMENT.value,
            flow_step="payment",
            origin_city=request.origin_city,
            destination_city=request.destination_city,
            destination_country=request.destination_country or settings.DEFAULT_COUNTRY,
            start_date=request.start_date,
            end_date=request.end_date,
            number_of_guests=request.number_of_guests,
            total_price=total_price,
            discount_amount=discount,
            tax_amount=tax,
            service_fee=service_fee,
            final_price=final_price,
            currency=settings.DEFAULT_CURRENCY,
            special_requests=request.special_requests,
            notes=request.notes,
        )

        for item in request.items:
            booking.items.append(
                BookingItem(
                    product_id=item.product_id,
                    product_type=item.product_type.value,
                    product_name=item.product_name,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=item.unit_price * item.quantity,
                    item_metadata=item.item_metadata,
                )
            )

        for passenger in request.passengers:
            booking.passengers.append(
                BookingPassenger(
                    first_name=passenger.first_name,
                    last_name=passenger.last_name,
                    email=passenger.email,
                    phone=passenger.phone,
                    passenger_type=passenger.passenger_type,
                    passport_number=passenger.passport_number,
                    seat_preference=passenger.seat_preference,
                    seat_id=passenger.seat_id,
                )
            )

        await booking_repo.add(booking)

        # Record booking creation event in the same atomic transaction
        booking.events.append(
            BookingEvent(
                type="created",
                actor_id=user_id,
                payload={
                    "booking_reference": booking.booking_reference,
                    "status": booking.status,
                    "product_type": booking.product_type,
                    "destination_city": booking.destination_city,
                    "final_price": float(booking.final_price),
                    "currency": booking.currency,
                },
                created_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()
        await db.refresh(booking)

        logger.info(
            f"Successfully created atomic booking {booking.booking_reference} (ID={booking.id}) "
            f"for user {user_id}. Final amount: {booking.final_price} BDT"
        )

        full_booking = await booking_repo.get_booking_with_details(booking.id)
        return BookingResponse.model_validate(full_booking)

    @staticmethod
    async def transition_status(
        db: AsyncSession,
        booking_id: uuid.UUID,
        request: BookingStatusUpdateRequest,
    ) -> BookingResponse:
        """
        Safely transition booking status through the state machine using row-level locking.
        """
        booking_repo = BookingRepository(db)
        booking = await booking_repo.lock_booking_for_update(booking_id)

        if not booking:
            raise NotFoundError("Booking", booking_id)

        current_status = BookingStatus(booking.status)
        target_status = request.target_status

        # Validate allowed transitions unless administrative override
        if not request.admin_override:
            allowed = VALID_TRANSITIONS.get(current_status, set())
            if target_status not in allowed:
                raise BadRequestError(
                    f"Illegal booking state transition from '{current_status.value}' to '{target_status.value}'. "
                    f"Allowed next states: {[s.value for s in allowed]}"
                )

        now = datetime.now(timezone.utc)
        booking.status = target_status.value

        if target_status == BookingStatus.CONFIRMED:
            booking.confirmed_at = now
            booking.flow_step = "voucher_issued"

            # Create or complete payment transaction record if transaction ID supplied
            if request.payment_transaction_id:
                payment_record = BookingPayment(
                    booking_id=booking.id,
                    payment_method="online",
                    payment_status="completed",
                    amount=booking.final_price,
                    currency=booking.currency,
                    transaction_id=request.payment_transaction_id,
                    processed_at=now,
                )
                db.add(payment_record)

            # Create offline-capable, tamper-proof signed e-tickets inside transaction
            from app.services.ticket_service import TicketService
            await TicketService.create_tickets_for_booking(db, booking)

            # Enqueue asynchronous Celery tasks for PDF ticket & confirmation email
            ticket_payload = {
                "booking_reference": booking.booking_reference,
                "passenger_name": (
                    f"{booking.passengers[0].first_name} {booking.passengers[0].last_name}"
                    if booking.passengers
                    else "Valued Guest"
                ),
                "destination_city": booking.destination_city,
                "start_date": str(booking.start_date) if booking.start_date else "Flexible",
                "end_date": str(booking.end_date) if booking.end_date else "Flexible",
                "total_price": float(booking.final_price),
                "currency": booking.currency,
                "product_type": booking.product_type,
                "issue_date": now.strftime("%Y-%m-%d"),
            }

            try:
                generate_travel_ticket_task.delay(ticket_payload)
                if booking.passengers and booking.passengers[0].email:
                    send_booking_confirmation_email_task.delay(
                        booking.passengers[0].email,
                        {
                            "booking_reference": booking.booking_reference,
                            "destination_city": booking.destination_city,
                            "final_price": float(booking.final_price),
                            "currency": booking.currency,
                        },
                    )
            except Exception as task_exc:
                logger.warning(f"Could not enqueue background Celery tasks: {task_exc}")

        elif target_status == BookingStatus.CANCELLED:
            booking.cancelled_at = now
            booking.flow_step = "cancelled"

        elif target_status == BookingStatus.COMPLETED:
            booking.completed_at = now
            booking.flow_step = "completed"

        # Record booking lifecycle event in the same atomic transaction
        status_event_map = {
            BookingStatus.CONFIRMED: "confirmed",
            BookingStatus.CANCELLED: "cancelled",
            BookingStatus.REFUNDED: "refunded",
            BookingStatus.COMPLETED: "checked_in",
            BookingStatus.PENDING_PAYMENT: "created",
        }
        event_type = status_event_map.get(target_status, "confirmed")

        booking_event = BookingEvent(
            booking_id=booking.id,
            type=event_type,
            actor_id=booking.user_id,
            payload={
                "booking_id": str(booking.id),
                "booking_reference": booking.booking_reference,
                "status": target_status.value,
                "previous_status": current_status.value,
                "destination_city": booking.destination_city,
                "product_type": booking.product_type,
                "final_price": float(booking.final_price),
                "currency": booking.currency,
                "payment_transaction_id": request.payment_transaction_id,
            },
            created_at=now,
        )
        db.add(booking_event)

        await db.commit()
        full_booking = await booking_repo.get_booking_with_details(booking.id)

        logger.info(f"Transitioned booking {booking.booking_reference} to {target_status.value}")
        return BookingResponse.model_validate(full_booking)
