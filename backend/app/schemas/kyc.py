"""
Pydantic Schemas for Agency KYC Verification System.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


class KYCStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    NEEDS_CHANGES = "needs_changes"
    VERIFIED = "verified"
    REJECTED = "rejected"


class KYCDocType(str, Enum):
    TRADE_LICENCE = "trade_licence"
    TIN = "tin"
    OWNER_ID = "owner_id"
    ADDRESS_PROOF = "address_proof"


class KYCCheckResult(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


class KYCPresignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doc_type: KYCDocType = Field(..., description="Document category")
    file_name: str = Field(..., min_length=1, max_length=255, description="Original filename with extension")
    mime_type: str = Field(..., description="MIME type (pdf, png, jpeg)")
    size_bytes: int = Field(..., gt=0, description="File size in bytes")

    @field_validator("mime_type")
    @classmethod
    def validate_mime(cls, v: str) -> str:
        clean = v.lower().strip()
        allowed = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
        if clean not in allowed:
            raise ValueError(f"MIME type '{clean}' not permitted. Must be one of: {sorted(list(allowed))}")
        return clean


class KYCPresignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    upload_url: str = Field(..., description="Presigned S3/R2 PUT URL valid for 5 minutes")
    key: str = Field(..., description="Private R2 storage key")
    expires_in: int = Field(300, description="URL validity in seconds (5 minutes)")
    mime_type: str
    size_bytes: int
    http_method: str = "PUT"
    required_headers: Dict[str, str] = Field(default_factory=dict)


class KYCDocumentSubmitItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doc_type: KYCDocType
    r2_key: str = Field(..., min_length=5, description="Storage key returned from presign endpoint")
    mime: str
    size_bytes: int = Field(..., gt=0)
    sha256: str = Field(..., min_length=64, max_length=64, description="Hex-encoded SHA-256 digest")
    expires_on: Optional[date] = Field(None, description="Expiration date if stated on document")


class KYCSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    documents: List[KYCDocumentSubmitItem] = Field(..., min_length=1, description="Uploaded document items")

    @field_validator("documents")
    @classmethod
    def validate_doc_types(cls, docs: List[KYCDocumentSubmitItem]) -> List[KYCDocumentSubmitItem]:
        seen = set()
        for doc in docs:
            if doc.doc_type in seen:
                raise ValueError(f"Duplicate document type in submission: {doc.doc_type.value}")
            seen.add(doc.doc_type)
        return docs


class KYCCheckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    check_name: str
    result: KYCCheckResult
    detail: Optional[str] = None
    created_at: datetime


class KYCDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    submission_id: uuid.UUID
    doc_type: KYCDocType
    r2_key: str
    download_url: Optional[str] = Field(None, description="Time-limited presigned GET URL (5 minutes)")
    mime: str
    size_bytes: int
    sha256: str
    expires_on: Optional[date] = None
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    checks: List[KYCCheckResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class KYCAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    submission_id: uuid.UUID
    actor_id: Optional[uuid.UUID] = None
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime


class KYCSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agency_id: uuid.UUID
    agency_name: Optional[str] = None
    status: KYCStatus
    submitted_at: Optional[datetime] = None
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    decision_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    documents: List[KYCDocumentResponse] = Field(default_factory=list)
    audit_logs: List[KYCAuditLogResponse] = Field(default_factory=list)


class KYCQueueItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agency_id: uuid.UUID
    agency_name: str
    status: KYCStatus
    submitted_at: Optional[datetime] = None
    documents_count: int
    created_at: datetime


class KYCAdminApproveRequest(BaseModel):
    note: Optional[str] = Field(None, description="Optional administrative approval note")


class KYCAdminRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory decision reason for rejecting submission")

    @field_validator("reason")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed or len(trimmed) < 3:
            raise ValueError("Decision reason is mandatory and cannot be empty or whitespace.")
        return trimmed


class KYCAdminRequestChangesRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory instructions and reasons for requested changes")

    @field_validator("reason")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed or len(trimmed) < 3:
            raise ValueError("Reason for requested changes is mandatory and cannot be empty or whitespace.")
        return trimmed
