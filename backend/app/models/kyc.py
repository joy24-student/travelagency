"""
Agency KYC Models.
Corresponds to public.kyc_submissions, public.kyc_documents, public.kyc_checks, and public.kyc_audit_log.
"""

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class KYCSubmission(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.kyc_submissions."""
    __tablename__ = "kyc_submissions"

    agency_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(Text, default="draft", nullable=False)  # draft, submitted, in_review, needs_changes, verified, rejected
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    documents: Mapped[List["KYCDocument"]] = relationship("KYCDocument", back_populates="submission", cascade="all, delete-orphan")
    audit_logs: Mapped[List["KYCAuditLog"]] = relationship("KYCAuditLog", back_populates="submission", cascade="all, delete-orphan")


class KYCDocument(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.kyc_documents."""
    __tablename__ = "kyc_documents"

    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kyc_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(Text, nullable=False)  # trade_licence, tin, owner_id, address_proof
    r2_key: Mapped[str] = mapped_column(Text, nullable=False)
    mime: Mapped[str] = mapped_column(Text, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(Text, nullable=False)
    expires_on: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    extracted_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    submission: Mapped["KYCSubmission"] = relationship("KYCSubmission", back_populates="documents")
    checks: Mapped[List["KYCCheck"]] = relationship("KYCCheck", back_populates="document", cascade="all, delete-orphan")


class KYCCheck(Base, UUIDMixin):
    """Corresponds to public.kyc_checks."""
    __tablename__ = "kyc_checks"

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kyc_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    check_name: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)  # pass, warn, fail
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    document: Mapped["KYCDocument"] = relationship("KYCDocument", back_populates="checks")


class KYCAuditLog(Base, UUIDMixin):
    """Corresponds to public.kyc_audit_log."""
    __tablename__ = "kyc_audit_log"

    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kyc_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    submission: Mapped["KYCSubmission"] = relationship("KYCSubmission", back_populates="audit_logs")
