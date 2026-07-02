"""Order endpoints."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.api.deps import require_admin, require_authenticated
from app.core.database import get_db
from app.model.user import User
from app.schema.order import OrderResponse, OrderSummary, ReviewDecision, ReviewOrderRequest
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
_order_service = OrderService()

router = APIRouter(prefix="/orders", tags=["orders"])


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/create", response_model=OrderResponse, status_code=201)
@limiter.limit("10/minute")
async def create_order(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    dosage_form: str | None = Form(None),
    medicine_name: str | None = Form(None),
    uploaded_image: UploadFile | None = File(None),
    quantity: int = Form(1),
    delivery_address: str | None = Form(None),
    current_user: User = Depends(require_authenticated),
) -> OrderResponse:
    new_order = await _order_service.create_order(
        db=db,
        current_user=current_user,
        dosage_form=dosage_form,
        medicine_name=medicine_name,
        uploaded_image=uploaded_image,
        quantity=quantity,
        delivery_address=delivery_address,
    )
    return OrderResponse(
        order_id=new_order.order_id,
        user_id=new_order.user_id,
        dosage_form=new_order.dosage_form,
        medication_name=new_order.medication_name,
        prescription_image=new_order.prescription_image,
        delivery_address=new_order.delivery_address,
        status=new_order.status,
        created_at=new_order.created_at,
        updated_at=new_order.updated_at,
        message="Order created successfully",
    )


@router.get("/my-orders", response_model=dict)
async def get_my_orders(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    orders, total = _order_service.list_for_user(db, current_user.id, skip=skip, limit=limit)
    return {
        "user_id": current_user.id,
        "total_orders": total,
        "orders": [OrderSummary.from_order(o) for o in orders],
    }


@router.patch("/update-quantity/{order_id}", response_model=dict)
async def update_order_quantity(
    order_id: str,
    quantity: int = Query(..., ge=1, le=99),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    old_qty, new_qty = _order_service.update_quantity(db, order_id, quantity, current_user.id)
    return {
        "success": True,
        "message": "Quantity updated successfully.",
        "order_id": order_id,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
    }


@router.delete("/delete/{order_id}", response_model=dict)
async def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    deleted_id, deleted_name = _order_service.delete_order(db, order_id, current_user)
    return {
        "success": True,
        "message": "Order deleted successfully.",
        "order_id": deleted_id,
        "medication_name": deleted_name,
    }


@router.post("/delete/{order_id}", response_model=dict)
async def delete_order_via_post(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    """Backward-compatible POST alias for :func:`delete_order`."""
    return await delete_order(order_id=order_id, db=db, current_user=current_user)


@router.get("/user/{user_id}", response_model=dict)
async def get_user_orders(
    user_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    if current_user.id != user_id and not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not authorized to view these orders.")

    orders, total = _order_service.list_for_user(db, user_id, skip=skip, limit=limit)
    return {
        "user_id": user_id,
        "total_orders": total,
        "orders": [OrderSummary.from_order(o) for o in orders],
    }


@router.get("/all", response_model=dict)
async def get_all_orders(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    orders, total = _order_service.list_all_admin(
        db,
        status=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    return {
        "total_orders": total,
        "orders": [OrderSummary.from_order(o) for o in orders],
    }


@router.get("/{order_id}", response_model=dict)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    order = _order_service.get_by_order_id(
        db,
        order_id,
        requesting_user=current_user,
        require_owner_or_admin=True,
    )
    return {"order": OrderSummary.from_order(order)}


@router.patch("/{order_id}/review", response_model=dict)
async def review_order(
    order_id: str,
    payload: ReviewOrderRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    order = _order_service.review_status(db, order_id, payload)
    action = "accepted" if payload.decision == ReviewDecision.ACCEPT else "rejected"
    return {
        "success": True,
        "message": f"Order {action} successfully.",
        "order": OrderSummary.from_order(order),
    }


@router.post("/{order_id}/confirm-payment", response_model=dict)
async def confirm_payment(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated),
) -> dict:
    order = _order_service.confirm_payment_by_user(db, order_id, current_user.id)
    logger.info(
        "Payment confirmed by user %s for order %s — status → PROCESSING",
        current_user.id, order_id,
    )
    return {
        "success": True,
        "message": "Payment confirmation received. Your order is now being processed.",
        "order_id": order.order_id,
        "status": order.status.value,
    }


@router.post("/{order_id}/confirm-payment-receipt", response_model=dict)
async def confirm_payment_receipt(
    order_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    order = _order_service.confirm_payment_receipt_by_admin(db, order_id)
    logger.info(
        "Payment receipt confirmed by admin for order %s — status → PAID",
        order_id,
    )
    return {
        "success": True,
        "message": "Payment receipt confirmed. Order marked as paid.",
        "order": OrderSummary.from_order(order),
    }


@router.patch("/{order_id}/status", response_model=dict)
async def update_order_status_admin(
    order_id: str,
    status: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    old_status, order = _order_service.update_status_by_admin(db, order_id, status)
    logger.info(
        "Order status updated by admin for order %s — status: %s → %s",
        order_id, old_status, order.status.value,
    )
    return {
        "success": True,
        "message": f"Order status updated successfully to '{order.status.value}'.",
        "order": OrderSummary.from_order(order),
    }
