from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from schemas.auth_schema import UserResponse, ChangePasswordRequest
from models.auth_model import User
from database import get_db
from utils.auth import get_current_user
from service.user_service import change_user_password

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

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
    change_user_password(db, current_user, request)
    return {"message": "Password changed successfully"}
