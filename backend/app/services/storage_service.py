"""
Cloudflare R2 Storage Service.
Generates secure PUT presigned URLs for avatars, KYC documents, and community media using boto3.
"""

import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional
import boto3
from botocore.config import Config

from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.schemas.storage import AllowedEntityType, PresignedUploadRequest, PresignedUploadResponse

logger = logging.getLogger(__name__)

# Security Policies: Allowed MIME types and max file sizes (in bytes) per entity type
ENTITY_POLICIES: Dict[AllowedEntityType, Dict[str, Any]] = {
    AllowedEntityType.AVATAR: {
        "allowed_mimes": ["image/jpeg", "image/png", "image/webp"],
        "max_size": 5 * 1024 * 1024,  # 5 MB
        "prefix": "avatars",
    },
    AllowedEntityType.KYC_DOCUMENT: {
        "allowed_mimes": ["image/jpeg", "image/png", "application/pdf"],
        "max_size": 15 * 1024 * 1024,  # 15 MB
        "prefix": "kyc-documents",
    },
    AllowedEntityType.COMMUNITY_MEDIA: {
        "allowed_mimes": [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/quicktime",
        ],
        "max_size": 50 * 1024 * 1024,  # 50 MB
        "prefix": "community",
    },
    AllowedEntityType.HOTEL_MEDIA: {
        "allowed_mimes": ["image/jpeg", "image/png", "image/webp"],
        "max_size": 20 * 1024 * 1024,  # 20 MB
        "prefix": "hotels",
    },
    AllowedEntityType.AGENCY_DOCUMENT: {
        "allowed_mimes": ["image/jpeg", "image/png", "application/pdf"],
        "max_size": 25 * 1024 * 1024,  # 25 MB
        "prefix": "agencies",
    },
}


class StorageService:

    @staticmethod
    def _get_s3_client():
        """Instantiate boto3 S3 client configured for Cloudflare R2 endpoint."""
        return boto3.client(
            service_name="s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID or "mock-key-id",
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY or "mock-secret-key",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
                retries={"max_attempts": 3, "mode": "standard"},
            ),
            region_name="auto",
        )

    @staticmethod
    def generate_presigned_upload_url(
        request: PresignedUploadRequest,
        user_id: uuid.UUID,
    ) -> PresignedUploadResponse:
        """
        Validate request and generate a pre-signed S3/R2 PUT URL for direct client upload.
        """
        policy = ENTITY_POLICIES.get(request.entity_type)
        if not policy:
            raise BadRequestError(f"Unsupported entity type '{request.entity_type}'")

        # 1. Validate MIME type
        mime = request.mime_type.lower()
        if mime not in policy["allowed_mimes"]:
            raise BadRequestError(
                f"MIME type '{mime}' is not permitted for {request.entity_type.value}. "
                f"Allowed types: {policy['allowed_mimes']}"
            )

        # 2. Validate File Size
        if request.size_bytes > policy["max_size"]:
            max_mb = policy["max_size"] // (1024 * 1024)
            raise BadRequestError(
                f"File size ({round(request.size_bytes / (1024 * 1024), 2)}MB) exceeds limit of {max_mb}MB for {request.entity_type.value}."
            )

        # 3. Construct clean file extension and unique object key
        ext = os.path.splitext(request.file_name)[1].lower().strip(".")
        if not ext:
            ext = mime.split("/")[-1]

        timestamp = int(time.time())
        random_suffix = uuid.uuid4().hex[:8]
        entity_path_segment = request.entity_id or str(user_id)
        key = f"{policy['prefix']}/{entity_path_segment}/{timestamp}-{random_suffix}.{ext}"

        # 4. Generate Presigned PUT URL
        expires_in = settings.R2_PRESIGNED_URL_EXPIRES_IN

        if not settings.R2_ACCESS_KEY_ID or not settings.R2_ACCOUNT_ID:
            # Local development fallback
            logger.warning("Cloudflare R2 credentials not configured. Generating mock presigned URL.")
            upload_url = f"https://mock-r2.shopnojatra.local/{settings.R2_BUCKET_NAME}/{key}?presigned=true"
        else:
            try:
                s3 = StorageService._get_s3_client()
                upload_url = s3.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={
                        "Bucket": settings.R2_BUCKET_NAME,
                        "Key": key,
                        "ContentType": mime,
                    },
                    ExpiresIn=expires_in,
                )
            except Exception as exc:
                logger.error(f"Failed to generate R2 presigned URL: {exc}", exc_info=True)
                raise BadRequestError("Could not generate presigned storage URL")

        # 5. Build public CDN URL
        if settings.R2_PUBLIC_DOMAIN:
            public_url = f"https://{settings.R2_PUBLIC_DOMAIN}/{key}"
        else:
            public_url = f"https://{settings.R2_BUCKET_NAME}.{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{key}"

        return PresignedUploadResponse(
            upload_url=upload_url,
            key=key,
            public_url=public_url,
            expires_in=expires_in,
            http_method="PUT",
            required_headers={"Content-Type": mime},
        )
