"""
User and RBAC Data Access Repository.
Resolves Supabase Auth user profiles, admin designations, and agency affiliations.
"""

import uuid
from typing import Optional, Tuple
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import (
    AccountProfile,
    AdminUser,
    Agency,
    AgencyTeamMember,
    HotelStaff,
    UserProfile,
)
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[UserProfile]):

    def __init__(self, db: AsyncSession):
        super().__init__(UserProfile, db)

    async def get_user_profile(self, user_id: uuid.UUID) -> Optional[UserProfile]:
        """Fetch user profile by user UUID."""
        stmt = select(UserProfile).where(UserProfile.id == user_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def is_admin(self, user_id: uuid.UUID) -> bool:
        """Check if user exists in admin_users with active status."""
        stmt = select(AdminUser.id).where(AdminUser.user_id == user_id, AdminUser.status == "active")
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def get_user_agency_id(self, user_id: uuid.UUID) -> Optional[uuid.UUID]:
        """Determine if user is an agency owner or active team member."""
        # 1. Owner check
        owner_stmt = select(Agency.id).where(Agency.owner_user_id == user_id, Agency.status == "active")
        owner_res = await self.db.execute(owner_stmt)
        agency_id = owner_res.scalar_one_or_none()
        if agency_id:
            return agency_id

        # 2. Team member check
        member_stmt = select(AgencyTeamMember.agency_id).where(
            and_(AgencyTeamMember.user_id == user_id, AgencyTeamMember.status == "active")
        )
        member_res = await self.db.execute(member_stmt)
        return member_res.scalar_one_or_none()

    async def get_user_hotel_id(self, user_id: uuid.UUID) -> Optional[uuid.UUID]:
        """Determine if user is registered hotel staff."""
        stmt = select(HotelStaff.hotel_id).where(
            and_(HotelStaff.user_id == user_id, HotelStaff.status == "active")
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()
