# import os
# from datetime import datetime, timedelta
# from typing import Optional
# from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
# from jose import JWTError
# import jwt
# from sqlalchemy.orm import Session
# from fastapi import Depends, HTTPException, status
# from database import get_db
# from models.auth_model import User
# from dotenv import load_dotenv
# load_dotenv()
# import bcrypt

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login") 

# SECRET_KEY = os.getenv("JWT_SECRET_KEY")
# ALGORITHM = os.getenv("JWT_ALGORITHMRITHM")
# ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
# REFRESH_TOKEN_EXPIRE_DAYS = os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")

# def hash_password(password: str) -> str:
#     """Hash a password using bcrypt"""
#     salt = bcrypt.gensalt(rounds=int(os.getenv("BCRYPT_ROUNDS", 2)))
#     return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


# def verify_password(password: str, password_hash: str) -> bool:
#     """Verify a password against its hash"""
#     return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

# security = HTTPBearer()

# def create_token(data: dict, expires_delta: Optional[timedelta] = None):
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.utcnow() + expires_delta
#     else:
#         expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt

# async def get_current_user(
#     credentials: HTTPAuthorizationCredentials = Depends(security),
#     db: Session = Depends(get_db)
# ) -> User:
#     try:
#         token = credentials.credentials
#         print(f"Received token: {token[:20]}...")  # DEBUG
        
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         user_id: str = payload.get("sub")
        
#         if user_id is None:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid authentication credentials",
#                 headers={"WWW-Authenticate": "Bearer"},
#             )
        
#         print(f"Decoded user_id: {user_id}")  # DEBUG
        
#     except JWTError as e:
#         print(f"JWT Error: {e}")  # DEBUG
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Could not validate credentials",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     user = db.query(User).filter(User.id == user_id).first()
    
#     if user is None:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="User not found",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     return user

    # helpers/auth.py

import jwt
from datetime import datetime, timedelta
import os
from fastapi import HTTPException, status
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    argon2__time_cost=2,
    argon2__memory_cost=65536,
    deprecated="auto"
)

JWT_SECRET_KEY = os.getenv("SECRET_KEY")
JWT_ALGORITHM = "HS256"

if not JWT_SECRET_KEY:
    raise RuntimeError("SECRET_KEY missing")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(password: str, hash: str):
    return pwd_context.verify(password, hash)


def create_token(data: dict, expires: timedelta):
    payload = data.copy()

    payload["exp"] = datetime.utcnow() + expires
    payload["iat"] = datetime.utcnow()

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str):

    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )