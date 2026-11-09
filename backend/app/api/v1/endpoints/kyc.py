"""
Agency KYC Verification Endpoints.
Provides presigned S3/R2 PUT URLs with 5-minute expiry, submission handling,
and administrator review queue with side-by-side verification and mandatory audit logging.
"""

import logging
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin, require_agency
from app.core.exceptions import BadRequestError, PermissionDeniedError
from app.schemas.common import StandardResponse
from app.schemas.kyc import (
    KYCAdminApproveRequest,
    KYCAdminRejectRequest,
    KYCAdminRequestChangesRequest,
    KYCQueueItemResponse,
    KYCPresignRequest,
    KYCPresignResponse,
    KYCSubmissionResponse,
    KYCSubmitRequest,
)
from app.schemas.user import CurrentUser
from app.services.kyc_service import KYCService

router = APIRouter(prefix="/kyc", tags=["Agency KYC & Verification"])
logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# 1. AGENCY ENDPOINTS
# -----------------------------------------------------------------------------

@router.post(
    "/documents/presign",
    response_model=StandardResponse[KYCPresignResponse],
    status_code=status.HTTP_200_OK,
)
async def presign_kyc_document(
    request: KYCPresignRequest,
    current_user: CurrentUser = Depends(require_agency),
):
    """
    Generate an ephemeral presigned PUT URL for direct client upload of KYC documents to R2.
    - Validates MIME type whitelist: application/pdf, image/png, image/jpeg.
    - Validates file size under configured limit (10MB).
    - Returns single-use S3 PUT URL with strictly enforced 5-minute expiry.
    - Never returns a permanent or public URL.
    """
    if not current_user.agency_id:
        raise PermissionDeniedError("Authenticated user is not linked to an agency")

    presign_res = KYCService.generate_upload_presign(
        agency_id=current_user.agency_id,
        user_id=current_user.id,
        request=request,
    )

    return StandardResponse[KYCPresignResponse](
        success=True,
        message="Ephemeral presigned upload URL generated (valid for 5 minutes)",
        data=presign_res,
    )


