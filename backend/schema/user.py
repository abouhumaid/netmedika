"""Pydantic schemas for users and authentication."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from backend.model.user import UserRole


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)
    profile_picture: str | None = None
    address: str | None = None


class CreateAdminRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)


class SocialLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: UserRole
    profile_picture: str | None = None
    address: str | None = None
    phone_number: str | None = None
    is_active: bool = True


class UpdateProfileRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    phone_number: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=500)


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)


class UpdateUserRoleRequest(BaseModel):
    role: UserRole


class UpdateUserStatusRequest(BaseModel):
    is_active: bool
