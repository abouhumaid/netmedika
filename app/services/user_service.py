"""User and authentication service (async)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.model.token import RefreshToken
from app.model.user import User, UserRole
from app.schema.user import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
)
from app.services.base import BaseService


class UserService(BaseService[User]):
    """All user / auth business logic in one place."""

    def __init__(self) -> None:
        super().__init__(User)

    # ----- registration & login ------------------------------------------

    async def register(self, db: AsyncSession, request: RegisterRequest) -> User:
        existing = await self.get_by(db, email=request.email)
        if existing:
            raise HTTPException(status_code=400, detail="Registration failed")

        user = User(
            username=request.username,
            email=request.email,
            password_hash=hash_password(request.password.strip()),
            role=UserRole.CUSTOMER,
        )
        return await self.save(db, user)

    async def login(self, db: AsyncSession, request: LoginRequest) -> dict:
        user = await self.get_by(db, email=request.email)
        if not user or not verify_password(request.password.strip(), user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token(
            {"sub": str(user.id), "ver": user.token_version},
            timedelta(minutes=settings.access_token_expire_minutes),
        )
        refresh_token = await self._issue_refresh_token(db, user.id)

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    # ----- refresh & logout ----------------------------------------------

    async def refresh_session(self, db: AsyncSession, refresh_token: str) -> dict:
        token_row = await self._consume_refresh_token(db, refresh_token)
        user = await self.get(db, token_row.user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        new_refresh = await self._issue_refresh_token(db, user.id)
        access_token = create_access_token(
            {"sub": str(user.id), "ver": user.token_version},
            timedelta(minutes=settings.access_token_expire_minutes),
        )
        return {
            "access_token": access_token,
            "refresh_token": new_refresh,
            "expires_in": settings.access_token_expire_minutes * 60,
        }

    async def logout(self, db: AsyncSession, current_user: User) -> None:
        current_user.token_version += 1
        await db.execute(
            select(RefreshToken).where(RefreshToken.user_id == current_user.id)
        )
        # Note: bulk delete needs different approach
        from sqlalchemy import delete
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == current_user.id))
        await db.commit()

    # ----- profile --------------------------------------------------------

    async def change_password(
        self,
        db: AsyncSession,
        current_user: User,
        request: ChangePasswordRequest,
    ) -> None:
        try:
            if not verify_password(request.current_password, current_user.password_hash):
                raise HTTPException(status_code=401, detail="Current password is incorrect")
            current_user.password_hash = hash_password(request.new_password)
            await db.commit()
        except HTTPException:
            raise
        except Exception as exc:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Password change failed: {exc}")

    async def list_all(self, db: AsyncSession) -> list[User]:
        return await self.list(db, order_by=[User.id.asc()])

    async def update_role(
        self,
        db: AsyncSession,
        user_id: int,
        new_role: UserRole,
        current_user: User,
    ) -> User:
        user = await self.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if user.id == current_user.id and new_role != UserRole.ADMIN:
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role.",
            )

        user.role = new_role
        await db.commit()
        await db.refresh(user)
        return user

    # ----- helpers --------------------------------------------------------

    async def _issue_refresh_token(self, db: AsyncSession, user_id: int) -> str:
        token = secrets.token_urlsafe(64)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
        db.add(RefreshToken(user_id=user_id, token=token, expires_at=expires_at))
        await db.commit()
        return token

    async def _consume_refresh_token(self, db: AsyncSession, refresh_token: str) -> RefreshToken:
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token == refresh_token)
        )
        token_row = result.scalar_one_or_none()
        if not token_row:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        expires_at = token_row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            await db.delete(token_row)
            await db.commit()
            raise HTTPException(status_code=401, detail="Token expired")

        # Rotate: invalidate the old refresh token.
        await db.delete(token_row)
        await db.commit()
        return token_row