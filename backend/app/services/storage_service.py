"""
Cloudflare R2 Storage Service.
Generates secure S3 PUT and GET presigned URLs with strict MIME type restrictions and 5MB/10MB limits using boto3.
Supports private zero-trust document storage for Agency KYC with ephemeral 5-minute expiry.
"""

import io
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional
import boto3
from botocore.config import Config

from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.schemas.kyc import KYCPresignResponse
from app.schemas.storage import AllowedEntityType, PresignedUploadRequest, PresignedUploadResponse

logger = logging.getLogger(__name__)

# Security Policies derived directly from centralized enterprise configuration
def get_allowed_mimes() -> set[str]:
    return set(settings.ALLOWED_UPLOAD_MIME_TYPES)

def get_max_file_size() -> int:
    return settings.MAX_UPLOAD_SIZE_BYTES


class StorageService:
    # In-memory mock storage dictionary for local development / testing without live Cloudflare R2
    _mock_storage_bucket: Dict[str, bytes] = {}

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
        allowed_mimes = get_allowed_mimes()
        mime = request.mime_type.lower().strip()
        if mime not in allowed_mimes:
            raise BadRequestError(
                f"MIME type '{mime}' is not permitted. Allowed MIME types: {sorted(list(allowed_mimes))}"
            )

        max_bytes = get_max_file_size()
        if request.size_bytes > max_bytes:
            size_mb = round(request.size_bytes / (1024 * 1024), 2)
            limit_mb = round(max_bytes / (1024 * 1024), 2)
            raise BadRequestError(
                f"File size ({size_mb}MB) exceeds the maximum limit of {limit_mb}MB ({max_bytes} bytes)."
            )

        ext = os.path.splitext(request.file_name)[1].lower().strip(".")
        if not ext:
            ext = "pdf" if mime == "application/pdf" else "png" if "png" in mime else "jpg"

        timestamp = int(time.time())
        random_suffix = uuid.uuid4().hex[:8]
        entity_path_segment = request.entity_id or str(user_id)
        key = f"{request.entity_type.value}/{entity_path_segment}/{timestamp}-{random_suffix}.{ext}"

        expires_in = settings.R2_PRESIGNED_URL_EXPIRES_IN

        if not settings.R2_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID in ("mock-r2-access-key", "mock-key-id"):
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

    @staticmethod
    def generate_kyc_presigned_upload_url(
        agency_id: uuid.UUID,
        doc_type: str,
        file_name: str,
        mime_type: str,
        size_bytes: int,
    ) -> KYCPresignResponse:
        """
        Generates an ephemeral, private presigned S3/R2 PUT URL for Agency KYC verification.
        - Strict MIME whitelist (PDF, PNG, JPEG).
        - Strict size limit under configured limit (10MB).
        - Fixed 5-minute expiry (300 seconds).
        - Stored under private 'kyc/' path; NO permanent or public URL returned.
        """
        # 1. Validate MIME
        allowed_mimes = set(settings.KYC_ALLOWED_MIME_TYPES)
        clean_mime = mime_type.lower().strip()
        if clean_mime not in allowed_mimes:
            raise BadRequestError(
                f"MIME type '{clean_mime}' is not permitted. Permitted types for KYC: {sorted(list(allowed_mimes))}"
            )

        # 2. Validate Size
        max_bytes = settings.KYC_MAX_UPLOAD_SIZE_BYTES
        if size_bytes > max_bytes:
            size_mb = round(size_bytes / (1024 * 1024), 2)
            limit_mb = round(max_bytes / (1024 * 1024), 2)
            raise BadRequestError(
                f"Document size ({size_mb}MB) exceeds the maximum allowed limit of {limit_mb}MB ({max_bytes} bytes)."
            )

        # 3. Clean extension and build private key
        ext = os.path.splitext(file_name)[1].lower().strip(".")
        if not ext:
            ext = "pdf" if clean_mime == "application/pdf" else "png" if "png" in clean_mime else "jpg"

        timestamp = int(time.time())
        rand_id = uuid.uuid4().hex[:8]
        key = f"kyc/{agency_id}/{doc_type}-{timestamp}-{rand_id}.{ext}"

        # 4. Enforce 5-minute expiry
        expires_in = settings.KYC_PRESIGNED_URL_EXPIRES_IN  # 300 seconds

        if not settings.R2_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID in ("mock-r2-access-key", "mock-key-id"):
            logger.info(f"Generating mock KYC presigned PUT URL for key '{key}' (expires_in={expires_in}s)")
            upload_url = f"https://mock-r2.shopnojatra.local/{settings.R2_BUCKET_NAME}/{key}?presigned=true&expires={expires_in}"
        else:
            try:
                s3 = StorageService._get_s3_client()
                upload_url = s3.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={
                        "Bucket": settings.R2_BUCKET_NAME,
                        "Key": key,
                        "ContentType": clean_mime,
                    },
                    ExpiresIn=expires_in,
                )
            except Exception as exc:
                logger.error(f"Failed to generate R2 KYC presigned URL: {exc}", exc_info=True)
                raise BadRequestError("Could not generate KYC presigned upload URL")

        return KYCPresignResponse(
            upload_url=upload_url,
            key=key,
            expires_in=expires_in,
            mime_type=clean_mime,
            size_bytes=size_bytes,
            http_method="PUT",
            required_headers={"Content-Type": clean_mime},
        )

    @staticmethod
    def generate_presigned_download_url(key: str, expires_in: int = 300) -> str:
        """
        Generates an ephemeral presigned GET URL with strict 5-minute expiry (300 seconds).
        Guarantees zero permanent or public document URLs for sensitive KYC documents.
        """
        # Always enforce max 300s expiry for security
        clamped_expiry = min(expires_in, 300)

        if not settings.R2_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID in ("mock-r2-access-key", "mock-key-id"):
            return f"https://mock-r2.shopnojatra.local/{settings.R2_BUCKET_NAME}/{key}?token={uuid.uuid4().hex}&expires_in={clamped_expiry}"

        try:
            s3 = StorageService._get_s3_client()
            download_url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": settings.R2_BUCKET_NAME,
                    "Key": key,
                },
                ExpiresIn=clamped_expiry,
            )
            return download_url
        except Exception as exc:
            logger.error(f"Failed to generate presigned download URL for key '{key}': {exc}", exc_info=True)
            raise BadRequestError("Could not generate presigned document download URL")

    @staticmethod
    def download_file_bytes(key: str) -> bytes:
        """
        Fetch raw bytes for a stored object from R2.
        Used by Celery workers for server-side AI vision analysis.
        """
        if key in StorageService._mock_storage_bucket:
            return StorageService._mock_storage_bucket[key]

        if not settings.R2_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID in ("mock-r2-access-key", "mock-key-id"):
            # Return dummy bytes for mock environment
            return b"%PDF-1.4 Mock document bytes for testing KYC verification"

        try:
            s3 = StorageService._get_s3_client()
            response = s3.get_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
            return response["Body"].read()
        except Exception as exc:
            logger.error(f"Failed to download object '{key}' from R2: {exc}", exc_info=True)
            raise BadRequestError(f"Failed to retrieve document bytes for key: {key}")
