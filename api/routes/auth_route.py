from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import jwt
from schemas.auth_schema import *
from models.auth_model import User, UserRole
from database import get_db
from helpers.auth import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):

    try:
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        new_user = User(
            username=request.username,
            email=request.email,
            password_hash=hash_password(request.password),
            role=UserRole.CUSTOMER
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        access_token_expires = timedelta(
            minutes=int(
                os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)
            )
        )
        access_token = create_token(
            data={"sub": str(new_user.id)},
            expires_delta=access_token_expires
        )
        
        refresh_token_expires = timedelta(days=int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)))
        refresh_token = create_token(
            data={"sub": str(new_user.id), "type": "refresh"},
            expires_delta=refresh_token_expires
        )
        
        return AuthResponse(
            message="User registered successfully",
            user=UserResponse.from_orm(new_user),
            access_token=access_token,
            refresh_token=refresh_token
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
def login(request: LoginRequest, db: Session = Depends(get_db)):

    try:
        # Find user by email
        user = db.query(User).filter(User.email == request.email).first()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login
        # user.last_login = datetime.utcnow()
        # db.commit()
        # db.refresh(user)
        
        # Create tokens
        access_token_expires = timedelta(minutes=int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)))
        access_token = create_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        refresh_token_expires = timedelta(days=int(
    os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", 30)))
        refresh_token = create_token(
            data={"sub": str(user.id), "type": "refresh"},
            expires_delta=refresh_token_expires
        )
        
        return AuthResponse(
            message="Login successful",
            user=UserResponse.from_orm(user),
            access_token=access_token,
            refresh_token=refresh_token
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token
    """
    try:
        payload = jwt.decode(request.refresh_token, os.getenv("JWT_SECRET_KEY"), algorithms=[os.getenv("JWT_ALGORITHM")])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
        new_access_token = create_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=request.refresh_token,
            expires_in=os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") * 60
        )
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(token: str = None, db: Session = Depends(get_db)):
    """
    Logout user (requires Authorization header with Bearer token)
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required"
        )
    
    user = get_current_user(token, db)
    return {"message": f"User {user.email} logged out successfully"}
