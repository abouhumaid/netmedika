import pytest


def test_register_success(client):
    response = client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Account created"


def test_register_duplicate_email(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "user1", "email": "dup@example.com", "password": "password"},
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "user2", "email": "dup@example.com", "password": "password"},
    )
    assert response.status_code == 400
    assert "Registration failed" in response.text


def test_login_and_refresh_flow(client):
    # Ensure a user exists for this test
    client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "email": "login@example.com", "password": "pw123456"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "pw123456"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data and "refresh_token" in data

    old_refresh = data["refresh_token"]
    refresh_res = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert refresh_res.status_code == 200
    assert refresh_res.json().get("refresh_token") != old_refresh


def test_logout_invalidates_refresh(client):
    # register + login to get tokens
    client.post(
        "/api/v1/auth/register",
        json={"username": "lo", "email": "lo@example.com", "password": "pw12345678"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "lo@example.com", "password": "pw12345678"},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    headers = {"Authorization": f"Bearer {access}"}
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # The refresh token stored in DB should have been deleted; refreshing must fail
    refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert refresh_res.status_code == 401