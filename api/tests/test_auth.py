import pytest


# ----------------------------
# Test: Register
# ----------------------------

def test_register_user(client):

    data = {
        "username": "adam",
        "email": "adam@test.com",
        "password": "password123"
    }

    response = client.post("/auth/register", json=data)

    assert response.status_code == 201

    body = response.json()

    assert body["message"] == "User registered successfully"
    assert body["user"]["email"] == data["email"]
    assert "access_token" in body
    assert "refresh_token" in body


# ----------------------------
# Test: Register Duplicate
# ----------------------------

def test_register_duplicate_email(client):

    data = {
        "username": "adam2",
        "email": "adam@test.com",  # same email
        "password": "password123"
    }

    response = client.post("/auth/register", json=data)

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


# ----------------------------
# Test: Login
# ----------------------------

def test_login_success(client):

    data = {
        "email": "adam@test.com",
        "password": "password123"
    }

    response = client.post("/auth/login", json=data)

    assert response.status_code == 200

    body = response.json()

    assert body["message"] == "Login successful"
    assert "access_token" in body
    assert "refresh_token" in body


# ----------------------------
# Test: Login Failure
# ----------------------------

def test_login_wrong_password(client):

    data = {
        "email": "adam@test.com",
        "password": "wrongpass"
    }

    response = client.post("/auth/login", json=data)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


# ----------------------------
# Test: Refresh Token
# ----------------------------

def test_refresh_token(client):

    # First login to get refresh token
    login_data = {
        "email": "adam@test.com",
        "password": "password123"
    }

    login_response = client.post("/auth/login", json=login_data)

    refresh_token = login_response.json()["refresh_token"]

    refresh_data = {
        "refresh_token": refresh_token
    }

    response = client.post("/auth/refresh", json=refresh_data)

    assert response.status_code == 200

    body = response.json()

    assert "access_token" in body
    assert "refresh_token" in body
    assert body["refresh_token"] == refresh_token


# ----------------------------
# Test: Logout
# ----------------------------

def test_logout(client):

    # Login first
    login_data = {
        "email": "adam@test.com",
        "password": "password123"
    }

    login_response = client.post("/auth/login", json=login_data)

    access_token = login_response.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    response = client.post("/auth/logout", headers=headers)

    assert response.status_code == 200
    assert "logged out successfully" in response.json()["message"]
