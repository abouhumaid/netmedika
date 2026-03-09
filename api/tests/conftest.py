import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_mock_engine # or your actual DB setup
from main import app # Adjust this to your app entry point
from database import get_db
from utils.auth import get_current_user

# Mock Database setup (using SQLite in-memory for speed)
@pytest.fixture
def db_session():
    # In a real scenario, you'd setup an engine and session here
    # and yield it. For brevity, we'll assume the app uses the mock.
    yield None 

# Mock User fixture
@pytest.fixture
def mock_user():
    class MockUser:
        id = "user_123"
        is_admin = False
    return MockUser()

# Override dependencies
@pytest.fixture(autouse=True)
def override_dependencies(mock_user):
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides = {}

@pytest.fixture
def client():
    return TestClient(app)