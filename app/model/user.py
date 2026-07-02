"""User ORM model and the canonical UserRole enum."""

from __future__ import annotations

import enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    token_version = Column(Integer, default=0, nullable=False)
    last_login = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True))

    orders = relationship(
        "Order",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN
