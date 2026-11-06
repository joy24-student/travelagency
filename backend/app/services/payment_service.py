"""
Payment Gateway Service and Webhook Processing for bKash & Nagad.
Validates HMAC-SHA256 webhook signatures and updates booking statuses atomically.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, BadRequestError, NotFoundError
from app.core.security import verify_bkash_webhook_signature, verify_nagad_webhook_signature
from app.models.booking import Booking, BookingPayment
from app.models.payment import Payment
from app.schemas.booking import BookingStatus, BookingStatusUpdateRequest
from app.schemas.payment import (
    BkashWebhookPayload,
    NagadWebhookPayload,
    PaymentInitiateRequest,
    WebhookResponse,
)
from app.services.booking_service import BookingService

logger = logging.getLogger(__name__)


class PaymentService:

    @staticmethod
    async def initiate_payment(
        db: AsyncSession,
        user_id: uuid.UUID,
        request: PaymentInitiateRequest,
    ) -> Payment:
        """Create a pending payment transaction in the database."""
        booking = None
        if request.booking_id:
            booking = await BookingService.get_booking_by_id(db, request.booking_id)

        payment = Payment(
            user_id=user_id,
            amount=request.amount,
            original_amount=request.amount,
            fee=0.0,
            currency=request.currency,
            method=request.method,
            phone=request.phone,
            email=request.email,
            reference=request.reference or (booking.booking_reference if booking else None),
            status="pending",
            transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            gateway_response={"initiated_at": datetime.now(timezone.utc).isoformat()},
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        logger.info(f"Initiated payment {payment.id} for user {user_id}, method={request.method}")
        return payment

    @staticmethod
    async def process_bkash_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: BkashWebhookPayload,
    ) -> WebhookResponse:
        """
        Authenticate bKash webhook using HMAC-SHA256 and confirm booking upon successful capture.
        """
        # 1. Verify HMAC-SHA256 Signature
        is_valid = verify_bkash_webhook_signature(raw_body, signature)
        if not is_valid:
            logger.warning(f"Rejected bKash webhook: Invalid HMAC signature. PaymentID={payload.paymentID}")
            raise AuthenticationError("Invalid bKash webhook HMAC signature")

        logger.info(f"Verified bKash webhook for paymentID={payload.paymentID}, status={payload.transactionStatus}")

        # 2. Locate associated Booking (via invoice/reference or payment record)
        booking: Optional[Booking] = None
        if payload.merchantInvoiceNumber:
            # Check by reference
            stmt = select(Booking).where(Booking.booking_reference == payload.merchantInvoiceNumber)
            res = await db.execute(stmt)
            booking = res.scalar_one_or_none()

            # Check if invoice was booking UUID
            if not booking:
                try:
                    b_uuid = uuid.UUID(payload.merchantInvoiceNumber)
                    booking_stmt = select(Booking).where(Booking.id == b_uuid)
                    booking = (await db.execute(booking_stmt)).scalar_one_or_none()
                except ValueError:
                    pass

        # 3. Handle Status
        status_str = (payload.transactionStatus or "").lower()
        if status_str in ("completed", "success"):
            if booking and booking.status != BookingStatus.CONFIRMED.value:
                # Atomically transition booking to confirmed
                await BookingService.transition_status(
                    db=db,
                    booking_id=booking.id,
                    request=BookingStatusUpdateRequest(
                        target_status=BookingStatus.CONFIRMED,
                        payment_transaction_id=payload.trxID or payload.paymentID,
                    ),
                )
            return WebhookResponse(
                success=True,
                message="bKash payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.trxID or payload.paymentID,
            )
        else:
            return WebhookResponse(
                success=False,
                message=f"bKash transaction status is {payload.transactionStatus}",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status=status_str or "failed",
                transaction_id=payload.trxID,
            )

    @staticmethod
    async def process_nagad_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: NagadWebhookPayload,
    ) -> WebhookResponse:
        """
        Authenticate Nagad webhook using HMAC-SHA256 and confirm booking upon successful capture.
        """
        is_valid = verify_nagad_webhook_signature(raw_body, signature)
        if not is_valid:
            logger.warning(f"Rejected Nagad webhook: Invalid HMAC signature. OrderId={payload.orderId}")
            raise AuthenticationError("Invalid Nagad webhook HMAC signature")

        logger.info(f"Verified Nagad webhook for orderId={payload.orderId}, status={payload.status}")

        booking: Optional[Booking] = None
        if payload.orderId:
            stmt = select(Booking).where(Booking.booking_reference == payload.orderId)
            res = await db.execute(stmt)
            booking = res.scalar_one_or_none()

            if not booking:
                try:
                    b_uuid = uuid.UUID(payload.orderId)
                    booking_stmt = select(Booking).where(Booking.id == b_uuid)
                    booking = (await db.execute(booking_stmt)).scalar_one_or_none()
                except ValueError:
                    pass

        status_str = (payload.status or "").lower()
        if status_str in ("success", "completed"):
            if booking and booking.status != BookingStatus.CONFIRMED.value:
                await BookingService.transition_status(
                    db=db,
                    booking_id=booking.id,
                    request=BookingStatusUpdateRequest(
                        target_status=BookingStatus.CONFIRMED,
                        payment_transaction_id=payload.paymentRefId or payload.orderId,
                    ),
                )
            return WebhookResponse(
                success=True,
                message="Nagad payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.paymentRefId or payload.orderId,
            )
        else:
            return WebhookResponse(
                success=False,
                message=f"Nagad transaction status is {payload.status}",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status=status_str or "failed",
                transaction_id=payload.paymentRefId,
            )
