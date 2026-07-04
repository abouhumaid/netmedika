import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Account created"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "user1", "email": "dup@example.com", "password": "password"},
    )
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "user2", "email": "dup@example.com", "password": "password"},
    )
    assert response.status_code == 400
    assert "Registration failed" in response.text


@pytest.mark.asyncio
async def test_login_and_refresh_flow(client):
    # Ensure a user exists for this test
    await client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "email": "login@example.com", "password": "pw123456"},
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "pw123456"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data and "refresh_token" in data

    old_refresh = data["refresh_token"]
    refresh_res = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert refresh_res.status_code == 200
    assert refresh_res.json().get("refresh_token") != old_refresh


@pytest.mark.asyncio
async def test_register_ignores_admin_role(client):
    register_res = await client.post("/api/v1/auth/register", json={
        "username": "adminuser",
        "email": "admin@example.com",
        "password": "securepassword123",
        "role": "admin",
    })
    assert register_res.status_code == 201

    login_res = await client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "securepassword123",
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "customer"


@pytest.mark.asyncio
async def test_logout_invalidates_refresh(client):
    # register + login to get tokens
    await client.post(
        "/api/v1/auth/register",
        json={"username": "lo", "email": "lo@example.com", "password": "pw12345678"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "lo@example.com", "password": "pw12345678"},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    headers = {"Authorization": f"Bearer {access}"}
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # The refresh token stored in DB should have been deleted; refreshing must fail
    refresh_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert refresh_res.status_code == 401

    profile_res = await client.get("/api/v1/profile/me", headers=headers)
    assert profile_res.status_code == 401


@pytest.mark.asyncio
async def test_admin_can_list_users_and_update_role(client, admin_headers):
    register_res = await client.post("/api/v1/auth/register", json={
        "username": "regularuser",
        "email": "regular@example.com",
        "password": "Password123!",
    })
    assert register_res.status_code == 201

    users_res = await client.get("/api/v1/auth/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()["users"]
    regular_user = next(user for user in users if user["email"] == "regular@example.com")
    assert regular_user["role"] == "customer"

    update_res = await client.patch(
        f"/api/v1/auth/users/{regular_user['id']}/role",
        json={"role": "admin"},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["user"]["role"] == "admin"