"""User and authentication service."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

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

    def register(self, db: Session, request: RegisterRequest) -> User:
        if self.get_by(db, email=request.email):
            raise HTTPException(status_code=400, detail="Registration failed")

        user = User(
            username=request.username,
            email=request.email,
            password_hash=hash_password(request.password.strip()),
            role=UserRole.CUSTOMER,
        )
        return self.save(db, user)

    def login(self, db: Session, request: LoginRequest) -> dict:
        user = self.get_by(db, email=request.email)
        if not user or not verify_password(request.password.strip(), user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token(
            {"sub": str(user.id), "ver": user.token_version},
            timedelta(minutes=settings.access_token_expire_minutes),
        )
        refresh_token = self._issue_refresh_token(db, user.id)

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    # ----- refresh & logout ----------------------------------------------

    def refresh_session(self, db: Session, refresh_token: str) -> dict:
        token_row = self._consume_refresh_token(db, refresh_token)
        user = self.get(db, token_row.user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        new_refresh = self._issue_refresh_token(db, user.id)
        access_token = create_access_token(
            {"sub": str(user.id), "ver": user.token_version},
            timedelta(minutes=settings.access_token_expire_minutes),
        )
        return {
            "access_token": access_token,
            "refresh_token": new_refresh,
            "expires_in": settings.access_token_expire_minutes * 60,
        }

    def logout(self, db: Session, current_user: User) -> None:
        current_user.token_version += 1
        db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).delete()
        db.commit()

    # ----- profile --------------------------------------------------------

    def change_password(
        self,
        db: Session,
        current_user: User,
        request: ChangePasswordRequest,
    ) -> None:
        try:
            if not verify_password(request.current_password, current_user.password_hash):
                raise HTTPException(status_code=401, detail="Current password is incorrect")
            current_user.password_hash = hash_password(request.new_password)
            db.commit()
        except HTTPException:
            raise
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Password change failed: {exc}")

    def list_all(self, db: Session) -> list[User]:
        return self.list(db, order_by=[User.id.asc()])

    def update_role(
        self,
        db: Session,
        user_id: int,
        new_role: UserRole,
        current_user: User,
    ) -> User:
        user = self.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if user.id == current_user.id and new_role != UserRole.ADMIN:
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role.",
            )

        user.role = new_role
        db.commit()
        db.refresh(user)
        return user

    # ----- helpers --------------------------------------------------------

    def _issue_refresh_token(self, db: Session, user_id: int) -> str:
        token = secrets.token_urlsafe(64)
        # Naive UTC keeps the comparison cross-DB safe (SQLite/Postgres).
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
        db.add(RefreshToken(user_id=user_id, token=token, expires_at=expires_at))
        db.commit()
        return token

    def _consume_refresh_token(self, db: Session, refresh_token: str) -> RefreshToken:
        token_row = (
            db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
        )
        if not token_row:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        if token_row.expires_at < datetime.utcnow():
            db.delete(token_row)
            db.commit()
            raise HTTPException(status_code=401, detail="Token expired")

        # Rotate: invalidate the old refresh token.
        db.delete(token_row)
        db.commit()
        return token_row
