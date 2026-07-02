"""Order ORM model and the canonical OrderStatus enum."""

from __future__ import annotations

import enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    PROCESSING = "processing"
    PAID = "paid"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    dosage_form = Column(String, nullable=True)
    medication_name = Column(String, nullable=True)
    prescription_image = Column(String, nullable=True)
    status = Column(
        SQLEnum(OrderStatus),
        default=OrderStatus.PENDING,
        nullable=False,
    )
    quantity = Column(Integer, default=1)
    delivery_address = Column(String(500), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    delivery_fee = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    owner = relationship("User", back_populates="orders")
