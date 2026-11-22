import pytest

from backend.services.user import UserService


@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
        },
    )
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
    register_res = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "adminuser",
            "email": "admin@example.com",
            "password": "securepassword123",
            "role": "admin",
        },
    )
    assert register_res.status_code == 201

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "securepassword123"},
    )
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


@pytest.mark.asyncio
async def test_optional_profile_fields_are_returned(client):
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "profileuser",
            "email": "profile@example.com",
            "password": "securepassword123",
            "profile_picture": "https://example.com/avatar.png",
            "address": "12 Marina Road, Lagos",
        },
    )
    assert register_response.status_code == 201

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "profile@example.com", "password": "securepassword123"},
    )
    assert login_response.status_code == 200
    data = login_response.json()
    assert data["user"]["profile_picture"] == "https://example.com/avatar.png"
    assert data["user"]["address"] == "12 Marina Road, Lagos"

    profile_response = await client.get(
        "/api/v1/profile/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["address"] == "12 Marina Road, Lagos"


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["google", "apple"])
async def test_social_login_creates_customer_session(client, monkeypatch, provider):
    async def fake_verify_social_token(self, token_provider, id_token):
        assert token_provider == provider
        assert id_token == "valid-provider-id-token"
        return {
            "sub": f"{provider}-subject",
            "email": f"{provider}@example.com",
            "email_verified": True,
            "name": f"{provider.title()} User",
            "picture": "https://example.com/social-avatar.png",
        }

    monkeypatch.setattr(UserService, "_verify_social_token", fake_verify_social_token)
    response = await client.post(
        f"/api/v1/auth/{provider}",
        json={"id_token": "valid-provider-id-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == f"{provider}@example.com"
    assert data["user"]["role"] == "customer"
    assert data["user"]["profile_picture"] == "https://example.com/social-avatar.png"
    assert data["access_token"]
    assert data["refresh_token"]

    password_login = await client.post(
        "/api/v1/auth/login",
        json={"email": f"{provider}@example.com", "password": "password123"},
    )
    assert password_login.status_code == 401


@pytest.mark.asyncio
async def test_change_password_uses_async_service(client, auth_headers):
    response = await client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "Password123!", "new_password": "NewPassword123!"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "qa@example.com", "password": "NewPassword123!"},
    )
    assert login_response.status_code == 200
