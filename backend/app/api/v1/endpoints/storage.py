"""
Cloudflare R2 Storage API Endpoints for Secure Presigned PUT Uploads.
"""

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.storage import PresignedUploadRequest, PresignedUploadResponse
from app.schemas.user import CurrentUser
from app.services.storage_service import StorageService

router = APIRouter(prefix="/storage", tags=["Storage & Media Uploads"])


@router.post(
    "/upload-url",
    response_model=PresignedUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Cloudflare R2 Presigned PUT Upload URL",
)
async def generate_upload_url(
    request: PresignedUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> PresignedUploadResponse:
    """
    Validates file MIME types, file size limits, and entity permissions, then
    generates a secure S3-compatible presigned PUT URL for Cloudflare R2.
    Allows React Native clients to upload avatars, KYC docs, and community media
    directly to Cloudflare R2 without passing heavy binaries through the application server.
    """
    response = StorageService.generate_presigned_upload_url(
        request=request,
        user_id=current_user.id,
    )
    return response
