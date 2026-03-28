from fastapi import APIRouter, File, Form, HTTPException, Depends, UploadFile, Request, Query
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging
from pathlib import Path
from models.auth_model import User
from utils.auth import get_current_user
from schemas.order_schema import *
from models.order_model import Order, OrderStatus
from database import get_db
from typing import Annotated

# ── Rate limiting (pip install slowapi) ──────────────────────────────────────
from slowapi import Limiter
from slowapi.util import get_remote_address


logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

UPLOAD_DIR = Path("uploads/prescriptions").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# Magic-byte signatures — no system library required
# Each entry: (mime_type, extension, byte_offset, signature_bytes)
_MAGIC_SIGNATURES: list[tuple[str, str, int, bytes]] = [
    ("image/jpeg",  ".jpg",  0, b"\xff\xd8\xff"),
    ("image/png",   ".png",  0, b"\x89PNG\r\n\x1a\n"),
    ("image/gif",   ".gif",  0, b"GIF87a"),
    ("image/gif",   ".gif",  0, b"GIF89a"),
    ("image/webp",  ".webp", 8, b"WEBP"),    # bytes 8-11 in a RIFF container
]


def _detect_mime(data: bytes) -> tuple[str, str] | None:
    """
    Return (mime_type, extension) by inspecting the raw bytes of the file,
    or None if no known signature matches.
    No third-party C library required.
    """
    for mime_type, ext, offset, sig in _MAGIC_SIGNATURES:
        end = offset + len(sig)
        if len(data) >= end and data[offset:end] == sig:
            return mime_type, ext
    return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_auth(current_user: User) -> User:
    """Raise 401 immediately if the dependency returned None."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return current_user


async def _validate_and_save_image(uploaded_image: UploadFile, order_id: str) -> str:
    """
    Validate the uploaded image (size + magic bytes) and save it with a
    server-generated filename.  Returns the relative path string to store in DB.
    """
    # 1. Read with a hard size cap
    contents = await uploaded_image.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")

    # 2. Validate actual file content via magic bytes — never trust the extension
    detected = _detect_mime(contents)
    if detected is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF and WebP images are accepted.",
        )
    mime_type, file_ext = detected

    # 3. Build path entirely server-side — original filename is never used
    unique_filename = f"{order_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    dest_path = UPLOAD_DIR / unique_filename

    # 4. Extra guard: ensure the resolved path is still inside UPLOAD_DIR
    if not str(dest_path).startswith(str(UPLOAD_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file path detected.")

    # 5. Write to disk
    dest_path.write_bytes(contents)

    return f"uploads/prescriptions/{unique_filename}"


def _safe_delete_image(image_path_str: str) -> None:
    """Delete a prescription image, ignoring races and missing files gracefully."""
    try:
        Path(image_path_str).unlink()
        logger.info("Deleted prescription image: %s", image_path_str)
    except FileNotFoundError:
        pass  # already gone — that is fine
    except Exception as exc:
        logger.warning("Could not delete image %s: %s", image_path_str, exc)


def _serialize_order(order: Order) -> dict:
    """Convert an Order ORM object to a plain dict safe for JSON responses."""
    return {
        "order_id":           order.order_id,
        "medication_name":    order.medication_name,
        "prescription_image": order.prescription_image,
        "quantity":           order.quantity,
        "delivery_address":   order.delivery_address,
        "status":             order.status.value if hasattr(order.status, "value") else order.status,
        "created_at":         order.created_at.isoformat(),
        "updated_at":         order.updated_at.isoformat(),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create", response_model=OrderResponse, status_code=201)
@limiter.limit("10/minute")
async def create_order(
    request: Request,                                   # required by slowapi
    db: Annotated[Session, Depends(get_db)],
    dosage_form:       str | None  = Form(None),
    medicine_name:     str | None  = Form(None),
    strength:          str | None  = Form(None),
    frequency:         str | None  = Form(None),
    uploaded_image:    UploadFile | None = File(None),
    quantity:          int         = Form(1),
    delivery_address:  str | None  = Form(None),        # collected from modal
    current_user:      User        = Depends(get_current_user),
):
    # ── Auth guard ────────────────────────────────────────────────────────────
    _require_auth(current_user)

    # ── Input validation ──────────────────────────────────────────────────────
    if not medicine_name and not uploaded_image:
        raise HTTPException(
            status_code=400,
            detail="Please provide either a medicine name or a prescription image.",
        )

    # Delivery address is required when ordering by medicine name,
    # optional when uploading a prescription image only (admin will follow up)
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
        order_id   = f"ORD_{uuid.uuid4().hex[:12].upper()}"
        image_path = None

        # ── File handling ─────────────────────────────────────────────────────
        if uploaded_image:
            image_path = await _validate_and_save_image(uploaded_image, order_id)

        # ── Pricing set to zero — admin will decide on acceptance ─────────────
        delivery_fee = 0.0
        total_amount = 0.0

        # ── Persist ───────────────────────────────────────────────────────────
        new_order = Order(
            order_id=          order_id,
            user_id=           current_user.id,
            dosage_form=       dosage_form,
            medication_name=   medicine_name,
            strength=          strength,
            frequency=         frequency,
            prescription_image=image_path,
            quantity=          quantity,
            delivery_address=  delivery_address.strip() if delivery_address else None,
            delivery_fee=      delivery_fee,
            total_amount=      total_amount,
            status=            OrderStatus.PENDING,
        )

        db.add(new_order)
        db.commit()
        db.refresh(new_order)

        return OrderResponse(
            order_id=          new_order.order_id,
            user_id=           new_order.user_id,
            dosage_form=       new_order.dosage_form,
            medication_name=   new_order.medication_name,
            strength=          new_order.strength,
            frequency=         new_order.frequency,
            prescription_image=new_order.prescription_image,
            delivery_address=  new_order.delivery_address,
            status=            new_order.status,
            created_at=        new_order.created_at,
            updated_at=        new_order.updated_at,
            message=           "Order created successfully",
        )

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Order creation failed for user %s: %s", current_user.id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/my-orders", response_model=dict)
async def get_my_orders(
    skip:         int  = Query(default=0,  ge=0),
    limit:        int  = Query(default=20, ge=1, le=50),   # hard cap at 50
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)

    try:
        orders = (
            db.query(Order)
            .filter(Order.user_id == current_user.id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        total_orders = db.query(Order).filter(Order.user_id == current_user.id).count()

        return {
            "user_id":      current_user.id,
            "total_orders": total_orders,
            "orders":       [_serialize_order(o) for o in orders],
        }

    except Exception as exc:
        logger.error("Failed to fetch orders for user %s: %s", current_user.id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.patch("/update-quantity/{order_id}", response_model=dict)
async def update_order_quantity(
    order_id:     str,
    quantity:     int     = Query(..., ge=1, le=99),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)

    try:
        order = db.query(Order).filter(
            Order.order_id == order_id,
            Order.user_id  == current_user.id,
        ).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if order.status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot modify a {order.status.value} order.",
            )

        old_quantity    = order.quantity
        order.quantity  = quantity
        order.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        return {
            "success":      True,
            "message":      "Quantity updated successfully.",
            "order_id":     order.order_id,
            "old_quantity": old_quantity,
            "new_quantity": order.quantity,
        }

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Failed to update quantity for order %s: %s", order_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.delete("/delete/{order_id}", response_model=dict)
async def delete_order(
    order_id:     str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)

    try:
        order = db.query(Order).filter(
            Order.order_id == order_id,
            Order.user_id  == current_user.id,
        ).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if order.status == OrderStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Cannot delete a completed order.")

        # Remove prescription image atomically (no TOCTOU race)
        if order.prescription_image:
            _safe_delete_image(order.prescription_image)

        deleted_order_id        = order.order_id
        deleted_medication_name = order.medication_name

        db.delete(order)
        db.commit()

        return {
            "success":         True,
            "message":         "Order deleted successfully.",
            "order_id":        deleted_order_id,
            "medication_name": deleted_medication_name,
        }

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Failed to delete order %s: %s", order_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/user/{user_id}", response_model=dict)
async def get_user_orders(
    user_id:      str,
    skip:         int  = Query(default=0,  ge=0),
    limit:        int  = Query(default=20, ge=1, le=50),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _require_auth(current_user)

    # Cast both sides to str to avoid int vs str type-mismatch (broken authz fix)
    if str(current_user.id) != str(user_id):
        if not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to view these orders.")

    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total_orders = db.query(Order).filter(Order.user_id == user_id).count()

    return {
        "user_id":      user_id,
        "total_orders": total_orders,
        "orders":       [_serialize_order(o) for o in orders],
    }