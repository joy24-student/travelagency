"""
Payment Gateway and Webhook Endpoints for bKash and Nagad with HMAC-SHA256 validation.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.schemas.payment import (
    BkashWebhookPayload,
    NagadWebhookPayload,
    PaymentInitiateRequest,
    PaymentResponse,
    WebhookResponse,
)
from app.schemas.user import CurrentUser
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments & Webhooks"])


@router.post(
    "/create",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Online Payment",
)
async def create_payment(
    request: PaymentInitiateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    """Initialize a payment record for bKash, Nagad, Card, or Wallet."""
    payment = await PaymentService.initiate_payment(
        db=db,
        user_id=current_user.id,
        request=request,
    )
    return PaymentResponse(
        payment_id=payment.id,
        booking_id=request.booking_id,
        amount=payment.amount,
        currency=payment.currency,
        method=payment.method,
        status=payment.status,
        transaction_id=payment.transaction_id,
        payment_url=f"https://checkout.shopnojatra.com/pay/{payment.id}",
        created_at=payment.created_at,
    )


@router.post(
    "/webhook/bkash",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="bKash Payment Callback / Webhook",
)
async def bkash_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    signature: Optional[str] = Header(None, alias="Signature"),
    db: AsyncSession = Depends(get_db),
) -> WebhookResponse:
    """
    Validates HMAC-SHA256 signature from bKash payment gateway.
    When verified and completed, atomically transitions booking to 'confirmed' status.
    """
    raw_body = await request.body()
    json_data = await request.json()
    payload = BkashWebhookPayload.model_validate(json_data)

    sig = x_signature or signature

    result = await PaymentService.process_bkash_webhook(
        db=db,
        raw_body=raw_body,
        signature=sig,
        payload=payload,
    )
    return result


@router.post(
    "/webhook/nagad",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="Nagad Payment Callback / Webhook",
)
async def nagad_webhook(
    request: Request,
    x_km_signature: Optional[str] = Header(None, alias="X-KM-Signature"),
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    signature: Optional[str] = Header(None, alias="Signature"),
    db: AsyncSession = Depends(get_db),
) -> WebhookResponse:
    """
    Validates HMAC-SHA256 signature from Nagad payment gateway.
    When verified and successful, atomically transitions booking to 'confirmed' status.
    """
    raw_body = await request.body()
    json_data = await request.json()
    payload = NagadWebhookPayload.model_validate(json_data)

    sig = x_km_signature or x_signature or signature

    result = await PaymentService.process_nagad_webhook(
        db=db,
        raw_body=raw_body,
        signature=sig,
        payload=payload,
    )
    return result
