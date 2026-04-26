from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
import secrets
from database import get_db
from models.auth_model import User
from models.token_model import RefreshToken
from utils.security import hash_password, verify_password, create_token
from utils.auth import get_current_user
from schemas.auth_schema import *


router = APIRouter(prefix="/api/v1/auth",tags=["Authentication"])


ACCESS_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
REFRESH_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))


def _require_admin(current_user: User) -> User:
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

@router.post("/register", status_code=201)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):

    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(400, "Registration failed")

    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password.strip()),
        role=request.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Account created"}


@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(User.email == request.email).first()

    # Trim the password to handle any whitespace issues
    password = request.password.strip()

    if not user or not verify_password(
        password,
        user.password_hash
    ):
        raise HTTPException(401, "Invalid credentials")

    # Access Token
    access_token = create_token(
        {"sub": str(user.id), "ver": user.token_version},
        timedelta(minutes=ACCESS_MIN)
    )

    # Refresh Token (Random String)
    refresh_token = secrets.token_urlsafe(64)

    expires = datetime.utcnow() + timedelta(days=REFRESH_DAYS)

    db_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires
    )

    db.add(db_token)
    db.commit()

    return AuthResponse(
        message="Login successful",
        user=UserResponse.from_orm(user),
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/users", response_model=dict)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    users = db.query(User).order_by(User.id.asc()).all()
    return {"users": [UserResponse.from_orm(user) for user in users]}


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):

    token_db = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token
    ).first()

    if not token_db:
        raise HTTPException(401, "Invalid refresh token")

    if token_db.expires_at < datetime.utcnow():
        db.delete(token_db)
        db.commit()
        raise HTTPException(401, "Token expired")

    user = db.query(User).filter(
        User.id == token_db.user_id
    ).first()

    # Rotate token
    db.delete(token_db)

    new_refresh = secrets.token_urlsafe(64)

    expires = datetime.utcnow() + timedelta(days=REFRESH_DAYS)

    db.add(RefreshToken(
        user_id=user.id,
        token=new_refresh,
        expires_at=expires
    ))

    db.commit()

    access_token = create_token(
        {"sub": str(user.id), "ver": user.token_version},
        timedelta(minutes=ACCESS_MIN)
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=ACCESS_MIN * 60
    )


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.token_version += 1

    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id
    ).delete()

    db.commit()

    return {"message": "User logged out"}
