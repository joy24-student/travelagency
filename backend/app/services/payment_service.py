"""
Payment Gateway Webhook Processing & Ledger Service.
Handles HMAC-SHA256 verification and atomic post-payment orchestration:
Confirms booking, credits agency commission, awards loyalty points in a single atomic transaction.
"""

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, BadRequestError, NotFoundError
from app.core.security import (
    verify_bkash_webhook_signature,
    verify_card_webhook_signature,
    verify_nagad_webhook_signature,
    verify_rocket_webhook_signature,
    verify_stripe_webhook_signature,
)
from app.models.booking import Booking, BookingEvent, BookingPayment
from app.models.payment import Payment
from app.repositories.agency_repository import AgencyRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.loyalty_repository import LoyaltyRepository
from app.repositories.payment_repository import PaymentRepository
from app.schemas.booking import BookingStatus
from app.schemas.payment import (
    BkashWebhookPayload,
    CardWebhookPayload,
    NagadWebhookPayload,
    PaymentInitiateRequest,
    PaymentResponse,
    RocketWebhookPayload,
    StripeWebhookPayload,
    WebhookResponse,
)
from app.tasks.notification_tasks import send_booking_confirmation_email_task
from app.tasks.ticket_tasks import generate_travel_ticket_task

logger = logging.getLogger(__name__)


