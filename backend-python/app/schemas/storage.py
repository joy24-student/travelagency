"""
Storage Schemas for Cloudflare R2 / S3 Presigned Uploads.
"""

from enum import Enum
from typing import Dict, Optional
from pydantic import BaseModel, Field


class AllowedEntityType(str, Enum):
    AVATAR = "avatar"
    KYC_DOCUMENT = "kyc_document"
    COMMUNITY_MEDIA = "community_media"
    HOTEL_MEDIA = "hotel_media"
    AGENCY_DOCUMENT = "agency_document"
    TICKET_ATTACHMENT = "ticket_attachment"


class PresignedUploadRequest(BaseModel):
    file_name: str = Field(..., description="Original filename with extension (e.g. passport.pdf, avatar.png)")
    mime_type: str = Field(..., description="Strict MIME type: image/jpeg, image/png, application/pdf")
    size_bytes: int = Field(..., gt=0, le=5 * 1024 * 1024, description="File size in bytes (strict 5MB max limit)")
    entity_type: AllowedEntityType = Field(default=AllowedEntityType.AVATAR, description="Target entity category")
    entity_id: Optional[str] = Field(None, description="Optional entity UUID to organize folder structure")


class PresignedUploadResponse(BaseModel):
    upload_url: str = Field(..., description="Single-use pre-signed S3/R2 PUT URL")
    key: str = Field(..., description="Unique S3 object key")
    public_url: str = Field(..., description="Public CDN distribution URL")
    expires_in: int = Field(..., description="Pre-signed URL validity in seconds")
    http_method: str = "PUT"
    required_headers: Dict[str, str] = Field(default_factory=dict)
