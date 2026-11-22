"""Persistent notification operations."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.notification import Notification
from backend.model.user import User, UserRole


class NotificationService:
    async def notify_admins_new_order(
        self,
        db: AsyncSession,
        *,
        order_id: str,
        customer_name: str,
        medication_name: str | None,
    ) -> None:
        result = await db.execute(
            select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        admin_ids = result.scalars().all()
        if not admin_ids:
            return

        item = medication_name or "Prescription order"
        db.add_all([
            Notification(
                user_id=admin_id,
                title="New order received",
                message=f"{customer_name} placed order {order_id} for {item}.",
                kind="order",
                link=f"/orders/{order_id}",
            )
            for admin_id in admin_ids
        ])
        await db.commit()

    async def list_for_user(
        self,
        db: AsyncSession,
        user_id: int,
        *,
        limit: int = 50,
    ) -> tuple[list[Notification], int]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        )
        notifications = list(result.scalars().all())
        unread_result = await db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
        return notifications, unread_result.scalar_one()

    async def mark_read(
        self,
        db: AsyncSession,
        notification_id: int,
        user_id: int,
    ) -> Notification:
        notification = await db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")
        if notification.read_at is None:
            notification.read_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(notification)
        return notification

    async def mark_all_read(self, db: AsyncSession, user_id: int) -> int:
        result = await db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(timezone.utc))
        )
        await db.commit()
        return result.rowcount or 0