class PaymentService:

    @staticmethod
    async def initiate_payment(
        db: AsyncSession,
        user_id: uuid.UUID,
        request: PaymentInitiateRequest,
    ) -> PaymentResponse:
        """
        Create a pending payment transaction.
        Verifies single-use security nonce if supplied to prevent replay attacks.
        """
        payment_repo = PaymentRepository(db)
        booking_repo = BookingRepository(db)

        # Idempotency check: prevent duplicate charges / multiple submits
        idem_key = request.idempotency_key
        if idem_key:
            existing_payment = await payment_repo.get_by_idempotency_key(user_id, idem_key)
            if existing_payment:
                logger.info(f"Duplicate payment request de-duplicated with idempotency key: {idem_key}")
                redirect_url = f"https://payment.shopnojatra.com/checkout/{existing_payment.id}?tx={existing_payment.transaction_id}"
                return PaymentResponse(
                    id=existing_payment.id,
                    amount=float(existing_payment.amount),
                    currency=existing_payment.currency,
                    method=existing_payment.method,
                    status=existing_payment.status,
                    transaction_id=existing_payment.transaction_id,
                    reference=existing_payment.reference,
                    redirect_url=redirect_url,
                )

        # Nonce verification
        if request.nonce:
            valid_nonce = await payment_repo.verify_and_record_nonce(
                nonce=request.nonce,
                user_id=user_id,
                timestamp_ms=request.timestamp_ms,
            )
            if not valid_nonce:
                raise BadRequestError("Invalid or expired payment security nonce (potential replay attack)")

        booking: Optional[Booking] = None
        if request.booking_id:
            booking = await booking_repo.get_booking_with_details(request.booking_id)
            if not booking:
                raise NotFoundError("Booking", request.booking_id)

        tx_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
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
            transaction_id=tx_id,
            gateway_response={"initiated_at": datetime.now(timezone.utc).isoformat()},
        )
        await payment_repo.add(payment)
        await db.commit()
        await db.refresh(payment)

        # Mock gateway redirect URL for sandbox/development
        redirect_url = f"https://payment.shopnojatra.com/checkout/{payment.id}?tx={tx_id}"

        return PaymentResponse(
            id=payment.id,
            amount=float(payment.amount),
            currency=payment.currency,
            method=payment.method,
            status=payment.status,
            transaction_id=payment.transaction_id,
            reference=payment.reference,
            redirect_url=redirect_url,
        )

    @staticmethod
    async def _execute_atomic_payment_confirmation(
        db: AsyncSession,
        provider: str,
        transaction_id: str,
        booking_reference: Optional[str],
        amount_paid: Optional[float],
        gateway_payload: Dict[str, Any],
    ) -> Tuple[Optional[Booking], Optional[float], Optional[float]]:
        """
        Atomically executes the critical post-payment business logic in a SINGLE transaction:
        1. Confirms the booking
        2. Records/completes payment
        3. Credits agency commission
        4. Awards user loyalty points
        """
        booking_repo = BookingRepository(db)
        loyalty_repo = LoyaltyRepository(db)
        agency_repo = AgencyRepository(db)

        booking: Optional[Booking] = None
        if booking_reference:
            booking = await booking_repo.get_by_reference(booking_reference)

        if not booking:
            # Check by booking UUID
            try:
                b_uuid = uuid.UUID(booking_reference)
                booking = await booking_repo.get_booking_with_details(b_uuid)
            except (ValueError, TypeError) as uuid_err:
                logger.debug(f"Reference '{booking_reference}' is not a UUID: {uuid_err}")

        if not booking:
            logger.warning(f"No booking matched reference '{booking_reference}' for provider {provider}")
            return None, None, None

        # Lock booking row for safe state transition
        locked_booking = await booking_repo.lock_booking_for_update(booking.id)
        now = datetime.now(timezone.utc)

        # If already confirmed, ensure idempotent completion
        if locked_booking.status != BookingStatus.CONFIRMED.value:
            locked_booking.status = BookingStatus.CONFIRMED.value
            locked_booking.confirmed_at = now
            locked_booking.flow_step = "voucher_issued"

            # Create or complete payment record
            payment_record = BookingPayment(
                booking_id=locked_booking.id,
                payment_method=provider,
                payment_status="completed",
                amount=locked_booking.final_price,
                currency=locked_booking.currency,
                transaction_id=transaction_id,
                payment_gateway=provider,
                gateway_response=gateway_payload,
                processed_at=now,
            )
            db.add(payment_record)

            # Record booking paid and confirmed event in atomic transaction
            booking_event = BookingEvent(
                booking_id=locked_booking.id,
                type="paid",
                actor_id=locked_booking.user_id,
                payload={
                    "booking_id": str(locked_booking.id),
                    "booking_reference": locked_booking.booking_reference,
                    "status": BookingStatus.CONFIRMED.value,
                    "previous_status": BookingStatus.PENDING_PAYMENT.value,
                    "provider": provider,
                    "transaction_id": transaction_id,
                    "final_price": float(locked_booking.final_price),
                    "amount": float(locked_booking.final_price),
                    "currency": locked_booking.currency,
                    "payment_status": "completed",
                },
                created_at=now,
            )
            db.add(booking_event)

            # Double-entry ledger: record inbound payment into gateway & escrow hold
            from app.services.ledger_service import LedgerService
            await LedgerService.record_payment(
                db=db,
                payment={
                    "booking_id": locked_booking.id,
                    "amount": locked_booking.final_price,
                    "currency": locked_booking.currency,
                    "agency_id": locked_booking.agency_id,
                },
                booking=locked_booking,
            )

            # Create offline-capable, tamper-proof signed e-tickets inside transaction
            from app.services.ticket_service import TicketService
            await TicketService.create_tickets_for_booking(db, locked_booking)

        commission_amount: Optional[float] = None
        # Credit agency commission if booking was booked through a partner agency
        if locked_booking.agency_id:
            comm_rate = settings.AGENCY_COMMISSION_PERCENTAGE
            commission_amount = round(float(locked_booking.final_price) * (comm_rate / 100.0), 2)
            await agency_repo.credit_commission(
                agency_id=locked_booking.agency_id,
                booking_id=locked_booking.id,
                amount=commission_amount,
                commission_rate=comm_rate,
                currency=locked_booking.currency,
                reference=f"COMM-{transaction_id}",
            )
            logger.info(
                f"Credited commission {commission_amount} {locked_booking.currency} to agency {locked_booking.agency_id} "
                f"for booking {locked_booking.booking_reference}"
            )

        # Award loyalty points using parameterized points per currency spent
        points_to_award = round(
            float(locked_booking.final_price) * settings.LOYALTY_POINTS_PER_CURRENCY_SPENT, 2
        )
        await loyalty_repo.award_points(
            user_id=locked_booking.user_id,
            points=points_to_award,
            description=f"Reward for completed booking {locked_booking.booking_reference}",
            reference_id=transaction_id,
        )
        logger.info(
            f"Awarded {points_to_award} loyalty points to user {locked_booking.user_id} "
            f"for booking {locked_booking.booking_reference}"
        )

        await db.commit()
        await db.refresh(locked_booking)

        # Real-time WebSocket push to listening mobile clients
        try:
            from app.websockets.connection_manager import ws_manager
            await ws_manager.broadcast_to_channel(
                f"booking:{locked_booking.id}",
                {
                    "event": "booking_confirmed",
                    "booking_id": str(locked_booking.id),
                    "booking_reference": locked_booking.booking_reference,
                    "status": "confirmed",
                    "transaction_id": transaction_id,
                    "commission_credited": commission_amount,
                    "loyalty_points_awarded": points_to_award,
                },
            )
        except Exception as ws_err:
            logger.warning(f"WebSocket broadcast non-fatal exception: {ws_err}")

        # Enqueue async Celery tasks
        try:
            ticket_payload = {
                "booking_reference": locked_booking.booking_reference,
                "passenger_name": (
                    f"{locked_booking.passengers[0].first_name} {locked_booking.passengers[0].last_name}"
                    if locked_booking.passengers
                    else "Valued Traveler"
                ),
                "destination_city": locked_booking.destination_city,
                "start_date": str(locked_booking.start_date) if locked_booking.start_date else "N/A",
                "end_date": str(locked_booking.end_date) if locked_booking.end_date else "N/A",
                "total_price": float(locked_booking.final_price),
                "currency": locked_booking.currency,
                "product_type": locked_booking.product_type,
                "issue_date": now.strftime("%Y-%m-%d"),
            }
            generate_travel_ticket_task.delay(ticket_payload)

            if locked_booking.passengers and locked_booking.passengers[0].email:
                send_booking_confirmation_email_task.delay(
                    locked_booking.passengers[0].email,
                    {
                        "booking_reference": locked_booking.booking_reference,
                        "destination_city": locked_booking.destination_city,
                        "final_price": float(locked_booking.final_price),
                        "currency": locked_booking.currency,
                    },
                )
        except Exception as task_err:
            logger.warning(f"Background task dispatch non-fatal failure: {task_err}")

        return locked_booking, commission_amount, points_to_award

    @staticmethod
    async def process_bkash_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: BkashWebhookPayload,
        client_ip: Optional[str] = None,
    ) -> WebhookResponse:
        """bKash webhook handler with HMAC-SHA256 and atomic multi-ledger update."""
        payment_repo = PaymentRepository(db)
        payload_hash = hashlib.sha256(raw_body).hexdigest()
        idempotency_key = f"bkash:{payload.paymentID}:{payload.trxID or ''}"

        # 1. Idempotency Check
        existing_log = await payment_repo.check_webhook_idempotency(idempotency_key)
        if existing_log and existing_log.status == "processed":
            logger.info(f"Duplicate bKash webhook ignored idempotently: {idempotency_key}")
            return WebhookResponse(
                success=True,
                message="Duplicate webhook ignored; already processed successfully",
                status="completed",
                transaction_id=payload.trxID or payload.paymentID,
            )

        # 2. Strict HMAC-SHA256 Signature Verification
        if not verify_bkash_webhook_signature(raw_body, signature):
            await payment_repo.record_webhook_log(
                provider="bkash",
                provider_transaction_id=payload.trxID or payload.paymentID,
                signature_verified=False,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="failed",
                error_message="Invalid HMAC-SHA256 signature",
                client_ip=client_ip,
            )
            await db.commit()
            raise AuthenticationError("Invalid bKash webhook HMAC signature")

        # 3. Process Status
        status_str = (payload.transactionStatus or "").lower()
        if status_str in ("completed", "success"):
            booking, comm, points = await PaymentService._execute_atomic_payment_confirmation(
                db=db,
                provider="bkash",
                transaction_id=payload.trxID or payload.paymentID,
                booking_reference=payload.merchantInvoiceNumber,
                amount_paid=float(payload.amount) if payload.amount else None,
                gateway_payload=payload.model_dump(),
            )
            await payment_repo.record_webhook_log(
                provider="bkash",
                provider_transaction_id=payload.trxID or payload.paymentID,
                signature_verified=True,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="processed",
                client_ip=client_ip,
            )
            await db.commit()

            return WebhookResponse(
                success=True,
                message="bKash payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.trxID or payload.paymentID,
                commission_credited=comm,
                loyalty_points_awarded=points,
            )
        else:
            return WebhookResponse(
                success=False,
                message=f"bKash transaction status is {payload.transactionStatus}",
                status=status_str or "failed",
                transaction_id=payload.trxID,
            )

    @staticmethod
    async def process_nagad_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: NagadWebhookPayload,
        client_ip: Optional[str] = None,
    ) -> WebhookResponse:
        """Nagad payment webhook with HMAC-SHA256 and atomic multi-ledger update."""
        payment_repo = PaymentRepository(db)
        payload_hash = hashlib.sha256(raw_body).hexdigest()
        idempotency_key = f"nagad:{payload.orderId}:{payload.paymentRefId or ''}"

        existing_log = await payment_repo.check_webhook_idempotency(idempotency_key)
        if existing_log and existing_log.status == "processed":
            return WebhookResponse(
                success=True,
                message="Duplicate Nagad webhook ignored; already processed",
                status="completed",
                transaction_id=payload.paymentRefId or payload.orderId,
            )

        if not verify_nagad_webhook_signature(raw_body, signature):
            await payment_repo.record_webhook_log(
                provider="nagad",
                provider_transaction_id=payload.paymentRefId or payload.orderId,
                signature_verified=False,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="failed",
                error_message="Invalid HMAC-SHA256 signature",
                client_ip=client_ip,
            )
            await db.commit()
            raise AuthenticationError("Invalid Nagad webhook HMAC signature")

        status_str = (payload.status or "").lower()
        if status_str in ("success", "completed"):
            booking, comm, points = await PaymentService._execute_atomic_payment_confirmation(
                db=db,
                provider="nagad",
                transaction_id=payload.paymentRefId or payload.orderId,
                booking_reference=payload.orderId,
                amount_paid=float(payload.amount) if payload.amount else None,
                gateway_payload=payload.model_dump(),
            )
            await payment_repo.record_webhook_log(
                provider="nagad",
                provider_transaction_id=payload.paymentRefId or payload.orderId,
                signature_verified=True,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="processed",
                client_ip=client_ip,
            )
            await db.commit()

            return WebhookResponse(
                success=True,
                message="Nagad payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.paymentRefId or payload.orderId,
                commission_credited=comm,
                loyalty_points_awarded=points,
            )
        else:
            return WebhookResponse(
                success=False,
                message=f"Nagad transaction status is {payload.status}",
                status=status_str or "failed",
                transaction_id=payload.paymentRefId,
            )

    @staticmethod
    async def process_rocket_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: RocketWebhookPayload,
        client_ip: Optional[str] = None,
    ) -> WebhookResponse:
        """DBBL Rocket payment webhook with HMAC-SHA256 and atomic multi-ledger update."""
        payment_repo = PaymentRepository(db)
        payload_hash = hashlib.sha256(raw_body).hexdigest()
        idempotency_key = f"rocket:{payload.rocketTransactionId}"

        existing_log = await payment_repo.check_webhook_idempotency(idempotency_key)
        if existing_log and existing_log.status == "processed":
            return WebhookResponse(
                success=True,
                message="Duplicate Rocket webhook ignored",
                status="completed",
                transaction_id=payload.rocketTransactionId,
            )

        if not verify_rocket_webhook_signature(raw_body, signature):
            await payment_repo.record_webhook_log(
                provider="rocket",
                provider_transaction_id=payload.rocketTransactionId,
                signature_verified=False,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="failed",
                error_message="Invalid Rocket HMAC signature",
                client_ip=client_ip,
            )
            await db.commit()
            raise AuthenticationError("Invalid Rocket webhook HMAC signature")

        if payload.status.upper() == "SUCCESS":
            booking, comm, points = await PaymentService._execute_atomic_payment_confirmation(
                db=db,
                provider="rocket",
                transaction_id=payload.rocketTransactionId,
                booking_reference=payload.invoiceNumber,
                amount_paid=payload.amount,
                gateway_payload=payload.model_dump(),
            )
            await payment_repo.record_webhook_log(
                provider="rocket",
                provider_transaction_id=payload.rocketTransactionId,
                signature_verified=True,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="processed",
                client_ip=client_ip,
            )
            await db.commit()

            return WebhookResponse(
                success=True,
                message="Rocket payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.rocketTransactionId,
                commission_credited=comm,
                loyalty_points_awarded=points,
            )
        else:
            return WebhookResponse(
                success=False,
                message=f"Rocket status: {payload.status}",
                status=payload.status.lower(),
                transaction_id=payload.rocketTransactionId,
            )

    @staticmethod
    async def process_stripe_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: StripeWebhookPayload,
        client_ip: Optional[str] = None,
    ) -> WebhookResponse:
        """Stripe webhook with HMAC signature verification and atomic multi-ledger update."""
        payment_repo = PaymentRepository(db)
        payload_hash = hashlib.sha256(raw_body).hexdigest()
        idempotency_key = f"stripe:{payload.id}"

        existing_log = await payment_repo.check_webhook_idempotency(idempotency_key)
        if existing_log and existing_log.status == "processed":
            return WebhookResponse(
                success=True,
                message="Duplicate Stripe webhook ignored",
                status="completed",
                transaction_id=payload.id,
            )

        if not verify_stripe_webhook_signature(raw_body, signature):
            await payment_repo.record_webhook_log(
                provider="stripe",
                provider_transaction_id=payload.id,
                signature_verified=False,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="failed",
                error_message="Invalid Stripe webhook signature",
                client_ip=client_ip,
            )
            await db.commit()
            raise AuthenticationError("Invalid Stripe webhook signature")

        if payload.type in ("payment_intent.succeeded", "checkout.session.completed"):
            obj = payload.data.get("object", {})
            metadata = obj.get("metadata", {})
            booking_ref = metadata.get("booking_reference") or obj.get("client_reference_id")
            amount_cents = obj.get("amount_received") or obj.get("amount_total")
            amount_paid = float(amount_cents) / 100.0 if amount_cents else None

            booking, comm, points = await PaymentService._execute_atomic_payment_confirmation(
                db=db,
                provider="stripe",
                transaction_id=payload.id,
                booking_reference=booking_ref,
                amount_paid=amount_paid,
                gateway_payload=payload.model_dump(),
            )
            await payment_repo.record_webhook_log(
                provider="stripe",
                provider_transaction_id=payload.id,
                signature_verified=True,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="processed",
                client_ip=client_ip,
            )
            await db.commit()

            return WebhookResponse(
                success=True,
                message="Stripe payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.id,
                commission_credited=comm,
                loyalty_points_awarded=points,
            )
        else:
            return WebhookResponse(
                success=True,
                message=f"Stripe event {payload.type} received (no action needed)",
                status="ignored",
                transaction_id=payload.id,
            )

    @staticmethod
    async def process_card_webhook(
        db: AsyncSession,
        raw_body: bytes,
        signature: Optional[str],
        payload: CardWebhookPayload,
        client_ip: Optional[str] = None,
    ) -> WebhookResponse:
        """Card gateway (SSLCommerz / CyberSource) webhook with HMAC-SHA256."""
        payment_repo = PaymentRepository(db)
        payload_hash = hashlib.sha256(raw_body).hexdigest()
        idempotency_key = f"card:{payload.tran_id}:{payload.val_id or ''}"

        existing_log = await payment_repo.check_webhook_idempotency(idempotency_key)
        if existing_log and existing_log.status == "processed":
            return WebhookResponse(
                success=True,
                message="Duplicate card webhook ignored",
                status="completed",
                transaction_id=payload.val_id or payload.tran_id,
            )

        if not verify_card_webhook_signature(raw_body, signature):
            await payment_repo.record_webhook_log(
                provider="card",
                provider_transaction_id=payload.val_id or payload.tran_id,
                signature_verified=False,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="failed",
                error_message="Invalid card HMAC signature",
                client_ip=client_ip,
            )
            await db.commit()
            raise AuthenticationError("Invalid card webhook HMAC signature")

        if payload.status.upper() == "VALID":
            booking, comm, points = await PaymentService._execute_atomic_payment_confirmation(
                db=db,
                provider="card",
                transaction_id=payload.val_id or payload.tran_id,
                booking_reference=payload.tran_id,
                amount_paid=payload.amount,
                gateway_payload=payload.model_dump(),
            )
            await payment_repo.record_webhook_log(
                provider="card",
                provider_transaction_id=payload.val_id or payload.tran_id,
                signature_verified=True,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                status="processed",
                client_ip=client_ip,
            )
            await db.commit()

            return WebhookResponse(
                success=True,
                message="Card payment successfully verified and booking confirmed",
                booking_id=booking.id if booking else None,
                booking_reference=booking.booking_reference if booking else None,
                status="completed",
                transaction_id=payload.val_id or payload.tran_id,
                commission_credited=comm,
                loyalty_points_awarded=points,
            )
        else:
            return WebhookResponse(
                success=False,
                message=f"Card transaction status: {payload.status}",
                status=payload.status.lower(),
                transaction_id=payload.tran_id,
            )
