import sys
from pathlib import Path

# Ensure the repository root is importable when tests run from the backend dir.
_APP_DIR = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _APP_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import httpx
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.database import Base, get_db
from backend.main import app

# Register every ORM model with Base.metadata for create_all().
from backend.model import Order, RefreshToken, User, UserRole  # noqa: F401


@pytest_asyncio.fixture
async def db_engine():
    """Create an isolated in-memory database for each test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    # Create all tables registered with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        yield engine
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


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

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    """Helper to get a valid token for protected routes."""
    user_data = {
        "username": "testqa",
        "email": "qa@example.com",
        "password": "Password123!",
    }
    register_response = await client.post("/api/v1/auth/register", json=user_data)
    assert register_response.status_code == 201
    response = await client.post("/api/v1/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"],
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(client, db_session):
    admin_data = {
        "username": "adminqa",
        "email": "adminqa@example.com",
        "password": "Password123!",
    }
    register_response = await client.post("/api/v1/auth/register", json=admin_data)
    assert register_response.status_code == 201

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
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
