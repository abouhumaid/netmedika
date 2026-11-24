from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.core.database import get_db
from backend.model.user import User
from backend.schema.user import ChangePasswordRequest, UpdateProfileRequest, UserResponse
from backend.services.user import UserService
from backend.services.file_upload import FileUploadService

router = APIRouter(prefix="/profile", tags=["profile"])

_user_service = UserService()
_file_upload = FileUploadService()


async def _user_response(user: User) -> UserResponse:
    response = UserResponse.model_validate(user, from_attributes=True)
    return response.model_copy(
        update={"profile_picture": await _file_upload.resolve_image_url(response.profile_picture)}
    )


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return await _user_response(current_user)


@router.patch("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_me(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    current_user.username = request.username.strip()
    current_user.phone_number = request.phone_number.strip() if request.phone_number else None
    current_user.address = request.address.strip() if request.address else None
    await db.commit()
    await db.refresh(current_user)
    return await _user_response(current_user)


@router.post("/avatar", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_avatar(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    old_picture = current_user.profile_picture
    new_picture = await _file_upload.save_image(
        image,
        filename_prefix=f"user_{current_user.id}",
        folder="profiles",
    )
    current_user.profile_picture = new_picture
    try:
        await db.commit()
        await db.refresh(current_user)
    except Exception:
        await db.rollback()
        await _file_upload.delete_image(new_picture)
        raise
    if old_picture and old_picture != current_user.profile_picture:
        await _file_upload.delete_image(old_picture)
    return await _user_response(current_user)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Change the authenticated user's password."""
    await _user_service.change_password(db, current_user, request)
    return {"message": "Password changed successfully"}
