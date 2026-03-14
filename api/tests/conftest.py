import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. IMPORT YOUR BASE AND DB UTILS
from database import Base, get_db
from main import app

# 2. CRITICAL: IMPORT ALL MODELS SO THEY REGISTER WITH BASE.METADATA
# If these aren't imported, create_all() will create 0 tables.
from models.auth_model import User
from models.token_model import RefreshToken
from models.order_model import Order

# Use a specific test database file
TEST_DATABASE_URL = "sqlite:///./test_database.db"

@pytest.fixture(scope="session")
def db_engine():
    """Creates the engine and the tables once for the entire test session."""
    engine = create_engine(
        TEST_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
    
    # Create all tables registered with Base
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Cleanup after all tests are done
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_database.db"):
        os.remove("./test_database.db")

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provides a clean session for every single test function."""
    connection = db_engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Overrides the get_db dependency in the FastAPI app."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    # Clear overrides after the test to prevent side effects
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(client):
    """Helper to get a valid token for protected routes."""
    user_data = {
        "username": "testqa",
        "email": "qa@example.com",
        "password": "Password123!"
    }
    # Register
    client.post("/api/v1/auth/register", json=user_data)
    # Login
    response = client.post("/api/v1/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}