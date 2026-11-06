"""
Pytest configuration, async test fixtures, database engine mocking, and test JWT helpers.
"""

import os
import sys
import uuid
from typing import AsyncGenerator
import jwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.flight import Airline, Airport, Flight, FlightSeat
from app.models.hotel import Hotel, HotelRoom, HotelRoomAvailability
from app.models.user import AccountProfile, AdminUser, Agency, UserProfile

# Test JWT Secret
TEST_JWT_SECRET = "test-supabase-jwt-secret-key-32-chars-long!"
settings.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
settings.SUPABASE_JWT_ALGORITHM = "HS256"

# In-memory SQLite async engine for lightning-fast hermetic test runs
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


def create_test_jwt(
    user_id: uuid.UUID,
    email: str = "testuser@shopnojatra.com",
    role: str = "user",
) -> str:
    """Create a signed Supabase JWT for testing."""
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "app_metadata": {"role": role},
        "user_metadata": {"full_name": "Test User", "role": role},
        "exp": 9999999999,
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Create all schema tables in test database once for test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yields clean isolated test session."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """FastAPI test client with database dependency override."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