@router.post(
    "/submit",
    response_model=StandardResponse[KYCSubmissionResponse],
    status_code=status.HTTP_201_CREATED,
)
async def submit_kyc_documents(
    request: KYCSubmitRequest,
    current_user: CurrentUser = Depends(require_agency),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit agency KYC documents for verification review.
    Validates all 4 required document types:
    - Trade Licence (trade_licence)
    - Tax Identification Number (tin)
    - Owner/Director ID (owner_id)
    - Office Address Proof (address_proof)
    Transitions submission status to 'submitted', writes immutable audit log,
    and enqueues background Celery vision & rule check analysis.
    """
    if not current_user.agency_id:
        raise PermissionDeniedError("Authenticated user is not linked to an agency")

    submission = await KYCService.submit_kyc(
        db=db,
        agency_id=current_user.agency_id,
        user_id=current_user.id,
        request=request,
    )

    return StandardResponse[KYCSubmissionResponse](
        success=True,
        message="KYC documents submitted successfully. Verification review initiated.",
        data=submission,
    )


@router.get(
    "/my-submission",
    response_model=StandardResponse[Optional[KYCSubmissionResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_my_submission(
    current_user: CurrentUser = Depends(require_agency),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve current agency KYC verification status, uploaded document metadata,
    extracted compliance checks, and feedback reason if changes were requested.
    Includes ephemeral 5-minute presigned GET URLs for document previews.
    """
    if not current_user.agency_id:
        raise PermissionDeniedError("Authenticated user is not linked to an agency")

    submission = await KYCService.get_agency_submission(
        db=db,
        agency_id=current_user.agency_id,
    )

    return StandardResponse[Optional[KYCSubmissionResponse]](
        success=True,
        message="Retrieved agency KYC status",
        data=submission,
    )


# -----------------------------------------------------------------------------
# 2. ADMINISTRATOR ENDPOINTS (Human-in-the-Loop Review Queue)
# -----------------------------------------------------------------------------

@router.get(
    "/admin/queue",
    response_model=StandardResponse[List[KYCQueueItemResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_admin_kyc_queue(
    status_filter: Optional[List[str]] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrator endpoint: List pending KYC submissions queue.
    Strictly ordered by OLDEST submitted_at first to enforce fair FIFO SLA processing.
    """
    queue = await KYCService.get_admin_queue(db=db, status_filter=status_filter)
    return StandardResponse[List[KYCQueueItemResponse]](
        success=True,
        message=f"Retrieved {len(queue)} submissions in admin verification queue",
        data=queue,
    )


@router.get(
    "/admin/submissions/{submission_id}",
    response_model=StandardResponse[KYCSubmissionResponse],
    status_code=status.HTTP_200_OK,
)
async def get_admin_submission_detail(
    submission_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrator endpoint: Get detailed submission data for side-by-side inspection.
    Returns:
    - Agency metadata
    - Documents with ephemeral 5-minute presigned GET URLs
    - AI vision extracted fields (owner ID redacted where appropriate)
    - Color-coded automated rule checks (pass/warn/fail)
    - Complete audit log trail
    """
    detail = await KYCService.get_submission_detail_by_id(db=db, submission_id=submission_id)
    return StandardResponse[KYCSubmissionResponse](
        success=True,
        message="Retrieved submission detail for administrative review",
        data=detail,
    )


@router.post(
    "/admin/submissions/{submission_id}/approve",
    response_model=StandardResponse[KYCSubmissionResponse],
    status_code=status.HTTP_200_OK,
)
async def admin_approve_submission(
    submission_id: uuid.UUID,
    request: KYCAdminApproveRequest = KYCAdminApproveRequest(),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrator endpoint: Approve agency KYC.
    Transitions status to 'verified', updates agency.verified_at, agency.verified_by,
    unblocks ledger payouts, and appends an immutable audit entry to kyc_audit_log.
    """
    approved = await KYCService.admin_approve(
        db=db,
        submission_id=submission_id,
        admin_user=current_user,
        request=request,
    )
    return StandardResponse[KYCSubmissionResponse](
        success=True,
        message="Agency KYC approved successfully. Verified status activated.",
        data=approved,
    )


@router.post(
    "/admin/submissions/{submission_id}/reject",
    response_model=StandardResponse[KYCSubmissionResponse],
    status_code=status.HTTP_200_OK,
)
async def admin_reject_submission(
    submission_id: uuid.UUID,
    request: KYCAdminRejectRequest,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrator endpoint: Reject agency KYC.
    Decision reason is strictly mandatory.
    Transitions status to 'rejected', updates agency.verification_status,
    and appends an immutable audit entry to kyc_audit_log.
    """
    rejected = await KYCService.admin_reject(
        db=db,
        submission_id=submission_id,
        admin_user=current_user,
        request=request,
    )
    return StandardResponse[KYCSubmissionResponse](
        success=True,
        message="Agency KYC submission rejected.",
        data=rejected,
    )


@router.post(
    "/admin/submissions/{submission_id}/request-changes",
    response_model=StandardResponse[KYCSubmissionResponse],
    status_code=status.HTTP_200_OK,
)
async def admin_request_changes_submission(
    submission_id: uuid.UUID,
    request: KYCAdminRequestChangesRequest,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrator endpoint: Request changes on agency KYC submission.
    Detailed feedback reason is strictly mandatory.
    Transitions status to 'needs_changes', permitting agency to re-upload and resubmit.
    Appends an immutable audit entry to kyc_audit_log.
    """
    updated = await KYCService.admin_request_changes(
        db=db,
        submission_id=submission_id,
        admin_user=current_user,
        request=request,
    )
    return StandardResponse[KYCSubmissionResponse](
        success=True,
        message="Changes requested on KYC submission. Feedback transmitted to agency.",
        data=updated,
    )
