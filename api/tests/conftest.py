import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db, Base
from utils.auth import get_current_user

# ✅ In-memory DB — isolated, fast, no disk residue
DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=True,
    bind=engine
)


# ✅ Create tables once per session, drop them after all tests finish
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ✅ Each test gets a clean rolled-back transaction
@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


# ✅ Auth dependency is mocked out — no real login needed
@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = "user_123"
    user.is_admin = False
    return user


# ✅ App uses test DB and mock user for every request
@pytest.fixture
def client(db, mock_user):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app)
    app.dependency_overrides.clear()