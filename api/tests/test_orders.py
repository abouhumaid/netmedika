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
    body = response.json()
    # If a file was saved, delete it to keep test environment clean
    prescription = body.get("prescription_image")
    if prescription:
        from pathlib import Path
        try:
            Path(prescription).unlink()
        except FileNotFoundError:
            pass

def test_order_authorization_bypass(client, auth_headers):
    """Test that a user cannot view another user's orders"""
    other_user_id = "999"
    response = client.get(f"/api/v1/orders/user/{other_user_id}", headers=auth_headers)
    assert response.status_code == 403


def test_admin_can_list_and_review_orders(client, auth_headers, admin_headers):
    create_response = client.post(
        "/api/v1/orders/create",
        data={
            "medicine_name": "Amoxicillin",
            "delivery_address": "42 Herbert Macaulay Way, Yaba, Lagos",
            "quantity": 1,
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    order_id = create_response.json()["order_id"]

    all_orders_response = client.get("/api/v1/orders/all", headers=admin_headers)
    assert all_orders_response.status_code == 200
    assert any(order["order_id"] == order_id for order in all_orders_response.json()["orders"])

    reject_response = client.patch(
        f"/api/v1/orders/{order_id}/review",
        json={"decision": "reject", "reason": "Prescription image is missing."},
        headers=admin_headers,
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["order"]["status"] == "rejected"
    assert reject_response.json()["order"]["rejection_reason"] == "Prescription image is missing."

    accept_response = client.patch(
        f"/api/v1/orders/{order_id}/review",
        json={"decision": "accept", "delivery_fee": 2500},
        headers=admin_headers,
    )
    assert accept_response.status_code == 200
    assert accept_response.json()["order"]["status"] == "verified"
    assert accept_response.json()["order"]["rejection_reason"] is None
    assert accept_response.json()["order"]["delivery_fee"] == 2500


def test_admin_can_fetch_order_detail(client, auth_headers, admin_headers):
    create_response = client.post(
        "/api/v1/orders/create",
        data={
            "medicine_name": "Ibuprofen",
            "delivery_address": "15 Marina Road, Lagos Island, Lagos",
            "quantity": 3,
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    order_id = create_response.json()["order_id"]

    detail_response = client.get(f"/api/v1/orders/{order_id}", headers=admin_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["order"]["order_id"] == order_id
    assert detail_response.json()["order"]["medication_name"] == "Ibuprofen"


def test_admin_can_delete_rejected_order(client, auth_headers, admin_headers):
    create_response = client.post(
        "/api/v1/orders/create",
        data={
            "medicine_name": "Cefuroxime",
            "delivery_address": "22 Allen Avenue, Ikeja, Lagos",
            "quantity": 1,
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    order_id = create_response.json()["order_id"]

    reject_response = client.patch(
        f"/api/v1/orders/{order_id}/review",
        json={"decision": "reject", "reason": "Incomplete order information."},
        headers=admin_headers,
    )
    assert reject_response.status_code == 200

    delete_response = client.delete(f"/api/v1/orders/delete/{order_id}", headers=admin_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["success"] is True
    assert delete_response.json()["order_id"] == order_id

    detail_response = client.get(f"/api/v1/orders/{order_id}", headers=admin_headers)
    assert detail_response.status_code == 404
