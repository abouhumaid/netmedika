import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db, Base

# --- Test DB Setup ---
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"  # or your test DB URL

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables once before all tests
Base.metadata.create_all(bind=engine)


# --- Fixtures ---
@pytest.fixture
def db():
    """Each test gets a fresh rolled-back transaction."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """Inject test DB into the app."""
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user():
    """Unique user data per test to avoid conflicts."""
    uid = uuid.uuid4().hex[:8]
    return {
        "username": f"testuser_{uid}",
        "email": f"test_{uid}@example.com",
        "password": "strongpassword123"
    }


# --- Tests ---
def test_register_success(client, test_user):
    response = client.post("/api/v1/auth/register", json=test_user)
    assert response.status_code == 201
    assert response.json()["message"] == "Account created"


def test_register_duplicate_email(client, test_user):
    client.post("/api/v1/auth/register", json=test_user)
    response = client.post("/api/v1/auth/register", json=test_user)
    assert response.status_code == 400
    assert "Registration failed" in response.json()["detail"]


def test_login_success(client, test_user):
    client.post("/api/v1/auth/register", json=test_user)
    response = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == test_user["email"]


def test_login_invalid_credentials(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_refresh_token_rotation(client, test_user):
    client.post("/api/v1/auth/register", json=test_user)
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    old_refresh_token = login_res.json()["refresh_token"]

    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": old_refresh_token
    })
    assert refresh_res.status_code == 200
    new_refresh_token = refresh_res.json()["refresh_token"]
    assert new_refresh_token != old_refresh_token

    fail_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": old_refresh_token
    })
    assert fail_res.status_code == 401


def test_logout(client, test_user):
    client.post("/api/v1/auth/register", json=test_user)
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    access_token = login_res.json()["access_token"]

    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "User logged out"