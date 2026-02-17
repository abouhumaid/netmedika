import io

def test_create_order_with_name(client):
    response = client.post(
        "/orders/create",
        data={"medicine_name": "Paracetamol"}
    )
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["medication_name"] == "Paracetamol"
    assert json_data["order_id"].startswith("ORD_")
    assert json_data["message"] == "Order created successfully"


def test_create_order_with_image(client):
    # Simulate file upload
    file_content = io.BytesIO(b"fake image content")
    response = client.post(
        "/orders/create",
        files={"uploaded_image": ("test.png", file_content, "image/png")}
    )
    assert response.status_code == 201
    json_data = response.json()
    assert "uploads/prescriptions/" in json_data["prescription_image"]


def test_get_my_orders(client):
    response = client.get("/orders/my-orders")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["user_id"] == "user_1"
    assert "orders" in json_data


def test_update_order_quantity(client):
    # First, create an order
    create_resp = client.post(
        "/orders/create",
        data={"medicine_name": "Ibuprofen"}
    )
    order_id = create_resp.json()["order_id"]

    # Update quantity
    update_resp = client.patch(f"/orders/update-quantity/{order_id}", params={"quantity": 5})
    assert update_resp.status_code == 200
    json_data = update_resp.json()
    assert json_data["new_quantity"] == 5


def test_delete_order(client):
    # First, create an order
    create_resp = client.post(
        "/orders/create",
        data={"medicine_name": "Amoxicillin"}
    )
    order_id = create_resp.json()["order_id"]

    # Delete the order
    delete_resp = client.delete(f"/orders/delete/{order_id}")
    assert delete_resp.status_code == 200
    json_data = delete_resp.json()
    assert json_data["success"] is True
    assert json_data["order_id"] == order_id
