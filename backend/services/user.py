"""User and authentication service (async)."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.settings import settings
from backend.core.security import create_access_token, hash_password, verify_password
from backend.model.token import RefreshToken
from backend.model.user import User, UserRole
from backend.schema.user import ChangePasswordRequest, LoginRequest, RegisterRequest
from backend.services.base import BaseService

logger = logging.getLogger(__name__)
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class UserService(BaseService[User]):
    """All user / auth business logic in one place."""

    def __init__(self) -> None:
        super().__init__(User)

    # ----- registration & login ------------------------------------------

    async def register(self, db: AsyncSession, request: RegisterRequest) -> User:
        email = str(request.email).lower()
        existing = await self.get_by(db, email=email)
        if existing:
            raise HTTPException(status_code=400, detail="Registration failed")

        user = User(
            username=request.username,
            email=email,
            password_hash=hash_password(request.password.strip()),
            role=UserRole.CUSTOMER,
            profile_picture=request.profile_picture,
            address=request.address,
        )
        created = await self.save(db, user)
        logger.info("Registered customer user_id=%s", created.id)
        return created

    async def login(self, db: AsyncSession, request: LoginRequest) -> dict:
        user = await self.get_by(db, email=str(request.email).lower())
        if (
            not user
            or not user.password_hash
            or not verify_password(request.password.strip(), user.password_hash)
        ):
            logger.info("Rejected password sign-in")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="This account has been blocked")
        return await self._create_session(db, user)

    async def social_login(self, db: AsyncSession, provider: str, id_token: str) -> dict:
        """Verify an OIDC ID token, then create or sign in the matching account."""
        claims = await self._verify_social_token(provider, id_token)
        email = claims.get("email")
        subject = claims.get("sub")
        if not isinstance(email, str) or not email or not subject:
            raise HTTPException(status_code=401, detail="Provider token is missing account details")
        if claims.get("email_verified") not in (True, "true"):
            raise HTTPException(status_code=401, detail="Provider email is not verified")

        user = await self.get_by(db, email=email.lower())
        if user is not None and not user.is_active:
            raise HTTPException(status_code=403, detail="This account has been blocked")
        if user is None:
            display_name = claims.get("name") or email.split("@", 1)[0]
            user = User(
                username=str(display_name)[:100],
                email=email.lower(),
                password_hash=None,
                profile_picture=claims.get("picture"),
                role=UserRole.CUSTOMER,
            )
            db.add(user)
            try:
                await db.commit()
                await db.refresh(user)
            except Exception:
                await db.rollback()
                # A parallel sign-in may have created the same email.
                user = await self.get_by(db, email=email.lower())
                if user is None:
                    logger.exception("Failed to create %s social account", provider)
                    raise HTTPException(status_code=500, detail="Social sign-in failed")
        elif not user.profile_picture and claims.get("picture"):
            user.profile_picture = claims["picture"]
            await db.commit()
            await db.refresh(user)

        return await self._create_session(db, user)

    async def _verify_social_token(self, provider: str, id_token: str) -> dict:
        if provider not in {"google", "apple"}:
            raise HTTPException(status_code=400, detail="Unsupported sign-in provider")

        configured_client_ids = (
            settings.google_client_id if provider == "google" else settings.apple_client_id
        )
        client_ids = {
            client_id.strip()
            for client_id in configured_client_ids.split(",")
            if client_id.strip()
        }
        if not client_ids:
            raise HTTPException(status_code=503, detail=f"{provider.title()} sign-in is not configured")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                if provider == "google":
                    response = await client.get(GOOGLE_TOKENINFO_URL, params={"id_token": id_token})
                    response.raise_for_status()
                    claims = response.json()
                    if claims.get("aud") not in client_ids:
                        raise ValueError("Wrong audience")
                    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
                        raise ValueError("Wrong issuer")
                    return claims

                jwks_response = await client.get(APPLE_JWKS_URL)
                jwks_response.raise_for_status()
                header = jwt.get_unverified_header(id_token)
                key = next((item for item in jwks_response.json()["keys"] if item.get("kid") == header.get("kid")), None)
                if key is None:
                    raise ValueError("Unknown signing key")
                claims = jwt.decode(
                    id_token,
                    key,
                    algorithms=["RS256"],
                    audience=sorted(client_ids),
                    issuer="https://appleid.apple.com",
                )
                return claims
        except HTTPException:
            raise
        except (httpx.HTTPError, JWTError, ValueError, KeyError, TypeError):
            logger.info("Rejected invalid %s identity token", provider)
            raise HTTPException(status_code=401, detail="Invalid provider identity token") from None

    async def _create_session(self, db: AsyncSession, user: User) -> dict:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="This account has been blocked")
        user.last_login = datetime.now(timezone.utc).isoformat()
        await db.commit()
        await db.refresh(user)
        access_token = create_access_token(
            {"sub": str(user.id), "ver": user.token_version},
            timedelta(minutes=settings.access_token_expire_minutes),
        )
        refresh_token = await self._issue_refresh_token(db, user.id)
        return {"user": user, "access_token": access_token, "refresh_token": refresh_token}

    # ----- refresh & logout ----------------------------------------------

    async def refresh_session(self, db: AsyncSession, refresh_token: str) -> dict:
        token_row = await self._consume_refresh_token(db, refresh_token)
        user = await self.get(db, token_row.user_id)
        if user is None or not user.is_active:
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
        from sqlalchemy import delete
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == current_user.id))
        await db.commit()
        logger.info("Logged out user_id=%s", current_user.id)

    # ----- profile --------------------------------------------------------

    async def change_password(
        self,
        db: AsyncSession,
        current_user: User,
        request: ChangePasswordRequest,
    ) -> None:
        try:
            if not current_user.password_hash:
                raise HTTPException(
                    status_code=400,
                    detail="Password sign-in is not enabled for this account.",
                )
            if not verify_password(request.current_password, current_user.password_hash):
                raise HTTPException(status_code=401, detail="Current password is incorrect")
            current_user.password_hash = hash_password(request.new_password)
            await db.commit()
        except HTTPException:
            raise
        except Exception:
            await db.rollback()
            logger.exception("Password change failed for user_id=%s", current_user.id)
            raise HTTPException(status_code=500, detail="Password change failed") from None

    async def list_all(self, db: AsyncSession) -> list[User]:
        result = await db.execute(select(User).order_by(User.id.asc()))
        return list(result.scalars().all())

    async def prepare_admin(
        self,
        db: AsyncSession,
        username: str,
        email: str,
        password: str,
    ) -> User:
        normalized_email = email.lower()
        if await self.get_by(db, email=normalized_email):
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        user = User(
            username=username.strip(),
            email=normalized_email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        return user

    async def update_active_status(
        self,
        db: AsyncSession,
        user_id: int,
        is_active: bool,
        current_user: User,
    ) -> User:
        user = await self.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if user.id == current_user.id and not is_active:
            raise HTTPException(status_code=400, detail="You cannot block your own account.")

        user.is_active = is_active
        user.token_version += 1
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))
        await db.commit()
        await db.refresh(user)
        return user

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
