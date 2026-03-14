import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# --- IMPORTANT: Import all models so Base knows they exist ---
from models.auth_model import User
from models.token_model import RefreshToken
from models.order_model import Order

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def db_engine():
    # Use check_same_thread: False for SQLite + FastAPI
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
    
    # Create the tables once for the whole test session
    Base.metadata.create_all(bind=engine)
    yield engine
    # Optional: Base.metadata.drop_all(bind=engine)