"""
Agency KYC Verification Service.
Manages KYC document submissions, ephemeral presigned URLs, state machine transitions,
and audit logs with strict Zero-Trust role boundaries and owner ID redaction.
"""

from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, List, Optional, Set
import uuid
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestError, NotFoundError, PermissionDeniedError
from app.models.kyc import KYCAuditLog, KYCCheck, KYCDocument, KYCSubmission
from app.models.user import Agency
from app.schemas.kyc import (
    KYCAdminApproveRequest,
    KYCAdminRejectRequest,
    KYCAdminRequestChangesRequest,
    KYCCheckResponse,
    KYCDocType,
    KYCDocumentResponse,
    KYCQueueItemResponse,
    KYCPresignRequest,
    KYCPresignResponse,
    KYCStatus,
    KYCSubmissionResponse,
    KYCSubmitRequest,
)
from app.schemas.user import CurrentUser
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

# State Machine Transition Rules
# draft -> submitted -> in_review -> needs_changes | verified | rejected
# needs_changes -> submitted
ALLOWED_STATE_TRANSITIONS: Dict[str, Set[str]] = {
    KYCStatus.DRAFT.value: {KYCStatus.SUBMITTED.value},
    KYCStatus.SUBMITTED.value: {
        KYCStatus.IN_REVIEW.value,
        KYCStatus.NEEDS_CHANGES.value,
        KYCStatus.VERIFIED.value,
        KYCStatus.REJECTED.value,
    },
    KYCStatus.IN_REVIEW.value: {
        KYCStatus.NEEDS_CHANGES.value,
        KYCStatus.VERIFIED.value,
        KYCStatus.REJECTED.value,
    },
    KYCStatus.NEEDS_CHANGES.value: {KYCStatus.SUBMITTED.value},
    KYCStatus.VERIFIED.value: set(),  # Terminal state
    KYCStatus.REJECTED.value: set(),  # Terminal state
}

REQUIRED_DOC_TYPES = {
    KYCDocType.TRADE_LICENCE.value,
    KYCDocType.TIN.value,
    KYCDocType.OWNER_ID.value,
    KYCDocType.ADDRESS_PROOF.value,
}


def redact_sensitive_id(value: Optional[str]) -> str:
    """Mask sensitive national ID / passport number to prevent disclosure in logs."""
    if not value:
        return "[REDACTED]"
    clean = str(value).strip()
    if len(clean) <= 4:
        return "****"
    return f"***{clean[-4:]}"


def normalize_licence_number(value: Optional[str]) -> str:
    """Normalize trade licence number by stripping non-alphanumeric chars and uppercasing."""
    if not value:
        return ""
    return re.sub(r"[^A-Z0-9]", "", value.upper())


