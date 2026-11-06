"""
Booking Service with Atomic Concurrency Control.
Enforces double-booking prevention using PostgreSQL row-level locks (SELECT ... FOR UPDATE)
and manages the Booking State Machine lifecycle.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.models.booking import Booking, BookingItem, BookingPassenger, BookingPayment
from app.models.flight import Flight, FlightSeat
from app.models.hotel import HotelRoom, HotelRoomAvailability
from app.schemas.booking import (
    BookingCreateRequest,
    BookingStatus,
    BookingStatusUpdateRequest,
    ProductType,
)

logger = logging.getLogger(__name__)

# Valid state transitions for the booking state machine
VALID_TRANSITIONS = {
    BookingStatus.DRAFT: {BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED},
    BookingStatus.PENDING_PAYMENT: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REFUNDED},
    BookingStatus.CANCELLED: set(),
    BookingStatus.COMPLETED: set(),
    BookingStatus.REFUNDED: set(),
}


def generate_booking_reference() -> str:
    """Generate human-readable, unique booking reference code (e.g. SJ-20261106-A4B7)."""
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
    ) -> Booking:
        """
        Atomically reserve hotel rooms or flight seats with row-level locks (FOR UPDATE).
        Prevents concurrency race conditions and double-booking.
        """
        # Execute inside an atomic transaction block
        total_price = 0.0

        for item in request.items:
            unit_total = item.unit_price * item.quantity
            total_price += unit_total

            # 1. HOTEL ROOM LOCKING & AVAILABILITY VERIFICATION
            if item.product_type == ProductType.HOTEL:
                # Lock hotel room record
                room_stmt = select(HotelRoom).where(HotelRoom.id == item.product_id).with_for_update()
                room_res = await db.execute(room_stmt)
                room = room_res.scalar_one_or_none()
                if not room:
                    raise NotFoundError("HotelRoom", item.product_id)

                # Lock and verify room availability for date range if dates are provided
                start_d = request.start_date
                end_d = request.end_date or request.start_date
                if start_d and end_d:
                    avail_stmt = (
                        select(HotelRoomAvailability)
                        .where(
                            HotelRoomAvailability.room_id == item.product_id,
                            HotelRoomAvailability.check_in_date <= end_d,
                            HotelRoomAvailability.check_out_date >= start_d,
                        )
                        .with_for_update()
                    )
                    avail_res = await db.execute(avail_stmt)
                    availabilities = avail_res.scalars().all()

                    for avail in availabilities:
                        if avail.available_count < item.quantity:
                            raise ConflictError(
                                f"Room '{room.room_type}' does not have enough capacity for selected dates: "
                                f"only {avail.available_count} left, requested {item.quantity}."
                            )
                        # Decrement available room count atomically
                        avail.available_count -= item.quantity

            # 2. FLIGHT INVENTORY & SPECIFIC SEAT LOCKING
            elif item.product_type == ProductType.FLIGHT:
                # Lock flight record
                flight_stmt = select(Flight).where(Flight.id == item.product_id).with_for_update()
                flight_res = await db.execute(flight_stmt)
                flight = flight_res.scalar_one_or_none()
                if not flight:
                    raise NotFoundError("Flight", item.product_id)

                if flight.available_seats < item.quantity:
                    raise ConflictError(
                        f"Flight {flight.flight_number} has only {flight.available_seats} seats available, "
                        f"requested {item.quantity}."
                    )

                # Lock specific seats if requested in metadata
                meta = item.item_metadata or {}
                seat_numbers = meta.get("seat_numbers") or meta.get("seat_number")
                if seat_numbers:
                    if isinstance(seat_numbers, str):
                        seat_numbers = [seat_numbers]

                    seat_stmt = (
                        select(FlightSeat)
                        .where(
                            FlightSeat.flight_id == item.product_id,
                            FlightSeat.seat_number.in_(seat_numbers),
                        )
                        .with_for_update()
                    )
                    seat_res = await db.execute(seat_stmt)
                    seats = seat_res.scalars().all()

                    found_seat_numbers = {s.seat_number for s in seats}
                    for sn in seat_numbers:
                        if sn not in found_seat_numbers:
                            raise NotFoundError("FlightSeat", f"{flight.flight_number}:{sn}")

                    for seat in seats:
                        if not seat.is_available:
                            raise ConflictError(
                                f"Seat '{seat.seat_number}' on flight {flight.flight_number} is already booked."
                            )
                        # Lock seat to unavailable
                        seat.is_available = False

                # Decrement flight seat counter
                flight.available_seats -= item.quantity

        # Create Booking header record
        booking_ref = generate_booking_reference()
        tax_amount = round(total_price * 0.05, 2)  # 5% tax
        service_fee = 10.0
        final_price = total_price + tax_amount + service_fee

        booking = Booking(
            user_id=user_id,
            booking_reference=booking_ref,
            product_type=request.product_type.value,
            status=BookingStatus.PENDING_PAYMENT.value,
            flow_step="payment",
            origin_city=request.origin_city,
            destination_city=request.destination_city,
            destination_country=request.destination_country,
            start_date=request.start_date,
            end_date=request.end_date,
            number_of_guests=request.number_of_guests,
            total_price=total_price,
            currency="USD",
            discount_amount=0.0,
            tax_amount=tax_amount,
            service_fee=service_fee,
            final_price=final_price,
            special_requests=request.special_requests,
        )
        db.add(booking)
        await db.flush()  # assign booking.id

        # Insert booking line items
        for item in request.items:
            db_item = BookingItem(
                booking_id=booking.id,
                product_id=item.product_id,
                product_type=item.product_type.value,
                product_name=item.product_name,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.unit_price * item.quantity,
                item_metadata=item.item_metadata,
            )
            db.add(db_item)

        # Insert booking passengers
        for p in request.passengers:
            db_p = BookingPassenger(
                booking_id=booking.id,
                first_name=p.first_name,
                last_name=p.last_name,
                email=p.email,
                phone=p.phone,
                date_of_birth=p.date_of_birth,
                gender=p.gender,
                nationality=p.nationality,
                passport_number=p.passport_number,
                passport_expiry=p.passport_expiry,
                passenger_type=p.passenger_type,
                seat_preference=p.seat_preference,
                meal_preference=p.meal_preference,
                is_primary=p.is_primary,
            )
            db.add(db_p)

        await db.commit()
        logger.info(f"Booking created successfully: ID={booking.id}, Ref={booking_ref}, User={user_id}")
        return await BookingService.get_booking_by_id(db, booking.id)

    @staticmethod
    async def get_booking_by_id(db: AsyncSession, booking_id: uuid.UUID) -> Booking:
        """Fetch booking with items, passengers, and payments eagerly loaded."""
        stmt = (
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.items),
                selectinload(Booking.passengers),
                selectinload(Booking.payments),
            )
        )
        res = await db.execute(stmt)
        booking = res.scalar_one_or_none()
        if not booking:
            raise NotFoundError("Booking", booking_id)
        return booking

    @staticmethod
    async def get_booking_by_reference(db: AsyncSession, reference: str) -> Booking:
        """Fetch booking by unique booking reference."""
        stmt = (
            select(Booking)
            .where(Booking.booking_reference == reference)
            .options(
                selectinload(Booking.items),
                selectinload(Booking.passengers),
                selectinload(Booking.payments),
            )
        )
        res = await db.execute(stmt)
        booking = res.scalar_one_or_none()
        if not booking:
            raise NotFoundError("BookingReference", reference)
        return booking

    @staticmethod
    async def transition_status(
        db: AsyncSession,
        booking_id: uuid.UUID,
        request: BookingStatusUpdateRequest,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Booking:
        """
        Transition booking status through the state machine.
        Releases reserved resources on cancellation or records payment confirmation.
        """
        # Lock the target booking row
        stmt = (
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.items),
                selectinload(Booking.passengers),
                selectinload(Booking.payments),
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        booking = res.scalar_one_or_none()
        if not booking:
            raise NotFoundError("Booking", booking_id)

        current_status = BookingStatus(booking.status)
        target_status = request.target_status

        if target_status == current_status:
            return booking

        # Check valid state transition
        allowed = VALID_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise BadRequestError(
                f"Cannot transition booking from '{current_status.value}' to '{target_status.value}'. "
                f"Allowed transitions: {[s.value for s in allowed]}"
            )

        now = datetime.now(timezone.utc)

        # 1. TRANSITION TO CONFIRMED
        if target_status == BookingStatus.CONFIRMED:
            booking.status = BookingStatus.CONFIRMED.value
            booking.flow_step = "confirmed"
            booking.confirmed_at = now

            if request.payment_transaction_id:
                payment = BookingPayment(
                    booking_id=booking.id,
                    amount=booking.final_price,
                    currency=booking.currency,
                    payment_method="online",
                    payment_status="completed",
                    transaction_id=request.payment_transaction_id,
                    processed_at=now,
                )
                db.add(payment)

        # 2. TRANSITION TO CANCELLED: RELEASE RESERVED INVENTORY
        elif target_status == BookingStatus.CANCELLED:
            booking.status = BookingStatus.CANCELLED.value
            booking.flow_step = "cancelled"
            booking.cancelled_at = now

            # Release locked hotel rooms and flight seats
            for item in booking.items:
                if item.product_type == ProductType.HOTEL.value and item.product_id:
                    # Increment back room availability count if dates were booked
                    if booking.start_date is not None:
                        check_end = booking.end_date or booking.start_date
                        avail_stmt = (
                            select(HotelRoomAvailability)
                            .where(
                                HotelRoomAvailability.room_id == item.product_id,
                                HotelRoomAvailability.check_in_date <= check_end,
                                HotelRoomAvailability.check_out_date >= booking.start_date,
                            )
                            .with_for_update()
                        )
                        avail_res = await db.execute(avail_stmt)
                        for avail in avail_res.scalars().all():
                            avail.available_count += item.quantity

                elif item.product_type == ProductType.FLIGHT.value and item.product_id:
                    flight_stmt = select(Flight).where(Flight.id == item.product_id).with_for_update()
                    flight_res = await db.execute(flight_stmt)
                    flight = flight_res.scalar_one_or_none()
                    if flight:
                        flight.available_seats += item.quantity

                    meta = item.item_metadata or {}
                    seat_numbers = meta.get("seat_numbers") or meta.get("seat_number")
                    if seat_numbers:
                        if isinstance(seat_numbers, str):
                            seat_numbers = [seat_numbers]
                        seat_stmt = (
                            select(FlightSeat)
                            .where(
                                FlightSeat.flight_id == item.product_id,
                                FlightSeat.seat_number.in_(seat_numbers),
                            )
                            .with_for_update()
                        )
                        seat_res = await db.execute(seat_stmt)
                        for seat in seat_res.scalars().all():
                            seat.is_available = True

        elif target_status == BookingStatus.COMPLETED:
            booking.status = BookingStatus.COMPLETED.value
            booking.completed_at = now

        elif target_status == BookingStatus.REFUNDED:
            booking.status = BookingStatus.REFUNDED.value

        await db.commit()
        logger.info(f"Booking {booking_id} transitioned: {current_status.value} -> {target_status.value}")
        return booking

    @staticmethod
    async def list_user_bookings(
        db: AsyncSession,
        user_id: uuid.UUID,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> List[Booking]:
        """List bookings belonging to the user."""
        stmt = (
            select(Booking)
            .where(Booking.user_id == user_id)
            .options(
                selectinload(Booking.items),
                selectinload(Booking.passengers),
                selectinload(Booking.payments),
            )
            .order_by(Booking.created_at.desc())
        )
        if status_filter:
            stmt = stmt.where(Booking.status == status_filter)

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)
        res = await db.execute(stmt)
        return list(res.scalars().all())
