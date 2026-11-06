"""
Payment Webhook Payloads and Responses for bKash, Nagad, Rocket, Stripe, and Cards.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class PaymentInitiateRequest(BaseModel):
    booking_id: Optional[uuid.UUID] = None
    amount: float = Field(..., gt=0, description="Payment amount in selected currency")
    currency: str = Field("BDT", description="BDT, USD, etc.")
    method: str = Field(..., description="bkash, nagad, rocket, stripe, card, wallet")
    phone: Optional[str] = Field(None, description="MSISDN for mobile financial services")
    email: Optional[str] = None
    reference: Optional[str] = None
    nonce: Optional[str] = Field(None, min_length=16, description="Cryptographic single-use nonce")
    timestamp_ms: Optional[int] = Field(None, description="Client request timestamp in milliseconds")


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: float
    currency: str
    method: str
    status: str
    transaction_id: Optional[str] = None
    reference: Optional[str] = None
    redirect_url: Optional[str] = None


class BkashWebhookPayload(BaseModel):
    paymentID: str = Field(..., description="bKash assigned unique payment identifier")
    trxID: Optional[str] = Field(None, description="bKash ledger transaction reference")
    amount: Optional[str] = None
    currency: Optional[str] = "BDT"
    transactionStatus: Optional[str] = Field(None, description="Completed, Initiated, Failed")
    merchantInvoiceNumber: Optional[str] = Field(None, description="Booking reference code")


class NagadWebhookPayload(BaseModel):
    merchantId: Optional[str] = None
    orderId: str = Field(..., description="Merchant order / booking reference")
    paymentRefId: Optional[str] = Field(None, description="Nagad transaction reference")
    amount: Optional[str] = None
    status: Optional[str] = Field(None, description="Success, Failed, Aborted")
    statusCode: Optional[str] = None
    message: Optional[str] = None


class RocketWebhookPayload(BaseModel):
    rocketTransactionId: str = Field(..., description="DBBL Rocket transaction ID")
    invoiceNumber: str = Field(..., description="Merchant booking reference")
    amount: Optional[float] = None
    currency: Optional[str] = "BDT"
    status: Optional[str] = Field("SUCCESS", description="SUCCESS, FAILED")
    senderAccount: Optional[str] = None


class StripeWebhookPayload(BaseModel):
    id: str = Field(..., description="Stripe event ID (evt_xxx)")
    type: str = Field(..., description="payment_intent.succeeded, checkout.session.completed")
    data: Dict[str, Any] = Field(default_factory=dict)


class CardWebhookPayload(BaseModel):
    tran_id: str = Field(..., description="Merchant transaction ID / booking reference")
    val_id: Optional[str] = Field(None, description="Card gateway bank validation ID")
    amount: Optional[float] = None
    card_type: Optional[str] = None
    status: str = Field(..., description="VALID, FAILED, CANCELLED")
    bank_tran_id: Optional[str] = None


class WebhookResponse(BaseModel):
    success: bool
    message: str
    booking_id: Optional[uuid.UUID] = None
    booking_reference: Optional[str] = None
    status: str
    transaction_id: Optional[str] = None
    commission_credited: Optional[float] = None
    loyalty_points_awarded: Optional[float] = None
