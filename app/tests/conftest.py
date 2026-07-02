import os
import sys
from pathlib import Path

# Allow ``from app.X import Y`` when pytest is invoked from inside the app dir.
_APP_DIR = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _APP_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. IMPORT YOUR BASE AND DB UTILS
from app.core.database import Base, get_db
from app.main import app

# 2. CRITICAL: IMPORT ALL MODELS SO THEY REGISTER WITH BASE.METADATA
# If these aren't imported, create_all() will create 0 tables.
from app.model import Order, RefreshToken, User, UserRole  # noqa: F401

# Use a specific test database file
TEST_DATABASE_URL = "sqlite:///./test_database.db"


@pytest.fixture(scope="session")
def db_engine():
    """Creates the engine and the tables once for the entire test session."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    # Create all tables registered with Base
    Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup after all tests are done
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_database.db"):
        os.remove("./test_database.db")


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provides a clean session for every single test function."""
    connection = db_engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Overrides the get_db dependency in the FastAPI app."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    # Clear overrides after the test to prevent side effects
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Helper to get a valid token for protected routes."""
    user_data = {
        "username": "testqa",
        "email": "qa@example.com",
        "password": "Password123!",
    }
    client.post("/api/v1/auth/register", json=user_data)
    response = client.post("/api/v1/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"],
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client, db_session):
    admin_data = {
        "username": "adminqa",
        "email": "adminqa@example.com",
        "password": "Password123!",
    }
    client.post("/api/v1/auth/register", json=admin_data)

    user = db_session.query(User).filter(User.email == admin_data["email"]).first()
    if user:
        user.role = UserRole.ADMIN
        db_session.commit()

    response = client.post("/api/v1/auth/login", json={
        "email": admin_data["email"],
        "password": admin_data["password"],
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
