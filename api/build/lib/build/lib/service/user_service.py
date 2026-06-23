from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
import secrets
from models.auth_model import User, UserRole
from models.token_model import RefreshToken
from utils.security import hash_password, verify_password, create_token
from schemas.auth_schema import RegisterRequest, LoginRequest, ChangePasswordRequest

ACCESS_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
REFRESH_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))

def register_user(db: Session, request: RegisterRequest) -> User:
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(400, "Registration failed")

    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password.strip()),
        role=UserRole.CUSTOMER,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def login_user(db: Session, request: LoginRequest) -> dict:
    user = db.query(User).filter(User.email == request.email).first()
    password = request.password.strip()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    access_token = create_token(
        {"sub": str(user.id), "ver": user.token_version},
        timedelta(minutes=ACCESS_MIN)
    )

    refresh_token = secrets.token_urlsafe(64)
    expires = datetime.utcnow() + timedelta(days=REFRESH_DAYS)

    db_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires
    )

    db.add(db_token)
    db.commit()

    return {
        "user": user,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

def list_all_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id.asc()).all()

def update_user_role(db: Session, user_id: int, new_role: UserRole, current_user: User) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id and new_role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role.")

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user

def refresh_session(db: Session, refresh_token: str) -> dict:
    token_db = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
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

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "expires_in": ACCESS_MIN * 60
    }

def logout_user(db: Session, current_user: User) -> None:
    current_user.token_version += 1
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id
    ).delete()
    db.commit()

def change_user_password(db: Session, current_user: User, request: ChangePasswordRequest) -> None:
    try:
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Current password is incorrect"
            )
        
        current_user.password_hash = hash_password(request.new_password)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Password change failed: {str(e)}"
        )
