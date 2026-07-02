"""Profile endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.model.user import User
from app.schema.user import ChangePasswordRequest, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/profile", tags=["profile"])

_user_service = UserService()


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user, from_attributes=True)


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Change the authenticated user's password."""
    _user_service.change_password(db, current_user, request)
    return {"message": "Password changed successfully"}
