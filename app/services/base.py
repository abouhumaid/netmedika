"""Generic async CRUD base service for SQLAlchemy ORM models."""

from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

T = TypeVar("T", bound=Base)


class BaseService(Generic[T]):
    """Reusable async data-access primitives over a single ORM model.

    Subclasses pin ``model`` to a concrete SQLAlchemy class and add
    domain-specific business logic. Methods take the session explicitly so
    the service can be safely instantiated inside FastAPI dependency handlers.
    """

    model: type[T]

    def __init__(self, model: type[T]) -> None:
        self.model = model

    # ----- reads ----------------------------------------------------------

    async def get(self, db: AsyncSession, pk: Any) -> T | None:
        return await db.get(self.model, pk)

    async def get_by(self, db: AsyncSession, **filters: Any) -> T | None:
        result = await db.execute(select(self.model).filter_by(**filters))
        return result.scalar_one_or_none()

    async def list(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: Sequence[Any] | None = None,
    ) -> list[T]:
        query = select(self.model)
        if order_by is not None:
            query = query.order_by(*order_by)
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    async def count(self, db: AsyncSession, **filters: Any) -> int:
        query = select(func.count()).select_from(self.model)
        if filters:
            query = query.filter_by(**filters)
        result = await db.execute(query)
        return result.scalar_one()

    # ----- writes ---------------------------------------------------------

    async def save(self, db: AsyncSession, obj: T) -> T:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    async def delete(self, db: AsyncSession, obj: T) -> None:
        await db.delete(obj)
        await db.commit()