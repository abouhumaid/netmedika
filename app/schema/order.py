"""Pydantic schemas for orders."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.model.order import Order, OrderStatus


class ReviewDecision(str, Enum):
    ACCEPT = "accept"
    REJECT = "reject"


class OrderResponse(BaseModel):
    """Used for the create endpoint — minimal fields plus a status message."""

    model_config = ConfigDict(from_attributes=True)

    order_id: str
    user_id: int
    dosage_form: Optional[str] = None
    medication_name: Optional[str] = None
    prescription_image: Optional[str] = None
    delivery_address: Optional[str] = None
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    message: str = ""


class OrderSummary(BaseModel):
    """Used for list / detail endpoints — includes joined owner fields."""

    model_config = ConfigDict(from_attributes=True)

    order_id: str
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    dosage_form: Optional[str] = None
    medication_name: Optional[str] = None
    prescription_image: Optional[str] = None
    quantity: int
    delivery_address: Optional[str] = None
    delivery_fee: float
    total_amount: float
    status: OrderStatus
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_order(cls, order: Order) -> "OrderSummary":
        return cls(
            order_id=order.order_id,
            user_id=order.user_id,
            user_name=order.owner.username if order.owner else None,
            user_email=order.owner.email if order.owner else None,
            dosage_form=order.dosage_form,
            medication_name=order.medication_name,
            prescription_image=order.prescription_image,
            quantity=order.quantity,
            delivery_address=order.delivery_address,
            delivery_fee=order.delivery_fee,
            total_amount=order.total_amount,
            status=order.status,
            rejection_reason=order.rejection_reason,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )


class ReviewOrderRequest(BaseModel):
    decision: ReviewDecision
    reason: Optional[str] = Field(default=None, max_length=1000)
    delivery_fee: Optional[float] = Field(default=None, ge=0)
