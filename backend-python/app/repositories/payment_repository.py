"""
Payment Data Access Repository.
Handles payment persistence, replay nonce protection, and idempotency audit logging.
"""

import time
import uuid
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.payment import (
    Payment,
    PaymentSecurityNonce,
    PaymentTransaction,
    PaymentWebhookLog,
)
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):

    def __init__(self, db: AsyncSession):
        super().__init__(Payment, db)

    async def get_by_reference(self, reference: str) -> Optional[Payment]:
        """Find payment by booking reference or external reference."""
        stmt = select(Payment).where(Payment.reference == reference.strip())
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_transaction_id(self, tx_id: str) -> Optional[Payment]:
        """Find payment by transaction id."""
        stmt = select(Payment).where(Payment.transaction_id == tx_id.strip())
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def verify_and_record_nonce(
        self,
        nonce: str,
        user_id: Optional[uuid.UUID] = None,
        timestamp_ms: Optional[int] = None,
    ) -> bool:
        """
        Verify single-use cryptographic nonce within a 5-minute time window.
        Returns False if timestamp is stale (>5 min) or if duplicate nonce (replay attack).
        """
        if not nonce or len(nonce.strip()) < settings.NONCE_MIN_LENGTH:
            return False

        current_ms = int(time.time() * 1000)
        ts = timestamp_ms if timestamp_ms else current_ms
        expiry_window_ms = settings.NONCE_EXPIRY_SECONDS * 1000
        if abs(current_ms - ts) > expiry_window_ms:
            return False

        try:
            nonce_record = PaymentSecurityNonce(
                nonce=nonce.strip(),
                user_id=user_id,
                timestamp=ts,
            )
            self.db.add(nonce_record)
            await self.db.flush()
            return True
        except IntegrityError:
            # Duplicate nonce detected
            return False

    async def check_webhook_idempotency(self, idempotency_key: str) -> Optional[PaymentWebhookLog]:
        """Look up existing webhook execution record to prevent duplicate processing."""
        stmt = select(PaymentWebhookLog).where(PaymentWebhookLog.idempotency_key == idempotency_key.strip())
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def record_webhook_log(
        self,
        provider: str,
        provider_transaction_id: Optional[str],
        signature_verified: bool,
        idempotency_key: Optional[str],
        payload_hash: str,
        status: str,
        error_message: Optional[str] = None,
        client_ip: Optional[str] = None,
    ) -> PaymentWebhookLog:
        """Persist structured audit log for inbound webhook."""
        log = PaymentWebhookLog(
            provider=provider,
            provider_transaction_id=provider_transaction_id,
            signature_verified=signature_verified,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash,
            status=status,
            error_message=error_message,
            client_ip=client_ip,
        )
        self.db.add(log)
        await self.db.flush()
        return log
