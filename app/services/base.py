"""Generic CRUD base service for SQLAlchemy ORM models."""

from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy.orm import Session

from app.core.database import Base

T = TypeVar("T", bound=Base)


class BaseService(Generic[T]):
    """Reusable data-access primitives over a single ORM model.

    Subclasses pin ``model`` to a concrete SQLAlchemy class and add
    domain-specific business logic. Methods take the session explicitly so
    the service can be safely instantiated inside FastAPI dependency handlers.
    """

    model: type[T]

    def __init__(self, model: type[T]) -> None:
        self.model = model

    # ----- reads ----------------------------------------------------------

    def get(self, db: Session, pk: Any) -> T | None:
        return db.get(self.model, pk)

    def get_by(self, db: Session, **filters: Any) -> T | None:
        return db.query(self.model).filter_by(**filters).first()

    def list(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: Sequence[Any] | None = None,
    ) -> list[T]:
        query = db.query(self.model)
        if order_by is not None:
            query = query.order_by(*order_by)
        return query.offset(skip).limit(limit).all()

    def count(self, db: Session, **filters: Any) -> int:
        query = db.query(self.model)
        if filters:
            query = query.filter_by(**filters)
        return query.count()

    # ----- writes ---------------------------------------------------------

    def save(self, db: Session, obj: T) -> T:
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, obj: T) -> None:
        db.delete(obj)
        db.commit()
