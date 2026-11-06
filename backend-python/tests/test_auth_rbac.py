"""
Test Zero-Trust JWT Authentication and RBAC Role Enforcement.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AdminUser, Agency, UserProfile
from tests.conftest import make_test_jwt


@pytest.mark.asyncio
async def test_auth_me_unauthorized(client: AsyncClient):
    """Accessing /me without Authorization header returns 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    data = resp.json()
    assert data["code"] == "UNAUTHORIZED"
    assert "correlation_id" in data


@pytest.mark.asyncio
async def test_auth_me_valid_jwt(client: AsyncClient):
    """Accessing /me with valid Supabase JWT returns resolved CurrentUser profile."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id, email="guest@shopnojatra.com", role="user")

    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["success"] is True
    assert res_json["data"]["email"] == "guest@shopnojatra.com"
    assert res_json["data"]["role"] == "user"


@pytest.mark.asyncio
async def test_auth_admin_role_resolution(client: AsyncClient, db_session: AsyncSession):
    """User registered in admin_users table is elevated to ADMIN role."""
    admin_uuid = uuid.uuid4()
    admin_entry = AdminUser(user_id=admin_uuid, role="admin", status="active")
    db_session.add(admin_entry)
    await db_session.commit()

    token = make_test_jwt(admin_uuid, email="superadmin@shopnojatra.com", role="user")
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["data"]["role"] == "admin"
    assert "admin" in res_json["data"]["roles"]


@pytest.mark.asyncio
async def test_auth_inspect_claims(client: AsyncClient):
    """Accessing /inspect-claims returns decoded JWT metadata and zero-trust security claims."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id, email="dev@shopnojatra.com", role="user")

    resp = await client.get("/api/v1/auth/inspect-claims", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["success"] is True
    assert res_json["data"]["subject"] == str(user_id)
    assert res_json["data"]["email"] == "dev@shopnojatra.com"
    assert res_json["data"]["resolved_role"] == "user"
    assert "token_audience" in res_json["data"]
