"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.model.user import User
from app.schema.token import RefreshTokenRequest, TokenResponse
from app.schema.user import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UpdateUserRoleRequest,
    UserResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])

_user_service = UserService()


def _user_summary(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
    }


@router.post("/register", status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> dict:
    _user_service.register(db, request)
    return {"message": "Account created"}


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    res = _user_service.login(db, request)
    return AuthResponse(
        message="Login successful",
        user=UserResponse.model_validate(res["user"], from_attributes=True),
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
    )


@router.get("/users", response_model=dict)
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    users = _user_service.list_all(db)
    return {"users": [_user_summary(u) for u in users]}


@router.patch("/users/{user_id}/role", response_model=dict)
def update_user_role(
    user_id: int,
    request: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    user = _user_service.update_role(db, user_id, request.role, current_user)
    return {
        "message": "User role updated successfully.",
        "user": _user_summary(user),
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db)) -> TokenResponse:
    res = _user_service.refresh_session(db, request.refresh_token)
    return TokenResponse(
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
        expires_in=res["expires_in"],
    )


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _user_service.logout(db, current_user)
    return {"message": "User logged out"}
