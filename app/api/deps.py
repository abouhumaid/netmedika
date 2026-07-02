"""Shared FastAPI dependencies used by every router."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.model.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated :class:`User` from the bearer token."""
    payload = decode_access_token(token)

    user_id = payload.get("sub")
    token_version = payload.get("ver")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if token_version is None or token_version != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    return user


def require_authenticated(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the request has a valid bearer token."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the request is authenticated *and* the user has admin role."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user
