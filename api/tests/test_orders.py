import pytest

# DO NOT import http.client here
# The 'client' and 'auth_headers' arguments tell pytest to use your conftest fixtures

def test_create_order_no_input(client, auth_headers):
    """Test validation: must provide name OR image"""
    # Use 'client' (the fixture), not 'http.client'
    response = client.post(
        "/api/v1/orders/create", 
        data={"quantity": 1}, 
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "either a medicine name or a prescription image" in response.json()["detail"]

def test_create_order_with_valid_image(client, auth_headers):
    """Test magic byte validation with a fake PNG"""
    file_content = b"\x89PNG\r\n\x1a\n" + b"some-random-data"
    files = {"uploaded_image": ("test.png", file_content, "image/png")}
    
    # Ensure 'client' is passed as a function argument above
    response = client.post(
        "/api/v1/orders/create",
        data={
            "medicine_name": "Panadol", 
            "delivery_address": "123 Test Street, City Center", 
            "quantity": 2
        },
        files=files,
        headers=auth_headers
    )
    assert response.status_code == 201

def test_order_authorization_bypass(client, auth_headers):
    """Test that a user cannot view another user's orders"""
    other_user_id = "999"
    response = client.get(f"/api/v1/orders/user/{other_user_id}", headers=auth_headers)
    assert response.status_code == 403