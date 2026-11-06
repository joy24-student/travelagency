"""
Cloudflare R2 Storage and Presigned Upload URL Endpoints.
"""

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.common import StandardResponse
from app.schemas.storage import PresignedUploadRequest, PresignedUploadResponse
from app.schemas.user import CurrentUser
from app.services.storage_service import StorageService

router = APIRouter(prefix="/storage", tags=["Storage & Media"])


@router.post(
    "/presigned-upload",
    response_model=StandardResponse[PresignedUploadResponse],
    status_code=status.HTTP_200_OK,
)
async def generate_presigned_upload_url(
    request: PresignedUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generate single-use S3/Cloudflare R2 PUT presigned upload URL.
    Enforces strict MIME whitelist (PDF, PNG, JPG) and 5MB maximum file size.
    """
    response = StorageService.generate_presigned_upload_url(
        request=request,
        user_id=current_user.id,
    )
    return StandardResponse[PresignedUploadResponse](
        success=True,
        message="Presigned upload URL generated successfully",
        data=response,
    )
