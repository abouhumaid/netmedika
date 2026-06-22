from fastapi import APIRouter, File, Form, HTTPException, Depends, UploadFile, Request, Query
from sqlalchemy.orm import Session
from database import get_db
from models.auth_model import User
from utils.auth import get_current_user
from schemas.order_schema import OrderResponse, ReviewOrderRequest, ReviewDecision
from models.order_model import Order, OrderStatus
from typing import Annotated
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from service.order_service import (
    create_new_order,
    get_orders_for_user,
    update_order_quantity_by_user,
    remove_order,
    get_all_orders_admin,
    get_order_by_id,
    review_order_status,
    confirm_order_payment,
    confirm_payment_receipt_by_admin,
    update_order_status_by_admin,
)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_auth(current_user: User) -> User:
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return current_user


def _require_admin(current_user: User) -> User:
    user = _require_auth(current_user)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def _serialize_order(order: Order) -> dict:
    return {
        "order_id":           order.order_id,
        "user_id":            order.user_id,
        "user_name":          order.owner.username if order.owner else None,
        "user_email":         order.owner.email if order.owner else None,
        "dosage_form":        order.dosage_form,
        "medication_name":    order.medication_name,
        "prescription_image": order.prescription_image,
        "quantity":           order.quantity,
        "delivery_address":   order.delivery_address,
        "delivery_fee":       order.delivery_fee,
        "total_amount":       order.total_amount,
        "status":             order.status.value if hasattr(order.status, "value") else order.status,
        "rejection_reason":   order.rejection_reason,
        "created_at":         order.created_at.isoformat(),
        "updated_at":         order.updated_at.isoformat(),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create", response_model=OrderResponse, status_code=201)
@limiter.limit("10/minute")
async def create_order(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    dosage_form:       str | None  = Form(None),
    medicine_name:     str | None  = Form(None),
    uploaded_image:    UploadFile | None = File(None),
    quantity:          int         = Form(1),
    delivery_address:  str | None  = Form(None),
    current_user:      User        = Depends(get_current_user),
):
    _require_auth(current_user)
    new_order = await create_new_order(
        db=db,
        current_user=current_user,
        dosage_form=dosage_form,
        medicine_name=medicine_name,
        uploaded_image=uploaded_image,
        quantity=quantity,
        delivery_address=delivery_address,
    )
    return OrderResponse(
        order_id=          new_order.order_id,
        user_id=           new_order.user_id,
        dosage_form=       new_order.dosage_form,
        medication_name=   new_order.medication_name,
        prescription_image=new_order.prescription_image,
        delivery_address=  new_order.delivery_address,
        status=            new_order.status,
        created_at=        new_order.created_at,
        updated_at=        new_order.updated_at,
        message=           "Order created successfully",
    )


@router.get("/my-orders", response_model=dict)
async def get_my_orders(
    skip:         int  = Query(default=0,  ge=0),
    limit:        int  = Query(default=20, ge=1, le=50),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)
    orders, total_orders = get_orders_for_user(db, current_user.id, skip, limit)
    return {
        "user_id":      current_user.id,
        "total_orders": total_orders,
        "orders":       [_serialize_order(o) for o in orders],
    }


@router.patch("/update-quantity/{order_id}", response_model=dict)
async def update_order_quantity(
    order_id:     str,
    quantity:     int     = Query(..., ge=1, le=99),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)
    old_qty, new_qty = update_order_quantity_by_user(db, order_id, quantity, current_user.id)
    return {
        "success":      True,
        "message":      "Quantity updated successfully.",
        "order_id":     order_id,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
    }


@router.delete("/delete/{order_id}", response_model=dict)
async def delete_order(
    order_id:     str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)
    del_order_id, del_med_name = remove_order(db, order_id, current_user)
    return {
        "success":         True,
        "message":         "Order deleted successfully.",
        "order_id":        del_order_id,
        "medication_name": del_med_name,
    }


@router.post("/delete/{order_id}", response_model=dict)
async def delete_order_via_post(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await delete_order(order_id=order_id, db=db, current_user=current_user)

#some comment

@router.get("/user/{user_id}", response_model=dict)
async def get_user_orders(
    user_id:      int,
    skip:         int  = Query(default=0,  ge=0),
    limit:        int  = Query(default=20, ge=1, le=50),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)
    if current_user.id != user_id:
        if not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to view these orders.")

    orders, total_orders = get_orders_for_user(db, user_id, skip, limit)
    return {
        "user_id":      user_id,
        "total_orders": total_orders,
        "orders":       [_serialize_order(o) for o in orders],
    }


@router.get("/all", response_model=dict)
async def get_all_orders(
    status: str | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    orders, total_orders = get_all_orders_admin(db, status, search, skip, limit)
    return {
        "total_orders": total_orders,
        "orders": [_serialize_order(order) for order in orders],
    }


@router.get("/{order_id}", response_model=dict)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_auth(current_user)
    order = get_order_by_id(db, order_id, current_user)
    return {"order": _serialize_order(order)}


@router.patch("/{order_id}/review", response_model=dict)
async def review_order(
    order_id: str,
    payload: ReviewOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    order = review_order_status(db, order_id, payload)
    action = "accepted" if payload.decision == ReviewDecision.ACCEPT else "rejected"
    return {
        "success": True,
        "message": f"Order {action} successfully.",
        "order": _serialize_order(order),
    }


@router.post("/{order_id}/confirm-payment", response_model=dict)
async def confirm_payment(
    order_id:     str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)
    order = confirm_order_payment(db, order_id, current_user.id)
    logger.info(
        "Payment confirmed by user %s for order %s — status → PROCESSING",
        current_user.id, order_id,
    )
    return {
        "success":   True,
        "message":   "Payment confirmation received. Your order is now being processed.",
        "order_id":  order.order_id,
        "status":    order.status.value,
    }


@router.post("/{order_id}/confirm-payment-receipt", response_model=dict)
async def confirm_payment_receipt(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    order = confirm_payment_receipt_by_admin(db, order_id)
    logger.info(
        "Payment receipt confirmed by admin %s for order %s — status → PAID",
        current_user.id, order_id,
    )
    return {
        "success": True,
        "message": "Payment receipt confirmed. Order marked as paid.",
        "order": _serialize_order(order),
    }


@router.patch("/{order_id}/status", response_model=dict)
async def update_order_status_admin(
    order_id: str,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    old_status, order = update_order_status_by_admin(db, order_id, status)
    logger.info(
        "Order status updated by admin %s for order %s — status: %s → %s",
        current_user.id, order_id, old_status, order.status.value
    )
    return {
        "success": True,
        "message": f"Order status updated successfully to '{order.status.value}'.",
        "order": _serialize_order(order),
    }
