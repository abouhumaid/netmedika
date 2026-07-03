"""Order business logic (async)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.model.order import Order, OrderStatus
from app.model.user import User
from app.schema.order import ReviewDecision, ReviewOrderRequest
from app.services.base import BaseService
from app.services.file_upload import FileUploadService

logger = logging.getLogger(__name__)


class OrderService(BaseService[Order]):
    """All order business logic in one place."""

    def __init__(self, file_upload: FileUploadService | None = None) -> None:
        super().__init__(Order)
        self.file_upload = file_upload or FileUploadService()

    # ----- create ---------------------------------------------------------

    async def create_order(
        self,
        db: AsyncSession,
        current_user: User,
        *,
        dosage_form: str | None,
        medicine_name: str | None,
        uploaded_image: UploadFile | None,
        quantity: int,
        delivery_address: str | None,
    ) -> Order:
        self._validate_create_input(
            medicine_name=medicine_name,
            uploaded_image=uploaded_image,
            quantity=quantity,
            delivery_address=delivery_address,
        )

        try:
            order_id = f"ORD_{uuid.uuid4().hex[:12].upper()}"
            image_path = None
            if uploaded_image is not None:
                image_path = await self.file_upload.save_image(
                    uploaded_image, filename_prefix=order_id,
                )

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
            return await self.save(db, new_order)
        except HTTPException:
            raise
        except Exception as exc:
            await db.rollback()
            logger.error(
                "Order creation failed for user %s: %s",
                current_user.id, exc, exc_info=True,
            )
            raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

    # ----- reads ----------------------------------------------------------

    async def list_for_user(
        self, db: AsyncSession, user_id: int, *, skip: int = 0, limit: int = 20,
    ) -> tuple[list[Order], int]:
        result = await db.execute(
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        orders = result.scalars().all()

        total_result = await db.execute(
            select(func.count()).select_from(Order).where(Order.user_id == user_id)
        )
        total = total_result.scalar_one()
        return orders, total

    async def list_all_admin(
        self,
        db: AsyncSession,
        *,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Order], int]:
        query = select(Order).options(selectinload(Order.owner)).join(User, Order.user_id == User.id)

        if status:
            try:
                query = query.where(Order.status == OrderStatus(status.strip().lower()))
            except ValueError as exc:
                raise HTTPException(
                    status_code=400, detail="Invalid order status filter.",
                ) from exc

        if search:
            term = f"%{search.strip()}%"
            query = query.where(
                (Order.order_id.ilike(term))
                | (Order.medication_name.ilike(term))
                | (Order.delivery_address.ilike(term))
                | (User.username.ilike(term))
                | (User.email.ilike(term))
            )

        total_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = total_result.scalar_one()

        orders_result = await db.execute(
            query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
        )
        orders = orders_result.scalars().all()
        return orders, total

    async def get_by_order_id(
        self,
        db: AsyncSession,
        order_id: str,
        *,
        requesting_user: User | None = None,
        require_owner_or_admin: bool = False,
    ) -> Order:
        result = await db.execute(
            select(Order).options(selectinload(Order.owner)).where(Order.order_id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if require_owner_or_admin and requesting_user is not None:
            if order.user_id != requesting_user.id and not requesting_user.is_admin:
                raise HTTPException(status_code=403, detail="Not authorized to view this order.")
        return order

    # ----- mutations ------------------------------------------------------

    async def update_quantity(
        self,
        db: AsyncSession,
        order_id: str,
        quantity: int,
        user_id: int,
    ) -> tuple[int, int]:
        result = await db.execute(
            select(Order).where(Order.order_id == order_id, Order.user_id == user_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if order.status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot modify a {order.status.value} order.",
            )

        old_quantity = order.quantity
        order.quantity = quantity
        order.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(order)
        return old_quantity, order.quantity

    async def delete_order(self, db: AsyncSession, order_id: str, current_user: User) -> tuple[str, str | None]:
        result = await db.execute(
            select(Order).where(Order.order_id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if order.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this order.")

        if order.status == OrderStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Cannot delete a completed order.")

        if order.prescription_image:
            self.file_upload.delete_safely(order.prescription_image)

        deleted_id = order.order_id
        deleted_name = order.medication_name

        await db.delete(order)
        await db.commit()
        return deleted_id, deleted_name

    async def review_status(self, db: AsyncSession, order_id: str, payload: ReviewOrderRequest) -> Order:
        result = await db.execute(
            select(Order).where(Order.order_id == order_id)
        )
        order = result.scalar_one_or_none()
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

        order.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(order)
        return order

    async def confirm_payment_by_user(self, db: AsyncSession, order_id: str, user_id: int) -> Order:
        result = await db.execute(
            select(Order).where(Order.order_id == order_id, Order.user_id == user_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if order.status != OrderStatus.VERIFIED:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot confirm payment for an order with status '{order.status.value}'. "
                    "Only approved (VERIFIED) orders can be paid."
                ),
            )

        order.status = OrderStatus.PROCESSING
        order.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(order)
        return order

    async def confirm_payment_receipt_by_admin(self, db: AsyncSession, order_id: str) -> Order:
        result = await db.execute(
            select(Order).where(Order.order_id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        if order.status != OrderStatus.PROCESSING:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot confirm payment receipt for an order with status '{order.status.value}'. "
                    "Only processing orders can have payment confirmed."
                ),
            )

        order.status = OrderStatus.PAID
        order.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(order)
        return order

    async def update_status_by_admin(
        self, db: AsyncSession, order_id: str, new_status: str,
    ) -> tuple[OrderStatus, Order]:
        result = await db.execute(
            select(Order).where(Order.order_id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        try:
            target = OrderStatus(new_status.strip().lower())
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid status '{new_status}'. Valid options are: "
                    f"{', '.join(s.value for s in OrderStatus)}"
                ),
            ) from exc

        old_status = order.status
        order.status = target
        order.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(order)
        return old_status, order

    # ----- input validation ----------------------------------------------

    @staticmethod
    def _validate_create_input(
        *,
        medicine_name: str | None,
        uploaded_image: UploadFile | None,
        quantity: int,
        delivery_address: str | None,
    ) -> None:
        if not medicine_name and uploaded_image is None:
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