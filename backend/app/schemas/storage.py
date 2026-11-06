"""
Pydantic v2 schemas for Cloudflare R2 presigned upload URLs.
"""

from enum import Enum
from typing import Dict, Optional
from pydantic import Field

from app.schemas.common import BaseSchema


class AllowedEntityType(str, Enum):
    AVATAR = "avatar"
    KYC_DOCUMENT = "kyc_document"
    COMMUNITY_MEDIA = "community_media"
    HOTEL_MEDIA = "hotel_media"
    AGENCY_DOCUMENT = "agency_document"


class PresignedUploadRequest(BaseSchema):
    file_name: str = Field(..., min_length=1, description="Original filename (e.g. passport.pdf, profile.jpg)")
    mime_type: str = Field(..., description="MIME content type (e.g. image/jpeg, image/png, application/pdf, video/mp4)")
    size_bytes: int = Field(..., ge=1, description="File size in bytes")
    entity_type: AllowedEntityType = Field(..., description="Target category for authorization and pathing")
    entity_id: Optional[str] = Field(None, description="Optional entity ID (e.g., hotel ID, post ID, or user ID)")


class PresignedUploadResponse(BaseSchema):
    upload_url: str = Field(..., description="Direct pre-signed PUT URL for Cloudflare R2")
    key: str = Field(..., description="R2 storage object key path")
    public_url: str = Field(..., description="Public CDN access URL once upload completes")
    expires_in: int = Field(..., description="URL validity in seconds")
    http_method: str = Field(default="PUT", description="HTTP verb required for the client upload request")
    required_headers: Dict[str, str] = Field(default_factory=dict, description="Headers that MUST be sent with PUT")
