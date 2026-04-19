from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
import os
import bcrypt
from schemas.auth_schema import UserResponse, ChangePasswordRequest
from models.auth_model import User
from database import get_db
from utils.auth import get_current_user

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt(rounds=os.getenv("BCRYPT_ROUNDS", 12))
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user, from_attributes=True)


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password (requires Authorization header with Bearer token)
    """
    try:
        # Verify current password
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Update password
        current_user.password_hash = hash_password(request.new_password)
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
