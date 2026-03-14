import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_mock_engine # Or real engine for integration
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
import os

# 1. Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def db_engine():
    from sqlalchemy import create_engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Creates a new database session for a test."""
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Overrides the get_db dependency to use the test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(client):
    """Helper fixture to provide a valid JWT header for protected routes."""
    # 1. Register and Login a dummy user
    client.post("/api/v1/auth/register", json={
        "username": "testuser", "email": "test@qa.com", "password": "password123"
    })
    response = client.post("/api/v1/auth/login", json={
        "email": "test@qa.com", "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}