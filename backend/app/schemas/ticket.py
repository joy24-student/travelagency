"""
Pydantic Schemas for Offline-Capable E-Tickets and Scanner Verification.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TicketPayload(BaseModel):
    ticket_id: str
    booking_id: str
    passenger_name: str
    service_type: str
    valid_from: str
    valid_to: str
    seat: Optional[str] = None


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    passenger_name: str
    service_type: str
    valid_from: datetime
    valid_to: datetime
    seat: Optional[str] = None
    status: str
    signature: str
    created_at: datetime
    qr_payload: str = Field(description="Deterministic JSON QR string for offline scanning")


class TicketScanItem(BaseModel):
    id: uuid.UUID = Field(description="Client-generated unique scan ID for idempotency")
    ticket_id: uuid.UUID
    scanner_device_id: Optional[str] = None
    result: str = Field(description="'valid', 'invalid', 'used', 'expired', 'revoked'")
    scanned_at: datetime


class ScanBatchRequest(BaseModel):
    scans: List[TicketScanItem]


class ProcessedScanResult(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    result: str
    status: str  # 'processed', 'duplicate', 'rejected'
    detail: Optional[str] = None


class ScanBatchResponse(BaseModel):
    success: bool
    processed_count: int
    results: List[ProcessedScanResult]
    synced_at: datetime


class RevocationItem(BaseModel):
    ticket_id: uuid.UUID
    status: str  # 'revoked', 'used', 'expired'
    updated_at: datetime


class RevocationListResponse(BaseModel):
    success: bool
    revocations: List[RevocationItem]
    synced_at: datetime
