"""
Agency Data Access Repository.
Handles agency profile resolution and commission crediting upon booking completions.
"""

import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agency import AgencyCommission
from app.models.user import Agency
from app.repositories.base import BaseRepository


class AgencyRepository(BaseRepository[Agency]):

    def __init__(self, db: AsyncSession):
        super().__init__(Agency, db)

    async def get_by_owner_id(self, owner_user_id: uuid.UUID) -> Optional[Agency]:
        """Fetch agency by owner's auth user ID."""
        stmt = select(Agency).where(Agency.owner_user_id == owner_user_id, Agency.status == "active")
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def credit_commission(
        self,
        agency_id: uuid.UUID,
        booking_id: uuid.UUID,
        amount: float,
        commission_rate: float = 5.0,
        currency: str = "BDT",
        reference: Optional[str] = None,
    ) -> AgencyCommission:
        """
        Record and credit commission to partner agency ledger.
        """
        commission = AgencyCommission(
            agency_id=agency_id,
            booking_id=booking_id,
            amount=amount,
            commission_rate=commission_rate,
            currency=currency,
            status="credited",
            transaction_reference=reference or f"COMM-{uuid.uuid4().hex[:10].upper()}",
        )
        self.db.add(commission)
        await self.db.flush()
        return commission
