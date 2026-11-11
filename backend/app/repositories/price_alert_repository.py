"""
Repository for Price Alerts and Price Snapshots.
Enforces 10-alert cap per user and isolates user access.
"""

from datetime import date, datetime, timezone
from typing import Dict, List, Optional, Tuple
import uuid
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError, PermissionDeniedError
from app.models.price_alert import PriceAlert, PriceSnapshot
from app.schemas.price_alert import PriceAlertCreate, PriceAlertUpdate


MAX_ACTIVE_ALERTS_PER_USER = 10


def build_route_key(service_type: str, origin: str, destination: str) -> str:
    """Standardized deterministic route key e.g. flight:DAC-CXB."""
    return f"{service_type.lower()}:{origin.strip().upper()}-{destination.strip().upper()}"


class PriceAlertRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_active_alerts(self, user_id: uuid.UUID) -> int:
        """Count currently active alerts for a user."""
        stmt = (
            select(func.count(PriceAlert.id))
            .where(PriceAlert.user_id == user_id, PriceAlert.status == "active")
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def create_alert(self, user_id: uuid.UUID, data: PriceAlertCreate) -> PriceAlert:
        """
        Creates a new price alert after strictly verifying the 10 active alerts cap.
        """
        active_count = await self.count_active_alerts(user_id)
        if active_count >= MAX_ACTIVE_ALERTS_PER_USER:
            raise BadRequestError(
                f"User cannot exceed the maximum limit of {MAX_ACTIVE_ALERTS_PER_USER} active price alerts."
            )

        alert = PriceAlert(
            user_id=user_id,
            service_type=data.service_type,
            origin=data.origin,
            destination=data.destination,
            travel_date=data.travel_date,
            date_flex_days=data.date_flex_days,
            target_price_paisa=data.target_price_paisa,
            drop_percent=data.drop_percent,
            status="active",
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def get_alert_by_id(self, alert_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> PriceAlert:
        """Fetch alert by ID with optional tenant isolation check."""
        stmt = select(PriceAlert).where(PriceAlert.id == alert_id)
        res = await self.db.execute(stmt)
        alert = res.scalar_one_or_none()
        if not alert:
            raise NotFoundError("PriceAlert", str(alert_id))

        if user_id and alert.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to access this price alert.")

        return alert

    async def list_alerts_for_user(
        self,
        user_id: uuid.UUID,
        status: Optional[str] = None,
    ) -> List[PriceAlert]:
        """List price alerts for a specific user, sorted by created_at desc."""
        stmt = select(PriceAlert).where(PriceAlert.user_id == user_id)
        if status:
            stmt = stmt.where(PriceAlert.status == status)
        stmt = stmt.order_by(PriceAlert.created_at.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def update_alert(
        self,
        alert_id: uuid.UUID,
        user_id: uuid.UUID,
        update_data: PriceAlertUpdate,
    ) -> PriceAlert:
        """Update an alert, ensuring status transitions respect the 10 active cap."""
        alert = await self.get_alert_by_id(alert_id, user_id=user_id)

        if update_data.status == "active" and alert.status != "active":
            active_count = await self.count_active_alerts(user_id)
            if active_count >= MAX_ACTIVE_ALERTS_PER_USER:
                raise BadRequestError(
                    f"Cannot activate alert. Maximum limit of {MAX_ACTIVE_ALERTS_PER_USER} active alerts reached."
                )

        if update_data.status is not None:
            alert.status = update_data.status
        if update_data.target_price_paisa is not None:
            alert.target_price_paisa = update_data.target_price_paisa
        if update_data.drop_percent is not None:
            alert.drop_percent = update_data.drop_percent
        if update_data.date_flex_days is not None:
            alert.date_flex_days = update_data.date_flex_days

        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def delete_alert(self, alert_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete user's price alert with strict ownership check."""
        alert = await self.get_alert_by_id(alert_id, user_id=user_id)
        await self.db.delete(alert)
        await self.db.commit()
        return True

    async def get_all_active_alerts(self) -> List[PriceAlert]:
        """Fetch all currently active alerts across the system for Celery worker."""
        stmt = select(PriceAlert).where(PriceAlert.status == "active")
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_active_routes(self) -> List[Tuple[str, str, str]]:
        """Return distinct (service_type, origin, destination) for active alerts."""
        stmt = (
            select(PriceAlert.service_type, PriceAlert.origin, PriceAlert.destination)
            .where(PriceAlert.status == "active")
            .distinct()
        )
        res = await self.db.execute(stmt)
        return list(res.all())

    async def mark_alert_notified(self, alert_id: uuid.UUID, status: str = "triggered") -> None:
        """Record notification timestamp and update status."""
        stmt = (
            update(PriceAlert)
            .where(PriceAlert.id == alert_id)
            .values(last_notified_at=datetime.now(timezone.utc), status=status)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def expire_outdated_alerts(self, current_travel_date: date) -> int:
        """Expire alerts whose travel_date has passed."""
        stmt = (
            update(PriceAlert)
            .where(
                PriceAlert.status.in_(["active", "paused"]),
                PriceAlert.travel_date < current_travel_date,
            )
            .values(status="expired")
        )
        res = await self.db.execute(stmt)
        await self.db.commit()
        return res.rowcount

    # -------------------------------------------------------------------------
    # Price Snapshots Operations
    # -------------------------------------------------------------------------
    async def record_snapshot(
        self,
        route_key: str,
        travel_date: date,
        lowest_price_paisa: int,
        source: str = "internal_inventory",
    ) -> PriceSnapshot:
        """Insert a captured lowest price snapshot."""
        snapshot = PriceSnapshot(
            route_key=route_key,
            travel_date=travel_date,
            lowest_price_paisa=lowest_price_paisa,
            source=source,
        )
        self.db.add(snapshot)
        await self.db.commit()
        await self.db.refresh(snapshot)
        return snapshot

    async def get_latest_snapshot(
        self,
        route_key: str,
        travel_date: date,
    ) -> Optional[PriceSnapshot]:
        """Get the most recently captured price snapshot for a route and date."""
        stmt = (
            select(PriceSnapshot)
            .where(
                PriceSnapshot.route_key == route_key,
                PriceSnapshot.travel_date == travel_date,
            )
            .order_by(PriceSnapshot.captured_at.desc())
            .limit(1)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_monthly_snapshots(
        self,
        route_key: str,
        start_date: date,
        end_date: date,
    ) -> Dict[date, int]:
        """
        Get lowest price in paisa for each travel date in range.
        Returns mapping of travel_date -> lowest_price_paisa.
        """
        stmt = (
            select(
                PriceSnapshot.travel_date,
                func.min(PriceSnapshot.lowest_price_paisa).label("min_paisa"),
            )
            .where(
                PriceSnapshot.route_key == route_key,
                PriceSnapshot.travel_date >= start_date,
                PriceSnapshot.travel_date <= end_date,
            )
            .group_by(PriceSnapshot.travel_date)
        )
        res = await self.db.execute(stmt)
        return {row.travel_date: int(row.min_paisa) for row in res.all()}
