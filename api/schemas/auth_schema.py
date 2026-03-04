from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)
    role: Optional[UserRole] = UserRole.CUSTOMER

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    # last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


