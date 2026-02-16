# import pytest
from fastapi.testclient import TestClient
from main import app 

client = TestClient(app)

def test_register_success():

    data = {
        "username": "testuser",
        "email": "testmailer@test.com",
        "password": "testpassword"
    }

    res = client.post("/register", json=data)

    assert res.status_code == 201

    body = res.json()

    assert body["message"] == "User registered successfully"
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["user"]["email"] == data["email"]

