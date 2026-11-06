"""
Payment Gateways and Webhook Processing Endpoints.
Enforces strict HMAC-SHA256 signature verification, idempotency replay protection,
and atomic multi-ledger database updates.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import BadRequestError
from app.core.rate_limit import get_client_ip
from app.schemas.common import StandardResponse
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
from app.schemas.user import CurrentUser
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments & Webhooks"])


@router.post("/initiate", response_model=StandardResponse[PaymentResponse], status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    request: PaymentInitiateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initialize a pending payment transaction.
    Verifies single-use cryptographic nonce if supplied to prevent replay attacks.
    """
    payment = await PaymentService.initiate_payment(
        db=db,
        user_id=current_user.id,
        request=request,
    )
    return StandardResponse[PaymentResponse](
        success=True,
        message="Payment initiated successfully",
        data=payment,
    )


@router.post("/webhook/bkash", response_model=WebhookResponse)
async def bkash_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_bkash_signature: Optional[str] = Header(None, alias="X-bKash-Signature"),
    signature: Optional[str] = Header(None, alias="Signature"),
):
    """
    Dedicated bKash Webhook Callback Endpoint.
    Validates HMAC-SHA256 signature on raw payload and atomically updates booking, commission & loyalty.
    """
    raw_body = await request.body()
    sig = x_bkash_signature or signature

    try:
        data = json.loads(raw_body)
        payload = BkashWebhookPayload(**data)
    except Exception as exc:
        raise BadRequestError(f"Malformed bKash webhook JSON: {exc}")

    client_ip = get_client_ip(request)
    return await PaymentService.process_bkash_webhook(
        db=db,
        raw_body=raw_body,
        signature=sig,
        payload=payload,
        client_ip=client_ip,
    )


@router.post("/webhook/nagad", response_model=WebhookResponse)
async def nagad_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_nagad_signature: Optional[str] = Header(None, alias="X-KM-Signature"),
    signature: Optional[str] = Header(None, alias="Signature"),
):
    """
    Dedicated Nagad Webhook Callback Endpoint.
    Validates HMAC-SHA256 signature on raw payload and atomically updates booking, commission & loyalty.
    """
    raw_body = await request.body()
    sig = x_nagad_signature or signature

    try:
        data = json.loads(raw_body)
        payload = NagadWebhookPayload(**data)
    except Exception as exc:
        raise BadRequestError(f"Malformed Nagad webhook JSON: {exc}")

    client_ip = get_client_ip(request)
    return await PaymentService.process_nagad_webhook(
        db=db,
        raw_body=raw_body,
        signature=sig,
        payload=payload,
        client_ip=client_ip,
    )


@router.post("/webhook/rocket", response_model=WebhookResponse)
async def rocket_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_rocket_signature: Optional[str] = Header(None, alias="X-Rocket-Signature"),
    signature: Optional[str] = Header(None, alias="Signature"),
):
    """
    Dedicated DBBL Rocket Webhook Callback Endpoint.
    Validates HMAC-SHA256 signature on raw payload and atomically updates booking, commission & loyalty.
    """
    raw_body = await request.body()
    sig = x_rocket_signature or signature

    try:
        data = json.loads(raw_body)
        payload = RocketWebhookPayload(**data)
    except Exception as exc:
        raise BadRequestError(f"Malformed Rocket webhook JSON: {exc}")

    client_ip = get_client_ip(request)
    return await PaymentService.process_rocket_webhook(
        db=db,
        raw_body=raw_body,
        signature=sig,
        payload=payload,
        client_ip=client_ip,
    )


@router.post("/webhook/stripe", response_model=WebhookResponse)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    """
    Dedicated Stripe Webhook Callback Endpoint.
    Validates HMAC-SHA256 signature on raw payload and atomically updates booking, commission & loyalty.
    """
    raw_body = await request.body()

    try:
        data = json.loads(raw_body)
        payload = StripeWebhookPayload(**data)
    except Exception as exc:
        raise BadRequestError(f"Malformed Stripe webhook JSON: {exc}")

    client_ip = get_client_ip(request)
    return await PaymentService.process_stripe_webhook(
        db=db,
        raw_body=raw_body,
        signature=stripe_signature,
        payload=payload,
        client_ip=client_ip,
    )


@router.post("/webhook/card", response_model=WebhookResponse)
async def card_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_card_signature: Optional[str] = Header(None, alias="X-Signature"),
    signature: Optional[str] = Header(None, alias="Signature"),
):
    """
    Dedicated Card / SSLCommerz Payment Webhook Endpoint.
    Validates HMAC-SHA256 signature on raw payload and atomically updates booking, commission & loyalty.
    """
    raw_body = await request.body()
    sig = x_card_signature or signature

    try:
        data = json.loads(raw_body)
        payload = CardWebhookPayload(**data)
    except Exception as exc:
        raise BadRequestError(f"Malformed Card webhook JSON: {exc}")

    client_ip = get_client_ip(request)
    return await PaymentService.process_card_webhook(
        db=db,
        raw_body=raw_body,
        signature=sig,
        payload=payload,
        client_ip=client_ip,
    )
