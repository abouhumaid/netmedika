import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.database import get_db
from .database_test import TestingSessionLocal


# Override DB dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)
