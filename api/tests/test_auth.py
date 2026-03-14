import pytest
from fastapi.testclient import TestClient
from main import app # Adjust based on your entry point

client = TestClient(app)

def test_register_success():
    response = client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123"
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Account created"

def test_register_duplicate_email():
    # First registration
    client.post("/api/v1/auth/register", json={
        "username": "user1", "email": "dup@example.com", "password": "password"
    })
    # Duplicate attempt
    response = client.post("/api/v1/auth/register", json={
        "username": "user2", "email": "dup@example.com", "password": "password"
    })
    assert response.status_code == 400
    assert "Registration failed" in response.text

def test_login_and_refresh_flow():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    refresh_token = data["refresh_token"]

    # 2. Refresh Token (Rotation check)
    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_res.status_code == 200
    assert refresh_res.json()["refresh_token"] != refresh_token # Ensure rotation