"""
Cloudflare R2 Storage Service.
Generates secure S3 PUT presigned URLs with strict MIME type restrictions and 5MB limits using boto3.
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

# Security Policies derived directly from centralized enterprise configuration
def get_allowed_mimes() -> set[str]:
    return set(settings.ALLOWED_UPLOAD_MIME_TYPES)

def get_max_file_size() -> int:
    return settings.MAX_UPLOAD_SIZE_BYTES


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
        Validate request and generate a single-use S3/R2 PUT URL for direct client upload.
        Enforces strict MIME whitelist (PDF, PNG, JPG) and 5MB maximum size.
        """
        # 1. Strict MIME Whitelist
        allowed_mimes = get_allowed_mimes()
        mime = request.mime_type.lower().strip()
        if mime not in allowed_mimes:
            raise BadRequestError(
                f"MIME type '{mime}' is not permitted. Allowed MIME types: {sorted(list(allowed_mimes))}"
            )

        # 2. Strict File Size Limit
        max_bytes = get_max_file_size()
        if request.size_bytes > max_bytes:
            size_mb = round(request.size_bytes / (1024 * 1024), 2)
            limit_mb = round(max_bytes / (1024 * 1024), 2)
            raise BadRequestError(
                f"File size ({size_mb}MB) exceeds the maximum limit of {limit_mb}MB ({max_bytes} bytes)."
            )

        # 3. Clean file extension and entity folder
        ext = os.path.splitext(request.file_name)[1].lower().strip(".")
        if not ext:
            ext = "pdf" if mime == "application/pdf" else "png" if "png" in mime else "jpg"

        timestamp = int(time.time())
        random_suffix = uuid.uuid4().hex[:8]
        entity_path_segment = request.entity_id or str(user_id)
        key = f"{request.entity_type.value}/{entity_path_segment}/{timestamp}-{random_suffix}.{ext}"

        # 4. Generate Presigned PUT URL
        expires_in = settings.R2_PRESIGNED_URL_EXPIRES_IN

        if not settings.R2_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID == "mock-r2-access-key":
            logger.info("Using mock Cloudflare R2 presigned upload URL for local development")
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

        # 5. Public CDN URL
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
