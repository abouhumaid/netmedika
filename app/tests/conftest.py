import os
import sys
from pathlib import Path

# Allow ``from app.X import Y`` when pytest is invoked from inside the app dir.
_APP_DIR = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _APP_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import pytest
import pytest_asyncio
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# 1. IMPORT YOUR BASE AND DB UTILS
from app.core.database import Base, get_db
from app.main import app

# 2. CRITICAL: IMPORT ALL MODELS SO THEY REGISTER WITH BASE.METADATA
# If these aren't imported, create_all() will create 0 tables.
from app.model import Order, RefreshToken, User, UserRole  # noqa: F401

# Use async SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_database.db"


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Creates the async engine and the tables once for the entire test session."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    # Create all tables registered with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup after all tests are done
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    if os.path.exists("./test_database.db"):
        os.remove("./test_database.db")


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Provides a clean async session for every single test function."""
    async_session_maker = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Overrides the get_db dependency in the FastAPI app."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    """Helper to get a valid token for protected routes."""
    user_data = {
        "username": "testqa",
        "email": "qa@example.com",
        "password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=user_data)
    response = await client.post("/api/v1/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"],
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(client, db_session):
    admin_data = {
        "username": "adminqa",
        "email": "adminqa@example.com",
        "password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=admin_data)

    result = await db_session.execute(
        select(User).where(User.email == admin_data["email"])
    )
    user = result.scalar_one_or_none()
    if user:
        user.role = UserRole.ADMIN
        await db_session.commit()

    response = await client.post("/api/v1/auth/login", json={
        "email": admin_data["email"],
        "password": admin_data["password"],
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}