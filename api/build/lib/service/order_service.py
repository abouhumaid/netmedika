import uuid
import logging
from pathlib import Path
from datetime import datetime
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from models.auth_model import User
from models.order_model import Order, OrderStatus
from schemas.order_schema import ReviewOrderRequest, ReviewDecision

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("uploads/prescriptions").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

_MAGIC_SIGNATURES: list[tuple[str, str, int, bytes]] = [
    ("image/jpeg",  ".jpg",  0, b"\xff\xd8\xff"),
    ("image/png",   ".png",  0, b"\x89PNG\r\n\x1a\n"),
    ("image/gif",   ".gif",  0, b"GIF87a"),
    ("image/gif",   ".gif",  0, b"GIF89a"),
    ("image/webp",  ".webp", 8, b"WEBP"),
]

def _detect_mime(data: bytes) -> tuple[str, str] | None:
    for mime_type, ext, offset, sig in _MAGIC_SIGNATURES:
        end = offset + len(sig)
        if len(data) >= end and data[offset:end] == sig:
            return mime_type, ext
    return None

async def _validate_and_save_image(uploaded_image: UploadFile, order_id: str) -> str:
    contents = await uploaded_image.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")

    detected = _detect_mime(contents)
    if detected is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF and WebP images are accepted.",
        )
    mime_type, file_ext = detected

    unique_filename = f"{order_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    dest_path = UPLOAD_DIR / unique_filename

    if not str(dest_path).startswith(str(UPLOAD_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file path detected.")

    dest_path.write_bytes(contents)
    return f"uploads/prescriptions/{unique_filename}"

def _safe_delete_image(image_path_str: str) -> None:
    try:
        Path(image_path_str).unlink()
        logger.info("Deleted prescription image: %s", image_path_str)
    except FileNotFoundError:
        pass
    except Exception as exc:
        logger.warning("Could not delete image %s: %s", image_path_str, exc)

async def create_new_order(
    db: Session,
    current_user: User,
    dosage_form: str | None,
    medicine_name: str | None,
    uploaded_image: UploadFile | None,
    quantity: int,
    delivery_address: str | None,
) -> Order:
    # Input validation
    if not medicine_name and not uploaded_image:
        raise HTTPException(
            status_code=400,
            detail="Please provide either a medicine name or a prescription image.",
        )

    if medicine_name and not delivery_address:
        raise HTTPException(
            status_code=400,
            detail="Delivery address is required when ordering by medicine name.",
        )

    if delivery_address and len(delivery_address.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid delivery address (at least 10 characters).",
        )

    if quantity < 1 or quantity > 99:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 99.")

    try:
        order_id = f"ORD_{uuid.uuid4().hex[:12].upper()}"
        image_path = None

        if uploaded_image:
            image_path = await _validate_and_save_image(uploaded_image, order_id)

        new_order = Order(
            order_id=order_id,
            user_id=current_user.id,
            dosage_form=dosage_form,
            medication_name=medicine_name,
            prescription_image=image_path,
            quantity=quantity,
            delivery_address=delivery_address.strip() if delivery_address else None,
            rejection_reason=None,
            delivery_fee=0.0,
            total_amount=0.0,
            status=OrderStatus.PENDING,
        )

        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        return new_order

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Order creation failed for user %s: %s", current_user.id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

def get_orders_for_user(db: Session, user_id: int, skip: int, limit: int) -> tuple[list[Order], int]:
    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total_orders = db.query(Order).filter(Order.user_id == user_id).count()
    return orders, total_orders

def update_order_quantity_by_user(db: Session, order_id: str, quantity: int, user_id: int) -> tuple[int, int]:
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.user_id  == user_id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify a {order.status.value} order.",
        )

    old_quantity = order.quantity
    order.quantity = quantity
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return old_quantity, order.quantity

def remove_order(db: Session, order_id: str, current_user: User) -> tuple[str, str | None]:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this order.")

    if order.status == OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot delete a completed order.")

    if order.prescription_image:
        _safe_delete_image(order.prescription_image)

    deleted_order_id = order.order_id
    deleted_medication_name = order.medication_name

    db.delete(order)
    db.commit()
    return deleted_order_id, deleted_medication_name

def get_all_orders_admin(
    db: Session,
    status: str | None,
    search: str | None,
    skip: int,
    limit: int
) -> tuple[list[Order], int]:
    query = db.query(Order).join(User, Order.user_id == User.id)

    if status:
        normalized_status = status.strip().lower()
        try:
            query = query.filter(Order.status == OrderStatus(normalized_status))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid order status filter.") from exc

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Order.order_id.ilike(term))
            | (Order.medication_name.ilike(term))
            | (Order.delivery_address.ilike(term))
            | (User.username.ilike(term))
            | (User.email.ilike(term))
        )

    total_orders = query.count()
    orders = (
        query.order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders, total_orders

def get_order_by_id(db: Session, order_id: str, current_user: User) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.user_id != current_user.id and not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not authorized to view this order.")

    return order

def review_order_status(
    db: Session,
    order_id: str,
    payload: ReviewOrderRequest
) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if payload.decision == ReviewDecision.REJECT:
        reason = (payload.reason or "").strip()
        if not reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required.")
        order.status = OrderStatus.REJECTED
        order.rejection_reason = reason
    else:
        order.status = OrderStatus.VERIFIED
        order.rejection_reason = None
        if payload.delivery_fee is not None:
            order.delivery_fee = payload.delivery_fee
            order.total_amount = payload.delivery_fee

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order

def confirm_order_payment(db: Session, order_id: str, user_id: int) -> Order:
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.user_id  == user_id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.status != OrderStatus.VERIFIED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm payment for an order with status '{order.status.value}'. "
                   "Only approved (VERIFIED) orders can be paid.",
        )

    order.status = OrderStatus.PROCESSING
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return order

def confirm_payment_receipt_by_admin(db: Session, order_id: str) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.status != OrderStatus.PROCESSING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm payment receipt for an order with status '{order.status.value}'. "
                   "Only processing orders can have payment confirmed.",
        )

    order.status = OrderStatus.PAID
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return order

def update_order_status_by_admin(db: Session, order_id: str, status: str) -> tuple[OrderStatus, Order]:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    normalized_status = status.strip().lower()
    try:
        new_status = OrderStatus(normalized_status)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Valid options are: {', '.join([s.value for s in OrderStatus])}",
        ) from exc

    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return old_status, order
