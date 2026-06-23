from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta
import os
from fastapi import HTTPException, status
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(
    schemes=["argon2"],
    argon2__time_cost=2,
    argon2__memory_cost=65536,
    deprecated="auto"
)

JWT_SECRET_KEY = os.getenv("SECRET_KEY")
if not JWT_SECRET_KEY:
    if os.getenv("ENV") == "production":
        raise RuntimeError("SECRET_KEY environment variable is required in production environment.")
    else:
        JWT_SECRET_KEY = "dev-fallback-secret-key-change-in-production"

JWT_ALGORITHM = "HS256"


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

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )