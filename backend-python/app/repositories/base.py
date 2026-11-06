"""
Base Asynchronous Repository with generic CRUD primitives.
"""

import uuid
from typing import Any, Generic, List, Optional, Sequence, Type, TypeVar
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async repository providing standard data access operations."""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, entity_id: uuid.UUID) -> Optional[ModelType]:
        """Fetch entity by primary key UUID."""
        stmt = select(self.model).where(self.model.id == entity_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, offset: int = 0, limit: int = 50) -> Sequence[ModelType]:
        """List entities with basic pagination."""
        stmt = select(self.model).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count_all(self) -> int:
        """Count total entities in table."""
        stmt = select(func.count()).select_from(self.model)
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def add(self, entity: ModelType) -> ModelType:
        """Add new entity to session without committing."""
        self.db.add(entity)
        return entity

    async def delete(self, entity: ModelType) -> None:
        """Mark entity for deletion."""
        await self.db.delete(entity)
