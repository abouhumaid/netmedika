"""In-app notifications for authenticated users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.core.database import get_db
from backend.model.user import User
from backend.schema.notification import NotificationListResponse, NotificationResponse
from backend.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])
_notification_service = NotificationService()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    notifications, unread_count = await _notification_service.list_for_user(
        db, current_user.id, limit=limit,
    )
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(item, from_attributes=True) for item in notifications],
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    notification = await _notification_service.mark_read(db, notification_id, current_user.id)
    return NotificationResponse.model_validate(notification, from_attributes=True)


@router.post("/read-all", response_model=dict)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = await _notification_service.mark_all_read(db, current_user.id)
    return {"updated_count": count}
