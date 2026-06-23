from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.auth_model import User, UserRole
from utils.auth import get_current_user
from schemas.auth_schema import *
from service.user_service import (
    register_user,
    login_user,
    list_all_users,
    update_user_role as svc_update_user_role,
    refresh_session,
    logout_user
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

def _require_admin(current_user: User) -> User:
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

@router.post("/register", status_code=201)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    register_user(db, request)
    return {"message": "Account created"}

@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    res = login_user(db, request)
    return AuthResponse(
        message="Login successful",
        user=UserResponse.model_validate(res["user"], from_attributes=True),
        access_token=res["access_token"],
        refresh_token=res["refresh_token"]
    )

@router.get("/users", response_model=dict)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    users = list_all_users(db)
    return {
        "users": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role.value if hasattr(user.role, "value") else user.role,
            }
            for user in users
        ]
    }

@router.patch("/users/{user_id}/role", response_model=dict)
def update_user_role_route(
    user_id: int,
    request: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = svc_update_user_role(db, user_id, request.role, current_user)
    return {
        "message": "User role updated successfully.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else user.role,
        },
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    res = refresh_session(db, request.refresh_token)
    return TokenResponse(
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
        expires_in=res["expires_in"]
    )

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logout_user(db, current_user)
    return {"message": "User logged out"}
