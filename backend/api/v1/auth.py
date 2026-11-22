from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user, require_admin
from backend.core.database import get_db
from backend.model.user import User
from backend.schema.token import RefreshTokenRequest, TokenResponse
from backend.schema.user import (
    AuthResponse,
    CreateAdminRequest,
    LoginRequest,
    RegisterRequest,
    SocialLoginRequest,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
    UserResponse,
)
from backend.services.email import is_email_configured, send_admin_credentials
from backend.services.user import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])

_user_service = UserService()
logger = logging.getLogger(__name__)


def _user_summary(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "profile_picture": user.profile_picture,
        "address": user.address,
        "is_active": user.is_active,
    }


@router.post("/register", status_code=201)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
    await _user_service.register(db, request)
    return {"message": "Account created"}


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    res = await _user_service.login(db, request)
    return AuthResponse(
        message="Login successful",
        user=UserResponse.model_validate(res["user"], from_attributes=True),
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
    )


@router.post("/google", response_model=AuthResponse)
async def google_login(request: SocialLoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    return _social_auth_response(await _user_service.social_login(db, "google", request.id_token))


@router.post("/apple", response_model=AuthResponse)
async def apple_login(request: SocialLoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    return _social_auth_response(await _user_service.social_login(db, "apple", request.id_token))


def _social_auth_response(res: dict) -> AuthResponse:
    logger.info("Social sign-in succeeded for user_id=%s", res["user"].id)
    return AuthResponse(
        message="Login successful",
        user=UserResponse.model_validate(res["user"], from_attributes=True),
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
    )


@router.get("/users", response_model=dict)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    users = await _user_service.list_all(db)
    return {"users": [_user_summary(u) for u in users]}


@router.post("/users/admin", status_code=201, response_model=dict)
async def create_admin_user(
    request: CreateAdminRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Admin email delivery is not configured")

    password = secrets.token_urlsafe(18)
    try:
        user = await _user_service.prepare_admin(
            db,
            username=request.username,
            email=str(request.email),
            password=password,
        )
        await send_admin_credentials(user.email, user.username, password)
        await db.commit()
        await db.refresh(user)
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        logger.exception("Admin creation or credential email failed")
        raise HTTPException(status_code=502, detail="Could not send admin credentials; no account was created") from None

    return {"message": "Admin account created and credentials emailed", "user": _user_summary(user)}


@router.patch("/users/{user_id}/role", response_model=dict)
async def update_user_role(
    user_id: int,
    request: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    user = await _user_service.update_role(db, user_id, request.role, current_user)
    return {
        "message": "User role updated successfully.",
        "user": _user_summary(user),
    }


@router.patch("/users/{user_id}/status", response_model=dict)
async def update_user_status(
    user_id: int,
    request: UpdateUserStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    user = await _user_service.update_active_status(db, user_id, request.is_active, current_user)
    return {
        "message": "User account is now active" if user.is_active else "User account has been blocked",
        "user": _user_summary(user),
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    res = await _user_service.refresh_session(db, request.refresh_token)
    return TokenResponse(
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
        expires_in=res["expires_in"],
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _user_service.logout(db, current_user)
    return {"message": "User logged out"}
