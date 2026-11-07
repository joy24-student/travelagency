"""
Loyalty Data Access Repository.
Handles atomic points accumulation, tier upgrades, and transaction ledgers.
"""

import uuid
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.loyalty import LoyaltyAccount, LoyaltyPointsTransaction
from app.repositories.base import BaseRepository


class LoyaltyRepository(BaseRepository[LoyaltyAccount]):

    def __init__(self, db: AsyncSession):
        super().__init__(LoyaltyAccount, db)

    async def get_or_create_account(self, user_id: uuid.UUID) -> LoyaltyAccount:
        """Fetch existing loyalty account or initialize a new bronze tier account."""
        stmt = select(LoyaltyAccount).where(LoyaltyAccount.user_id == user_id)
        res = await self.db.execute(stmt)
        account = res.scalar_one_or_none()

        if not account:
            account = LoyaltyAccount(
                user_id=user_id,
                tier="bronze",
                points_balance=0.0,
                lifetime_points=0.0,
                tier_progress_percentage=0.0,
                next_tier_threshold=1000.0,
            )
            self.db.add(account)
            await self.db.flush()

        return account

    async def award_points(
        self,
        user_id: uuid.UUID,
        points: float,
        description: str,
        reference_id: Optional[str] = None,
    ) -> Tuple[LoyaltyAccount, LoyaltyPointsTransaction]:
        """
        Atomically award loyalty points using row lock on loyalty_accounts.
        Recalculates tiers: Bronze (<1k) -> Silver (1k) -> Gold (5k) -> Diamond (15k).
        """
        stmt = select(LoyaltyAccount).where(LoyaltyAccount.user_id == user_id).with_for_update()
        res = await self.db.execute(stmt)
        account = res.scalar_one_or_none()

        if not account:
            account = LoyaltyAccount(
                user_id=user_id,
                tier="bronze",
                points_balance=0.0,
                lifetime_points=0.0,
                tier_progress_percentage=0.0,
                next_tier_threshold=1000.0,
            )
            self.db.add(account)
            await self.db.flush()

        account.points_balance = float(account.points_balance) + float(points)
        account.lifetime_points = float(account.lifetime_points) + float(points)

        # Tier recalculation logic using configurable thresholds
        lifetime = account.lifetime_points
        diamond_th = settings.LOYALTY_TIER_DIAMOND_THRESHOLD
        gold_th = settings.LOYALTY_TIER_GOLD_THRESHOLD
        silver_th = settings.LOYALTY_TIER_SILVER_THRESHOLD

        if lifetime >= diamond_th:
            account.tier = "diamond"
            account.next_tier_threshold = diamond_th * 3.0
            account.tier_progress_percentage = min(100.0, (lifetime / (diamond_th * 3.0)) * 100)
        elif lifetime >= gold_th:
            account.tier = "gold"
            account.next_tier_threshold = diamond_th
            account.tier_progress_percentage = min(100.0, ((lifetime - gold_th) / (diamond_th - gold_th)) * 100)
        elif lifetime >= silver_th:
            account.tier = "silver"
            account.next_tier_threshold = gold_th
            account.tier_progress_percentage = min(100.0, ((lifetime - silver_th) / (gold_th - silver_th)) * 100)
        else:
            account.tier = "bronze"
            account.next_tier_threshold = silver_th
            account.tier_progress_percentage = min(100.0, (lifetime / silver_th) * 100)

        # Record ledger transaction
        txn = LoyaltyPointsTransaction(
            loyalty_account_id=account.id,
            points_amount=points,
            transaction_type="earn",
            description=description,
            reference_id=reference_id,
        )
        self.db.add(txn)
        await self.db.flush()

        return account, txn
