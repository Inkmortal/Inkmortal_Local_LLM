import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import sys
import asyncio

# Add the parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import Base, get_db
from app.main import app
from app.auth.models import User, RegistrationToken, APIKey
from app.auth.utils import get_password_hash
from app.queue import RabbitMQManager

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def queue_manager(event_loop):
    """Get a RabbitMQ manager instance"""
    manager = RabbitMQManager()
    await manager.connect()
    
    # Clear any existing queues
    await manager.clear_queue()
    
    yield manager
    
    # Cleanup
    await manager.clear_queue()
    await manager.close()

@pytest.fixture
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session):
    """Create a test client using the test database"""
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]

@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=get_password_hash("testpassword"),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_admin(db_session):
    """Create a test admin user"""
    admin = User(
        username="admin",
        email="admin@example.com",
        password_hash=get_password_hash("adminpassword"),
        is_active=True,
        is_admin=True
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin

@pytest.fixture
def test_registration_token(db_session):
    """Create a test registration token"""
    token = RegistrationToken(
        token="test-token",
        description="Test token",
        used=False
    )
    db_session.add(token)
    db_session.commit()
    db_session.refresh(token)
    return token

@pytest.fixture
def test_api_key(db_session, test_user):
    """Create a test API key"""
    api_key = APIKey(
        key="test-api-key",
        description="Test API key",
        user_id=test_user.id,
        priority=2,
        is_active=True
    )
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)
    return api_key

@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for a test user"""
    response = client.post(
        "/auth/token",
        data={
            "username": test_user.username,
            "password": "testpassword"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_headers(client, test_admin):
    """Get authentication headers for a test admin"""
    response = client.post(
        "/auth/token",
        data={
            "username": test_admin.username,
            "password": "adminpassword"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}