class KYCService:

    @staticmethod
    def generate_upload_presign(
        agency_id: uuid.UUID,
        user_id: uuid.UUID,
        request: KYCPresignRequest,
    ) -> KYCPresignResponse:
        """
        Validate file metadata and generate an ephemeral 5-minute presigned PUT URL.
        Never returns a public or permanent URL.
        """
        return StorageService.generate_kyc_presigned_upload_url(
            agency_id=agency_id,
            doc_type=request.doc_type.value,
            file_name=request.file_name,
            mime_type=request.mime_type,
            size_bytes=request.size_bytes,
        )

    @staticmethod
    async def submit_kyc(
        db: AsyncSession,
        agency_id: uuid.UUID,
        user_id: uuid.UUID,
        request: KYCSubmitRequest,
    ) -> KYCSubmissionResponse:
        """
        Submits agency documents for KYC verification.
        Validates all 4 required document types, transitions status to 'submitted',
        writes to kyc_audit_log, and triggers asynchronous Celery document checks.
        """
        # 1. Verify agency exists
        agency = await db.get(Agency, agency_id)
        if not agency:
            raise NotFoundError("Agency", agency_id)

        # 2. Check submitted document types
        submitted_types = {d.doc_type.value for d in request.documents}
        missing = REQUIRED_DOC_TYPES - submitted_types
        if missing:
            raise BadRequestError(
                f"Missing required documents for verification: {sorted(list(missing))}. "
                "Must upload trade_licence, tin, owner_id, and address_proof."
            )

        # 3. Locate or initialize KYCSubmission
        stmt = (
            select(KYCSubmission)
            .where(KYCSubmission.agency_id == agency_id)
            .order_by(desc(KYCSubmission.created_at))
            .options(selectinload(KYCSubmission.documents))
        )
        res = await db.execute(stmt)
        submission = res.scalars().first()

        now = datetime.now(timezone.utc)

        if submission:
            if submission.status == KYCStatus.VERIFIED.value:
                raise BadRequestError("Agency is already verified. New submissions are not permitted.")
            if submission.status in (KYCStatus.SUBMITTED.value, KYCStatus.IN_REVIEW.value):
                raise BadRequestError("A KYC submission is already pending administrator review.")

            # Validate state transition from draft or needs_changes -> submitted
            current_status = submission.status
            if KYCStatus.SUBMITTED.value not in ALLOWED_STATE_TRANSITIONS.get(current_status, set()):
                raise BadRequestError(
                    f"Illegal state transition from '{current_status}' to '{KYCStatus.SUBMITTED.value}'"
                )

            from_status = submission.status
            submission.status = KYCStatus.SUBMITTED.value
            submission.submitted_at = now
            submission.decision_reason = None
            submission.updated_at = now
        else:
            from_status = None
            submission = KYCSubmission(
                agency_id=agency_id,
                status=KYCStatus.SUBMITTED.value,
                submitted_at=now,
            )
            db.add(submission)
            await db.flush()

        # 4. Upsert/replace document items
        doc_lookup_stmt = select(KYCDocument).where(KYCDocument.submission_id == submission.id)
        doc_lookup_res = await db.execute(doc_lookup_stmt)
        existing_docs = doc_lookup_res.scalars().all()
        existing_docs_by_type = {doc.doc_type: doc for doc in existing_docs}
        created_or_updated_docs: List[KYCDocument] = []

        for item in request.documents:
            if item.doc_type.value in existing_docs_by_type:
                doc = existing_docs_by_type[item.doc_type.value]
                doc.r2_key = item.r2_key
                doc.mime = item.mime
                doc.size_bytes = item.size_bytes
                doc.sha256 = item.sha256
                doc.expires_on = item.expires_on
                doc.updated_at = now
            else:
                doc = KYCDocument(
                    submission_id=submission.id,
                    doc_type=item.doc_type.value,
                    r2_key=item.r2_key,
                    mime=item.mime,
                    size_bytes=item.size_bytes,
                    sha256=item.sha256,
                    expires_on=item.expires_on,
                )
                db.add(doc)
            created_or_updated_docs.append(doc)

        # 5. Write kyc_audit_log
        audit_entry = KYCAuditLog(
            submission_id=submission.id,
            actor_id=user_id,
            action="submit",
            from_status=from_status,
            to_status=KYCStatus.SUBMITTED.value,
            note="Agency submitted KYC document bundle for verification",
        )
        db.add(audit_entry)

        # 6. Update agency verification_status to pending
        agency.verification_status = "pending"
        await db.flush()
        await db.commit()

        # 7. Asynchronously trigger Celery vision analysis tasks
        try:
            from app.tasks.kyc_tasks import analyze_kyc_document
            for doc in created_or_updated_docs:
                analyze_kyc_document.delay(str(doc.id))
        except Exception as queue_err:
            logger.warning(f"Could not enqueue Celery analysis task: {queue_err}")

        return await KYCService.get_submission_detail_by_id(db, submission.id)

    @staticmethod
    async def get_agency_submission(
        db: AsyncSession,
        agency_id: uuid.UUID,
    ) -> Optional[KYCSubmissionResponse]:
        """Fetch active KYC submission for an agency with 5-minute presigned download URLs."""
        stmt = (
            select(KYCSubmission)
            .where(KYCSubmission.agency_id == agency_id)
            .order_by(desc(KYCSubmission.created_at))
        )
        res = await db.execute(stmt)
        submission = res.scalars().first()
        if not submission:
            return None
        return await KYCService.get_submission_detail_by_id(db, submission.id)

    @staticmethod
    async def get_admin_queue(
        db: AsyncSession,
        status_filter: Optional[List[str]] = None,
    ) -> List[KYCQueueItemResponse]:
        """
        List KYC submissions queue sorted by OLDEST submitted_at first.
        Admins review oldest waiting submissions first.
        """
        stmt = (
            select(KYCSubmission, Agency.name)
            .join(Agency, KYCSubmission.agency_id == Agency.id)
            .order_by(KYCSubmission.submitted_at.asc().nulls_last(), KYCSubmission.created_at.asc())
        )

        if status_filter:
            stmt = stmt.where(KYCSubmission.status.in_(status_filter))
        else:
            # Default queue: submitted, in_review, needs_changes
            stmt = stmt.where(
                KYCSubmission.status.in_([
                    KYCStatus.SUBMITTED.value,
                    KYCStatus.IN_REVIEW.value,
                    KYCStatus.NEEDS_CHANGES.value,
                ])
            )

        res = await db.execute(stmt)
        rows = res.all()

        queue_items = []
        for submission, agency_name in rows:
            # count documents
            doc_count_res = await db.execute(
                select(KYCDocument).where(KYCDocument.submission_id == submission.id)
            )
            doc_count = len(doc_count_res.scalars().all())

            queue_items.append(
                KYCQueueItemResponse(
                    id=submission.id,
                    agency_id=submission.agency_id,
                    agency_name=agency_name or "Unknown Agency",
                    status=KYCStatus(submission.status),
                    submitted_at=submission.submitted_at,
                    documents_count=doc_count,
                    created_at=submission.created_at,
                )
            )

        return queue_items

    @staticmethod
    async def get_submission_detail_by_id(
        db: AsyncSession,
        submission_id: uuid.UUID,
    ) -> KYCSubmissionResponse:
        """
        Fetch complete submission details with documents, checks, and audit logs.
        Generates ephemeral 5-minute presigned GET download URLs for each document.
        """
        stmt = (
            select(KYCSubmission)
            .where(KYCSubmission.id == submission_id)
            .options(
                selectinload(KYCSubmission.documents).selectinload(KYCDocument.checks),
                selectinload(KYCSubmission.audit_logs),
            )
        )
        res = await db.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise NotFoundError("KYCSubmission", submission_id)

        agency = await db.get(Agency, submission.agency_id)
        agency_name = agency.name if agency else "Unknown Agency"

        # Transform documents and generate 5-minute ephemeral presigned GET URLs
        docs_response = []
        for doc in submission.documents:
            presigned_get_url = StorageService.generate_presigned_download_url(doc.r2_key, expires_in=300)
            checks_response = [
                KYCCheckResponse(
                    id=chk.id,
                    document_id=chk.document_id,
                    check_name=chk.check_name,
                    result=chk.result,
                    detail=chk.detail,
                    created_at=chk.created_at,
                )
                for chk in doc.checks
            ]
            docs_response.append(
                KYCDocumentResponse(
                    id=doc.id,
                    submission_id=doc.submission_id,
                    doc_type=doc.doc_type,
                    r2_key=doc.r2_key,
                    download_url=presigned_get_url,
                    mime=doc.mime,
                    size_bytes=doc.size_bytes,
                    sha256=doc.sha256,
                    expires_on=doc.expires_on,
                    extracted_data=doc.extracted_data or {},
                    checks=checks_response,
                    created_at=doc.created_at,
                    updated_at=doc.updated_at,
                )
            )

        audit_response = [
            {
                "id": log.id,
                "submission_id": log.submission_id,
                "actor_id": log.actor_id,
                "action": log.action,
                "from_status": log.from_status,
                "to_status": log.to_status,
                "note": log.note,
                "created_at": log.created_at,
            }
            for log in sorted(submission.audit_logs, key=lambda l: l.created_at, reverse=True)
        ]

        return KYCSubmissionResponse(
            id=submission.id,
            agency_id=submission.agency_id,
            agency_name=agency_name,
            status=KYCStatus(submission.status),
            submitted_at=submission.submitted_at,
            reviewed_by=submission.reviewed_by,
            reviewed_at=submission.reviewed_at,
            decision_reason=submission.decision_reason,
            created_at=submission.created_at,
            updated_at=submission.updated_at,
            documents=docs_response,
            audit_logs=audit_response,
        )

    @staticmethod
    async def admin_approve(
        db: AsyncSession,
        submission_id: uuid.UUID,
        admin_user: CurrentUser,
        request: KYCAdminApproveRequest,
    ) -> KYCSubmissionResponse:
        """
        Administrator human review: Approve agency KYC.
        Enforces state transition rules (only allowed from submitted or in_review).
        Updates agency.verified_at, agency.verified_by, agency.trade_licence_number.
        Writes immutable record to kyc_audit_log.
        """
        submission = await db.get(KYCSubmission, submission_id)
        if not submission:
            raise NotFoundError("KYCSubmission", submission_id)

        target_status = KYCStatus.VERIFIED.value
        if target_status not in ALLOWED_STATE_TRANSITIONS.get(submission.status, set()):
            raise BadRequestError(
                f"Cannot transition submission from '{submission.status}' to '{target_status}'"
            )

        agency = await db.get(Agency, submission.agency_id)
        if not agency:
            raise NotFoundError("Agency", submission.agency_id)

        now = datetime.now(timezone.utc)
        from_status = submission.status

        submission.status = target_status
        submission.reviewed_by = admin_user.id
        submission.reviewed_at = now
        submission.decision_reason = request.note
        submission.updated_at = now

        # Update Agency verification attributes
        agency.verified_at = now
        agency.verified_by = admin_user.id
        agency.verification_status = "verified"

        # Update agency trade licence number from verified document
        doc_stmt = select(KYCDocument).where(
            KYCDocument.submission_id == submission_id,
            KYCDocument.doc_type == KYCDocType.TRADE_LICENCE.value,
        )
        doc_res = await db.execute(doc_stmt)
        trade_doc = doc_res.scalars().first()
        if trade_doc and trade_doc.extracted_data:
            extracted_num = trade_doc.extracted_data.get("document_number")
            if extracted_num:
                agency.trade_licence_number = extracted_num

        # Write immutable audit log
        audit_entry = KYCAuditLog(
            submission_id=submission.id,
            actor_id=admin_user.id,
            action="approve",
            from_status=from_status,
            to_status=target_status,
            note=request.note or f"Approved by administrator ({admin_user.email})",
        )
        db.add(audit_entry)

        await db.commit()
        logger.info(
            f"KYC submission {submission_id} approved for agency '{agency.name}' by admin {admin_user.id}"
        )
        return await KYCService.get_submission_detail_by_id(db, submission_id)

    @staticmethod
    async def admin_reject(
        db: AsyncSession,
        submission_id: uuid.UUID,
        admin_user: CurrentUser,
        request: KYCAdminRejectRequest,
    ) -> KYCSubmissionResponse:
        """
        Administrator human review: Reject agency KYC.
        Decision reason is strictly mandatory.
        Updates agency.verification_status to rejected and writes kyc_audit_log.
        """
        # Strict validation on mandatory reason
        reason = request.reason.strip()
        if not reason or len(reason) < 3:
            raise BadRequestError("A valid decision reason is strictly required when rejecting a KYC submission.")

        submission = await db.get(KYCSubmission, submission_id)
        if not submission:
            raise NotFoundError("KYCSubmission", submission_id)

        target_status = KYCStatus.REJECTED.value
        if target_status not in ALLOWED_STATE_TRANSITIONS.get(submission.status, set()):
            raise BadRequestError(
                f"Cannot transition submission from '{submission.status}' to '{target_status}'"
            )

        agency = await db.get(Agency, submission.agency_id)
        if not agency:
            raise NotFoundError("Agency", submission.agency_id)

        now = datetime.now(timezone.utc)
        from_status = submission.status

        submission.status = target_status
        submission.reviewed_by = admin_user.id
        submission.reviewed_at = now
        submission.decision_reason = reason
        submission.updated_at = now

        agency.verification_status = "rejected"

        audit_entry = KYCAuditLog(
            submission_id=submission.id,
            actor_id=admin_user.id,
            action="reject",
            from_status=from_status,
            to_status=target_status,
            note=f"Rejected: {reason}",
        )
        db.add(audit_entry)

        await db.commit()
        logger.info(
            f"KYC submission {submission_id} rejected for agency '{agency.name}' by admin {admin_user.id}: {reason}"
        )
        return await KYCService.get_submission_detail_by_id(db, submission_id)

    @staticmethod
    async def admin_request_changes(
        db: AsyncSession,
        submission_id: uuid.UUID,
        admin_user: CurrentUser,
        request: KYCAdminRequestChangesRequest,
    ) -> KYCSubmissionResponse:
        """
        Administrator human review: Request changes on KYC submission.
        Mandatory instructions sent back to agency. Agency can re-upload and resubmit.
        """
        reason = request.reason.strip()
        if not reason or len(reason) < 3:
            raise BadRequestError("Detailed instructions are required when requesting changes.")

        submission = await db.get(KYCSubmission, submission_id)
        if not submission:
            raise NotFoundError("KYCSubmission", submission_id)

        target_status = KYCStatus.NEEDS_CHANGES.value
        if target_status not in ALLOWED_STATE_TRANSITIONS.get(submission.status, set()):
            raise BadRequestError(
                f"Cannot transition submission from '{submission.status}' to '{target_status}'"
            )

        now = datetime.now(timezone.utc)
        from_status = submission.status

        submission.status = target_status
        submission.reviewed_by = admin_user.id
        submission.reviewed_at = now
        submission.decision_reason = reason
        submission.updated_at = now

        audit_entry = KYCAuditLog(
            submission_id=submission.id,
            actor_id=admin_user.id,
            action="request_changes",
            from_status=from_status,
            to_status=target_status,
            note=f"Changes requested: {reason}",
        )
        db.add(audit_entry)

        await db.commit()
        logger.info(
            f"KYC submission {submission_id} placed into needs_changes by admin {admin_user.id}: {reason}"
        )
        return await KYCService.get_submission_detail_by_id(db, submission_id)
