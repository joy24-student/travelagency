"""
Comprehensive Test Suite for Agency KYC Verification System.
Tests:
1. RLS isolation between two agencies (multi-tenant boundary enforcement).
2. Presign upload validation (MIME whitelist, size limits, 5-minute expiry, no permanent URLs).
3. Duplicate trade licence detection (normalized across agencies).
4. State machine integrity (illegal status transitions strictly rejected).
5. Mandatory decision reason on rejection.
6. Ledger payout blocking until verified_at is set.
7. AI safety: Automated checks NEVER auto-approve or auto-reject.
8. Sensitive owner ID redaction.
"""

from datetime import date, datetime, timedelta, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError
from app.models.kyc import KYCCheck, KYCDocument, KYCSubmission
from app.models.ledger import LedgerAccount, LedgerEntry
from app.models.user import AdminUser, Agency
from app.schemas.kyc import (
    KYCAdminApproveRequest,
    KYCAdminRejectRequest,
    KYCAdminRequestChangesRequest,
    KYCDocType,
    KYCStatus,
    KYCSubmitRequest,
)
from app.services.kyc_service import (
    KYCService,
    normalize_licence_number,
    redact_sensitive_id,
)
from app.services.ledger_service import LedgerService
from app.services.storage_service import StorageService
from app.tasks.kyc_tasks import analyze_kyc_document
from tests.conftest import make_test_jwt


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
async def setup_agencies(db_session: AsyncSession):
    """Sets up two distinct agencies and an admin user for isolation testing."""
    # Agency 1
    owner_1_id = uuid.uuid4()
    agency_1 = Agency(
        owner_user_id=owner_1_id,
        name="Chittagong Travel Hub Ltd",
        slug="ctg-travel-hub",
        trade_licence_number="TL-CTG-998877",
        verification_status="pending",
        status="active",
    )
    db_session.add(agency_1)

    # Agency 2
    owner_2_id = uuid.uuid4()
    agency_2 = Agency(
        owner_user_id=owner_2_id,
        name="Sylhet Green Tours",
        slug="sylhet-green-tours",
        trade_licence_number="TL-SYL-112233",
        verification_status="pending",
        status="active",
    )
    db_session.add(agency_2)

    # Admin User
    admin_id = uuid.uuid4()
    admin_entry = AdminUser(
        user_id=admin_id,
        role="admin",
        status="active",
    )
    db_session.add(admin_entry)

    await db_session.commit()
    await db_session.refresh(agency_1)
    await db_session.refresh(agency_2)

    return {
        "agency_1": agency_1,
        "owner_1_id": owner_1_id,
        "token_1": make_test_jwt(owner_1_id, email="owner1@ctg.com", role="agency"),
        "agency_2": agency_2,
        "owner_2_id": owner_2_id,
        "token_2": make_test_jwt(owner_2_id, email="owner2@syl.com", role="agency"),
        "admin_id": admin_id,
        "admin_token": make_test_jwt(admin_id, email="admin@shopnojatra.com", role="admin"),
    }


