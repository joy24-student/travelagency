"""
Celery Background Tasks for Agency KYC Document Verification & Expiry Reminders.
Uses Google Gemini Vision SDK for structured extraction and server-side compliance rule checks.
NEVER auto-approves or rejects. Redacts owner ID numbers in all logs.
"""

import asyncio
from datetime import date, datetime, timedelta, timezone
import difflib
import logging
import re
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.kyc import KYCCheck, KYCDocument, KYCSubmission
from app.models.user import Agency
from app.schemas.kyc import KYCCheckResult, KYCDocType, KYCStatus
from app.services.gemini_service import GeminiVisionKYCService
from app.services.kyc_service import normalize_licence_number, redact_sensitive_id
from app.services.storage_service import StorageService
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def clean_text_for_similarity(text: Optional[str]) -> str:
    """Normalize agency/entity names for similarity comparison."""
    if not text:
        return ""
    cleaned = text.lower()
    for word in ["ltd", "limited", "pvt", "private", "travels", "travel", "tours", "agency", "bd", "bangladesh"]:
        cleaned = re.sub(rf"\b{word}\b", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9\s]", "", cleaned)
    return " ".join(cleaned.split())


async def _run_document_analysis(document_id_str: str, session: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """Asynchronous core execution of document analysis with optional caller session injection."""
    document_uuid = uuid.UUID(document_id_str)

    async def _execute_with_session(db: AsyncSession):
        # 1. Fetch document and related submission/agency
        stmt = (
            select(KYCDocument)
            .where(KYCDocument.id == document_uuid)
            .options(
                selectinload(KYCDocument.submission).selectinload(KYCSubmission.documents),
                selectinload(KYCDocument.checks),
            )
        )
        res = await db.execute(stmt)
        document = res.scalar_one_or_none()
        if not document:
            logger.error(f"KYC document not found: {document_id_str}")
            return {"error": "Document not found"}

        submission = document.submission
        agency = await db.get(Agency, submission.agency_id)
        agency_name = agency.name if agency else "Partner Agency"

        # 2. Download file bytes from R2
        try:
            file_bytes = StorageService.download_file_bytes(document.r2_key)
        except Exception as exc:
            logger.error(f"Failed to fetch bytes from R2 for doc {document.id}: {exc}")
            file_bytes = b""

        # 3. Vision Extraction via Google Gemini SDK (reuse if already extracted)
        if document.extracted_data and document.extracted_data.get("document_number"):
            extracted_data = document.extracted_data
        else:
            extracted_data = await GeminiVisionKYCService.extract_document_data(
                file_bytes=file_bytes,
                mime_type=document.mime,
                doc_type=document.doc_type,
                expected_agency_name=agency_name,
            )

        # Update document extracted metadata and expiry date
        document.extracted_data = extracted_data
        extracted_expiry_str = extracted_data.get("expiry_date")
        if extracted_expiry_str and not document.expires_on:
            try:
                document.expires_on = datetime.strptime(extracted_expiry_str[:10], "%Y-%m-%d").date()
            except Exception:
                pass

        # 4. RULE CHECKS
        missing_fields = []
        doc_num = extracted_data.get("document_number")
        entity_name = extracted_data.get("entity_name")

        if document.doc_type == KYCDocType.TRADE_LICENCE.value:
            if not doc_num:
                missing_fields.append("trade licence number")
            if not entity_name:
                missing_fields.append("business trade name")
        elif document.doc_type == KYCDocType.TIN.value:
            if not doc_num:
                missing_fields.append("TIN certificate number")
        elif document.doc_type == KYCDocType.OWNER_ID.value:
            if not doc_num:
                missing_fields.append("NID or passport number")
            if not entity_name:
                missing_fields.append("owner legal full name")
        elif document.doc_type == KYCDocType.ADDRESS_PROOF.value:
            if not extracted_data.get("address"):
                missing_fields.append("physical office address")

        if missing_fields:
            fields_result = KYCCheckResult.FAIL.value
            fields_detail = f"Missing mandatory document fields: {', '.join(missing_fields)}"
        else:
            fields_result = KYCCheckResult.PASS.value
            fields_detail = "All mandatory fields successfully extracted"

        # Check 2: not_expired
        target_expiry = document.expires_on
        if target_expiry:
            today = date.today()
            if target_expiry < today:
                expiry_result = KYCCheckResult.FAIL.value
                expiry_detail = f"Document is expired. Expiration date: {target_expiry} (expired {(today - target_expiry).days} days ago)"
            elif target_expiry <= today + timedelta(days=settings.KYC_EXPIRY_WARNING_DAYS):
                days_left = (target_expiry - today).days
                expiry_result = KYCCheckResult.WARN.value
                expiry_detail = f"Document expires soon on {target_expiry} ({days_left} days remaining)"
            else:
                expiry_result = KYCCheckResult.PASS.value
                expiry_detail = f"Document is currently valid through {target_expiry}"
        else:
            expiry_result = KYCCheckResult.PASS.value
            expiry_detail = "No expiration date applies to this document type"

        # Check 3: agency_name_similarity
        if entity_name and agency_name:
            clean_extracted = clean_text_for_similarity(entity_name)
            clean_agency = clean_text_for_similarity(agency_name)
            similarity = difflib.SequenceMatcher(None, clean_extracted, clean_agency).ratio()

            threshold = settings.KYC_AGENCY_NAME_SIMILARITY_THRESHOLD  # 0.70
            if similarity >= threshold:
                name_result = KYCCheckResult.PASS.value
                name_detail = f"High agency name similarity ({similarity:.0%}) matching '{agency_name}'"
            elif similarity >= 0.40:
                name_result = KYCCheckResult.WARN.value
                name_detail = (
                    f"Moderate name match ({similarity:.0%}): extracted '{entity_name}' "
                    f"vs registered '{agency_name}'. Requires manual admin verification."
                )
            else:
                name_result = KYCCheckResult.FAIL.value
                name_detail = (
                    f"Name mismatch ({similarity:.0%}): extracted '{entity_name}' "
                    f"differs substantially from registered '{agency_name}'"
                )
        else:
            name_result = KYCCheckResult.PASS.value
            name_detail = "Name similarity check skipped (not applicable or single person doc)"

        # Check 4: duplicate_licence_number (for trade_licence)
        licence_result = KYCCheckResult.PASS.value
        licence_detail = "Licence uniqueness check passed"

        if document.doc_type == KYCDocType.TRADE_LICENCE.value and doc_num:
            normalized_num = normalize_licence_number(doc_num)
            if normalized_num:
                other_agency_stmt = select(Agency).where(Agency.id != agency.id)
                other_agency_res = await db.execute(other_agency_stmt)
                all_other_agencies = other_agency_res.scalars().all()
                dup_agency = next(
                    (
                        a for a in all_other_agencies
                        if a.trade_licence_number and normalize_licence_number(a.trade_licence_number) == normalized_num
                    ),
                    None,
                )

                if dup_agency:
                    licence_result = KYCCheckResult.FAIL.value
                    licence_detail = (
                        f"Duplicate trade licence number detected! Matches registered agency '{dup_agency.name}'"
                    )
                else:
                    licence_result = KYCCheckResult.PASS.value
                    licence_detail = f"Trade licence number is unique across registered agencies ({redact_sensitive_id(doc_num)})"

        # 5. Save Checks to kyc_checks
        for old_chk in list(document.checks):
            await db.delete(old_chk)

        checks_to_add = [
            KYCCheck(document_id=document.id, check_name="fields_present", result=fields_result, detail=fields_detail),
            KYCCheck(document_id=document.id, check_name="not_expired", result=expiry_result, detail=expiry_detail),
            KYCCheck(document_id=document.id, check_name="agency_name_similarity", result=name_result, detail=name_detail),
            KYCCheck(document_id=document.id, check_name="duplicate_licence_number", result=licence_result, detail=licence_detail),
        ]
        db.add_all(checks_to_add)

        # 6. Progress submission to 'in_review' if it was 'submitted'
        # CRITICAL SAFETY: NEVER AUTO-APPROVE OR AUTO-REJECT!
        if submission.status == KYCStatus.SUBMITTED.value:
            submission.status = KYCStatus.IN_REVIEW.value
            submission.updated_at = datetime.now(timezone.utc)

        await db.commit()

        # Log completion with strict owner ID redaction
        redacted_id = redact_sensitive_id(doc_num) if doc_num else "[NONE]"
        logger.info(
            f"Completed AI vision & rule checks for doc {document.id} ({document.doc_type}): "
            f"id={redacted_id}, fields={fields_result}, expiry={expiry_result}, "
            f"similarity={name_result}, licence={licence_result}. Status remains: {submission.status}"
        )

        return {
            "document_id": str(document.id),
            "doc_type": document.doc_type,
            "fields_result": fields_result,
            "expiry_result": expiry_result,
            "similarity_result": name_result,
            "licence_result": licence_result,
            "licence_detail": licence_detail,
            "checks": [
                {"name": c.check_name, "result": c.result, "detail": c.detail}
                for c in checks_to_add
            ],
            "submission_status": submission.status,
        }

    if session is not None:
        return await _execute_with_session(session)
    async with AsyncSessionLocal() as db:
        return await _execute_with_session(db)


@celery_app.task(name="analyze_kyc_document")
def analyze_kyc_document(document_id_str: str, session: Optional[Any] = None) -> Dict[str, Any]:
    """
    Celery task: Fetches document, runs Google Gemini Vision extraction,
    and conducts rule checks. Never auto-approves or auto-rejects.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                return executor.submit(asyncio.run, _run_document_analysis(document_id_str, session)).result()
        return loop.run_until_complete(_run_document_analysis(document_id_str, session))
    except RuntimeError:
        return asyncio.run(_run_document_analysis(document_id_str, session))


async def _run_expiring_documents_check(session: Optional[AsyncSession] = None) -> int:
    """Finds documents expiring in <= 30 days and logs/alerts."""
    async def _execute(db: AsyncSession):
        today = date.today()
        warning_window = today + timedelta(days=settings.KYC_EXPIRY_WARNING_DAYS)

        stmt = (
            select(KYCDocument, Agency.name, Agency.email)
            .join(KYCSubmission, KYCDocument.submission_id == KYCSubmission.id)
            .join(Agency, KYCSubmission.agency_id == Agency.id)
            .where(
                KYCDocument.expires_on.is_not(None),
                KYCDocument.expires_on >= today,
                KYCDocument.expires_on <= warning_window,
                KYCSubmission.status.in_([KYCStatus.VERIFIED.value, KYCStatus.IN_REVIEW.value]),
            )
        )
        res = await db.execute(stmt)
        rows = res.all()

        reminders_sent = 0
        for doc, agn_name, agn_email in rows:
            days_left = (doc.expires_on - today).days
            logger.warning(
                f"[KYC EXPIRY REMINDER] Document '{doc.doc_type}' for agency '{agn_name}' ({agn_email}) "
                f"expires on {doc.expires_on} ({days_left} days remaining). Renewal notification triggered."
            )
            reminders_sent += 1

        return reminders_sent

    if session is not None:
        return await _execute(session)
    async with AsyncSessionLocal() as db:
        return await _execute(db)


@celery_app.task(name="check_expiring_kyc_documents_task")
def check_expiring_kyc_documents_task(session: Optional[Any] = None) -> int:
    """
    Celery beat task: Scans for KYC documents expiring within 30 days and sends alerts.
    """
    try:
        return asyncio.run(_run_expiring_documents_check(session))
    except Exception as exc:
        logger.error(f"Error during expiring KYC documents check: {exc}", exc_info=True)
        return 0
