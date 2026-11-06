"""
Pydantic v2 schemas for Payments and Gateway Webhook callbacks (bKash & Nagad).
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema


class PaymentInitiateRequest(BaseSchema):
    booking_id: Optional[uuid.UUID] = Field(None, description="Associated booking ID")
    amount: float = Field(..., gt=0, description="Payment amount in specified currency")
    currency: str = Field(default="BDT", description="Currency code (e.g. BDT, USD)")
    method: str = Field(..., description="bkash, nagad, google_pay, card, wallet")
    phone: Optional[str] = Field(None, description="Payer phone number")
    email: Optional[EmailStr] = Field(None, description="Payer email address")
    reference: Optional[str] = Field(None, description="User invoice or reference tag")


class PaymentResponse(BaseSchema):
    payment_id: uuid.UUID
    booking_id: Optional[uuid.UUID] = None
    amount: float
    currency: str
    method: str
    status: str
    transaction_id: Optional[str] = None
    payment_url: Optional[str] = None
    created_at: datetime


class BkashWebhookPayload(BaseSchema):
    """Payload sent by bKash tokenized payment callback/webhook."""
    paymentID: str
    trxID: Optional[str] = None
    amount: Optional[str] = None
    transactionStatus: Optional[str] = None  # "Completed", "Initiated", "Failed", "Cancelled"
    merchantInvoiceNumber: Optional[str] = None  # Maps to booking_reference or payment_id
    intent: Optional[str] = None
    currency: Optional[str] = "BDT"
    customerMsisdn: Optional[str] = None


class NagadWebhookPayload(BaseSchema):
    """Payload sent by Nagad payment callback/webhook."""
    merchantId: Optional[str] = None
    orderId: str  # Maps to booking_reference or payment_id
    paymentRefId: Optional[str] = None  # Nagad transaction reference
    amount: Optional[str] = None
    status: Optional[str] = None  # "Success", "Failed", "Aborted"
    statusCode: Optional[str] = None
    message: Optional[str] = None
    issuerPaymentDateTime: Optional[str] = None


class WebhookResponse(BaseSchema):
    success: bool = True
    message: str
    booking_id: Optional[uuid.UUID] = None
    booking_reference: Optional[str] = None
    status: str
    transaction_id: Optional[str] = None