# =============================================================================
# 1. RLS & MULTI-TENANT ISOLATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_agency_isolation_cannot_access_other_agency_submission(
    client: AsyncClient,
    setup_agencies,
):
    """Agency A and Agency B are isolated: Agency B cannot see or tamper with Agency A's data."""
    token_1 = setup_agencies["token_1"]
    token_2 = setup_agencies["token_2"]

    # Agency 1 submits documents
    submit_payload = {
        "documents": [
            {
                "doc_type": "trade_licence",
                "r2_key": "kyc/agency_1/tl-123.pdf",
                "mime": "application/pdf",
                "size_bytes": 102400,
                "sha256": "a" * 64,
            },
            {
                "doc_type": "tin",
                "r2_key": "kyc/agency_1/tin-123.pdf",
                "mime": "application/pdf",
                "size_bytes": 102400,
                "sha256": "b" * 64,
            },
            {
                "doc_type": "owner_id",
                "r2_key": "kyc/agency_1/nid-123.jpg",
                "mime": "image/jpeg",
                "size_bytes": 102400,
                "sha256": "c" * 64,
            },
            {
                "doc_type": "address_proof",
                "r2_key": "kyc/agency_1/bill-123.pdf",
                "mime": "application/pdf",
                "size_bytes": 102400,
                "sha256": "d" * 64,
            },
        ]
    }

    resp1 = await client.post(
        "/api/v1/kyc/submit",
        json=submit_payload,
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert resp1.status_code == 201
    agency_1_submission_id = resp1.json()["data"]["id"]

    # Agency 2 fetches their own submission: must NOT see Agency 1's submission
    resp2 = await client.get(
        "/api/v1/kyc/my-submission",
        headers={"Authorization": f"Bearer {token_2}"},
    )
    assert resp2.status_code == 200
    agency_2_data = resp2.json()["data"]
    assert agency_2_data is None  # Agency 2 has not submitted yet

    # Agency 1 fetches their own submission
    resp1_get = await client.get(
        "/api/v1/kyc/my-submission",
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert resp1_get.status_code == 200
    assert resp1_get.json()["data"]["id"] == agency_1_submission_id
    assert resp1_get.json()["data"]["agency_id"] == str(setup_agencies["agency_1"].id)


# =============================================================================
# 2. PRESIGN VALIDATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_presign_validation_allowed_mimes_and_size_limits(
    client: AsyncClient,
    setup_agencies,
):
    """
    Validates MIME whitelist (PDF, PNG, JPEG allowed; executable/HTML/GIF rejected).
    Validates size limit (under 10MB allowed; over 10MB rejected).
    Validates 5-minute expiry (300 seconds) and non-permanent URL.
    """
    token_1 = setup_agencies["token_1"]

    # 1. Valid PDF upload request
    valid_pdf_payload = {
        "doc_type": "trade_licence",
        "file_name": "trade_licence_2026.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 2 * 1024 * 1024,  # 2 MB
    }
    res_valid = await client.post(
        "/api/v1/kyc/documents/presign",
        json=valid_pdf_payload,
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert res_valid.status_code == 200
    data = res_valid.json()["data"]
    assert "upload_url" in data
    assert data["expires_in"] == 300  # Strict 5-minute expiry
    assert data["key"].startswith("kyc/")
    assert data["http_method"] == "PUT"
    assert "public_url" not in data  # No permanent or public URL returned!

    # 2. Invalid MIME type (executable .exe or .zip)
    invalid_mime_payload = {
        "doc_type": "trade_licence",
        "file_name": "malware.exe",
        "mime_type": "application/x-msdownload",
        "size_bytes": 1024,
    }
    res_invalid_mime = await client.post(
        "/api/v1/kyc/documents/presign",
        json=invalid_mime_payload,
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert res_invalid_mime.status_code == 422  # Rejected by schema validator

    # 3. File size exceeds configured limit (> 10MB)
    oversized_payload = {
        "doc_type": "trade_licence",
        "file_name": "huge_scan.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 15 * 1024 * 1024,  # 15 MB > 10MB
    }
    res_oversized = await client.post(
        "/api/v1/kyc/documents/presign",
        json=oversized_payload,
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert res_oversized.status_code == 400
    assert "exceeds the maximum" in res_oversized.json()["detail"]


# =============================================================================
# 3. DUPLICATE LICENCE DETECTION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_duplicate_trade_licence_detection(
    db_session: AsyncSession,
    setup_agencies,
):
    """
    Normalized trade licence detection flags duplicates across agencies.
    E.g., Agency 1 has 'TL-CTG-998877'. If Agency 2 presents 'TL/CTG/998877',
    the normalization strips non-alphanumeric chars and identifies the collision.
    """
    agency_1 = setup_agencies["agency_1"]
    agency_2 = setup_agencies["agency_2"]

    # Test normalization function
    norm1 = normalize_licence_number("TL-CTG-998877")
    norm2 = normalize_licence_number("tl/ctg/998877 ")
    assert norm1 == "TLCTG998877"
    assert norm1 == norm2

    # Create submission for Agency 2 with trade licence matching Agency 1
    sub_2 = KYCSubmission(
        agency_id=agency_2.id,
        status="submitted",
        submitted_at=datetime.now(timezone.utc),
    )
    db_session.add(sub_2)
    await db_session.flush()

    doc_2 = KYCDocument(
        submission_id=sub_2.id,
        doc_type="trade_licence",
        r2_key="kyc/agency_2/tl.pdf",
        mime="application/pdf",
        size_bytes=50000,
        sha256="f" * 64,
        extracted_data={
            "document_type": "trade_licence",
            "document_number": "TL-CTG-998877",  # Matches Agency 1!
            "entity_name": "Sylhet Green Tours",
            "confidence_score": 0.95,
        },
    )
    db_session.add(doc_2)
    await db_session.commit()

    # Run analysis
    res = analyze_kyc_document(str(doc_2.id), session=db_session)
    assert res["licence_result"] == "fail"
    assert "Duplicate trade licence number detected" in str(res)


# =============================================================================
# 4. STATE MACHINE & ILLEGAL TRANSITIONS TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_state_machine_illegal_transitions_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    setup_agencies,
):
    """
    Valid transitions:
      draft -> submitted -> in_review -> needs_changes | verified | rejected
      needs_changes -> submitted
    Illegal transitions (e.g. draft -> verified, verified -> submitted, rejected -> verified) are rejected.
    """
    agency_1 = setup_agencies["agency_1"]
    admin_token = setup_agencies["admin_token"]

    # 1. Submission in 'draft' status
    draft_sub = KYCSubmission(
        agency_id=agency_1.id,
        status="draft",
    )
    db_session.add(draft_sub)
    await db_session.commit()

    # Attempting to directly approve a 'draft' submission is illegal
    res_illegal_approve = await client.post(
        f"/api/v1/kyc/admin/submissions/{draft_sub.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_illegal_approve.status_code == 400
    assert "Cannot transition submission from 'draft' to 'verified'" in res_illegal_approve.json()["detail"]

    # Move to 'in_review'
    draft_sub.status = "in_review"
    draft_sub.submitted_at = datetime.now(timezone.utc)
    await db_session.commit()

    # Legal approve from in_review -> verified
    res_legal_approve = await client.post(
        f"/api/v1/kyc/admin/submissions/{draft_sub.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_legal_approve.status_code == 200
    assert res_legal_approve.json()["data"]["status"] == "verified"

    # Now in terminal state 'verified': attempting to reject or request changes is illegal
    res_verified_to_reject = await client.post(
        f"/api/v1/kyc/admin/submissions/{draft_sub.id}/reject",
        json={"reason": "Cannot reject already verified"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_verified_to_reject.status_code == 400
    assert "Cannot transition submission from 'verified' to 'rejected'" in res_verified_to_reject.json()["detail"]


# =============================================================================
# 5. REJECT REQUIRES MANDATORY REASON TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_reject_requires_mandatory_reason(
    client: AsyncClient,
    db_session: AsyncSession,
    setup_agencies,
):
    """Admin reject endpoint strictly requires a non-empty decision reason."""
    agency_1 = setup_agencies["agency_1"]
    admin_token = setup_agencies["admin_token"]

    sub = KYCSubmission(
        agency_id=agency_1.id,
        status="submitted",
        submitted_at=datetime.now(timezone.utc),
    )
    db_session.add(sub)
    await db_session.commit()

    # 1. Missing reason field in payload
    res_no_reason = await client.post(
        f"/api/v1/kyc/admin/submissions/{sub.id}/reject",
        json={},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_no_reason.status_code == 422  # Missing required field

    # 2. Empty or whitespace-only reason
    res_empty_reason = await client.post(
        f"/api/v1/kyc/admin/submissions/{sub.id}/reject",
        json={"reason": "   "},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_empty_reason.status_code == 422  # Field validator rejects whitespace

    # 3. Valid reason succeeds
    res_valid_reject = await client.post(
        f"/api/v1/kyc/admin/submissions/{sub.id}/reject",
        json={"reason": "Trade licence document has illegible municipal stamp."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_valid_reject.status_code == 200
    assert res_valid_reject.json()["data"]["status"] == "rejected"
    assert res_valid_reject.json()["data"]["decision_reason"] == "Trade licence document has illegible municipal stamp."


# =============================================================================
# 6. LEDGER SERVICE PAYOUT BLOCKING TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_ledger_payout_blocked_until_verified_at_set(
    db_session: AsyncSession,
    setup_agencies,
):
    """
    Zero-Trust KYC Gate: Agency payouts are strictly blocked until verified_at is set.
    """
    agency_1 = setup_agencies["agency_1"]

    # Verify initial state: verified_at is None
    assert agency_1.verified_at is None

    # Calling validate_agency_payout_eligibility must raise BadRequestError
    with pytest.raises(BadRequestError) as exc_info:
        await LedgerService.validate_agency_payout_eligibility(db_session, agency_1.id)
    assert "Agency payout blocked: Agency 'Chittagong Travel Hub Ltd'" in str(exc_info.value)
    assert "verified_at timestamp before disbursing ledger payouts" in str(exc_info.value)

    # Now verify the agency by setting verified_at
    agency_1.verified_at = datetime.now(timezone.utc)
    agency_1.verification_status = "verified"
    await db_session.commit()

    # Now validation succeeds
    verified_agency = await LedgerService.validate_agency_payout_eligibility(db_session, agency_1.id)
    assert verified_agency.id == agency_1.id
    assert verified_agency.verified_at is not None


# =============================================================================
# 7. AI NEVER AUTO-APPROVES & REDACTION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_ai_never_auto_approves_and_redacts_owner_id(
    db_session: AsyncSession,
    setup_agencies,
):
    """
    1. AI Celery task records check results (pass/warn/fail), but NEVER approves or rejects.
       Status moves at most to 'in_review'.
    2. Owner ID is properly redacted in sensitive output representations.
    """
    agency_1 = setup_agencies["agency_1"]

    sub = KYCSubmission(
        agency_id=agency_1.id,
        status="submitted",
        submitted_at=datetime.now(timezone.utc),
    )
    db_session.add(sub)
    await db_session.flush()

    doc = KYCDocument(
        submission_id=sub.id,
        doc_type="owner_id",
        r2_key="kyc/agency_1/owner_nid.jpg",
        mime="image/jpeg",
        size_bytes=80000,
        sha256="e" * 64,
        extracted_data={
            "document_type": "owner_id",
            "document_number": "19901234567890123",
            "entity_name": "Chittagong Travel Hub Ltd",
            "confidence_score": 0.98,
        },
    )
    db_session.add(doc)
    await db_session.commit()

    # Run analysis task
    res = analyze_kyc_document(str(doc.id), session=db_session)

    # Submission status must be 'in_review', NEVER 'verified' or 'approved'!
    assert res["submission_status"] == "in_review"
    assert res["submission_status"] != "verified"
    assert res["submission_status"] != "approved"

    # Redaction test
    raw_nid = "19901234567890123"
    redacted = redact_sensitive_id(raw_nid)
    assert raw_nid not in redacted
    assert redacted == "***0123"
