from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
import os
import bcrypt
from schemas.auth_schema import UserResponse, ChangePasswordRequest
from models.auth_model import User
from database import get_db
from utils.auth_func import get_current_user

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt(rounds=os.getenv("BCRYPT_ROUNDS", 12))
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_profile(token: str = None, db: Session = Depends(get_db)):
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required"
        )
    
    user = get_current_user(token, db)
    return UserResponse.from_orm(user)


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    request: ChangePasswordRequest,
    token: str = None,
    db: Session = Depends(get_db)
):
    """
    Change user password (requires Authorization header with Bearer token)
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required"
        )
    
    try:
        user = get_current_user(token, db)
        
        # Verify current password
        if not verify_password(request.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Update password
        user.password_hash = hash_password(request.new_password)
        db.commit()
        
        return {"message": "Password changed successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change failed: {str(e)}"
        )
