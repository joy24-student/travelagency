"""
Pytest Test Fixtures and Async SQLite Test Suite Configuration.
"""

import os
import uuid
from typing import AsyncGenerator
import jwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set testing environment variables before importing app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = ""
os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-with-at-least-32-characters"
os.environ["BKASH_WEBHOOK_SECRET"] = "test-bkash-secret"
os.environ["NAGAD_WEBHOOK_SECRET"] = "test-nagad-secret"
os.environ["ROCKET_WEBHOOK_SECRET"] = "test-rocket-secret"
os.environ["STRIPE_WEBHOOK_SECRET"] = "test-stripe-secret"
os.environ["CARD_WEBHOOK_SECRET"] = "test-card-secret"

from app.api.deps import get_db
from app.core.config import settings
from app.core.database import Base
from app.main import app
from app.tasks.celery_app import celery_app

# Enable eager task execution during tests so tasks run synchronously without connecting to an external Redis broker
celery_app.conf.update(task_always_eager=True, task_eager_propagates=True)

# Test Async SQLite Engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def init_test_db():
    """Create all database tables in memory for testing."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide isolated async session per test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client overriding get_db dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def make_test_jwt(user_id: uuid.UUID, email: str = "traveler@shopnojatra.com", role: str = "user") -> str:
    """Generate signed test Supabase JWT."""
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "app_metadata": {"role": role},
        "user_metadata": {"full_name": "Test Traveler"},
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
