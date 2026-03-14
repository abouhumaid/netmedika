# test_orders.py
import io


def test_create_order_with_medicine_name(client):
    """Test creating an order using just text fields."""
    response = client.post(
        "/api/v1/orders/create",
        data={
            "medicine_name": "Paracetamol",
            "delivery_address": "123 Main St, Lagos, Nigeria",
            "quantity": 2
        }
    )
    assert response.status_code == 201
    assert response.json()["medication_name"] == "Paracetamol"


def test_create_order_file_too_large(client):
    """Test the 5MB file limit."""
    large_file = io.BytesIO(b"0" * (6 * 1024 * 1024))
    response = client.post(
        "/api/v1/orders/create",
        data={"delivery_address": "123 Main St, Lagos, Nigeria"},
        files={"uploaded_image": ("test.jpg", large_file, "image/jpeg")}
    )
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]


def test_create_order_invalid_magic_bytes(client):
    """Test that we can't fool the system with a fake extension."""
    fake_image = io.BytesIO(b"not-an-image-content")
    response = client.post(
        "/api/v1/orders/create",
        data={"delivery_address": "123 Main St, Lagos, Nigeria"},  # ← fixed
        files={"uploaded_image": ("legit.jpg", fake_image, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


def test_update_quantity_limits(client):
    """Test the ge=1, le=99 constraints."""
    create_res = client.post("/api/v1/orders/create", data={
        "medicine_name": "Paracetamol",
        "delivery_address": "123 Main St, Lagos",
        "quantity": 2
    })
    order_id = create_res.json()["order_id"]  # ← use real ID

    response = client.patch(f"/api/v1/orders/update-quantity/{order_id}?quantity=100")
    assert response.status_code == 422

    response = client.patch(f"/api/v1/orders/update-quantity/{order_id}?quantity=0")
    assert response.status_code == 422


def test_get_my_orders_unauthorized_admin_access(client):
    """Test that a non-admin cannot view someone else's orders."""
    response = client.get("/api/v1/orders/user/someone_else_id")
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]