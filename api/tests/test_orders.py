from http import client
import io

def test_create_order_no_input(auth_headers):
    """Test validation: must provide name OR image"""
    response = client.post("/api/v1/orders/create", data={"quantity": 1}, headers=auth_headers)
    assert response.status_code == 400
    assert "either a medicine name or a prescription image" in response.text

def test_create_order_with_valid_image(auth_headers):
    """Test magic byte validation with a fake PNG"""
    # Create a fake PNG header: \x89PNG\r\n\x1a\n
    file_content = b"\x89PNG\r\n\x1a\n" + b"some-random-data"
    file = {"uploaded_image": ("test.png", file_content, "image/png")}
    
    response = client.post(
        "/api/v1/orders/create",
        data={"medicine_name": "Panadol", "delivery_address": "123 Test Street, City Center", "quantity": 2},
        files=file,
        headers=auth_headers
    )
    assert response.status_code == 201
    assert "ORD_" in response.json()["order_id"]

def test_file_size_limit(auth_headers):
    """Test 5MB limit"""
    large_content = b"0" * (6 * 1024 * 1024) # 6MB
    file = {"uploaded_image": ("big.jpg", large_content, "image/jpeg")}
    
    response = client.post("/api/v1/orders/create", files=file, headers=auth_headers)
    assert response.status_code == 413
    assert "File too large" in response.text

def test_order_authorization_bypass(auth_headers):
    """Test that a user cannot view another user's orders unless admin"""
    other_user_id = "999"
    response = client.get(f"/api/v1/orders/user/{other_user_id}", headers=auth_headers)
    assert response.status_code == 403