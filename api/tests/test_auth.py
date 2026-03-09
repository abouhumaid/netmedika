import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db

# We assume your test environment handles a clean DB for each run.
@pytest.fixture
def client():
    return TestClient(app)

# Helper data
test_user = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "strongpassword123"
}

def test_register_success(client):
    response = client.post("/api/v1/auth/register", json=test_user)
    assert response.status_code == 201
    assert response.json()["message"] == "Account created"

def test_register_duplicate_email(client):
    # First registration
    client.post("/api/v1/auth/register", json=test_user)
    # Second registration with same email
    response = client.post("/api/v1/auth/register", json=test_user)
    assert response.status_code == 400
    assert "Registration failed" in response.json()["detail"]

def test_login_success(client):
    # Ensure user exists
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

def test_refresh_token_rotation(client):
    # 1. Register and Login to get a refresh token
    client.post("/api/v1/auth/register", json=test_user)
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    old_refresh_token = login_res.json()["refresh_token"]

    # 2. Use refresh token to get a new one
    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": old_refresh_token
    })
    assert refresh_res.status_code == 200
    new_refresh_token = refresh_res.json()["refresh_token"]
    
    assert new_refresh_token != old_refresh_token  # Logic check: Token rotated?

    # 3. Try using the OLD refresh token again (should fail as it was deleted)
    fail_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": old_refresh_token
    })
    assert fail_res.status_code == 401

def test_logout(client):
    # 1. Login
    client.post("/api/v1/auth/register", json=test_user)
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    access_token = login_res.json()["access_token"]

    # 2. Logout (Pass Bearer token)
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "User logged out"