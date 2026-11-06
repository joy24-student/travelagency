"""
Tests for Supabase JWT Authentication and RBAC Dependencies.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AdminUser, Agency, UserProfile
from tests.conftest import create_test_jwt


@pytest.mark.asyncio
async def test_unauthenticated_request_fails(client: AsyncClient):
    """Requests to protected endpoints without Authorization header must return 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == 401
    assert data["title"] == "Unauthorized"
    assert "Missing Authorization" in data["detail"]
    assert response.headers["Content-Type"] == "application/problem+json"


@pytest.mark.asyncio
async def test_valid_user_jwt_resolves_profile(client: AsyncClient, db_session: AsyncSession):
    """Valid JWT resolves authenticated CurrentUser context."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id, email="traveller@example.com", role="user")

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(user_id)
    assert data["email"] == "traveller@example.com"
    assert data["role"] == "user"


@pytest.mark.asyncio
async def test_admin_rbac_enforcement(client: AsyncClient, db_session: AsyncSession):
    """Standard user is denied admin access (403), while admin user is allowed (200)."""
    normal_user_id = uuid.uuid4()
    normal_token = create_test_jwt(user_id=normal_user_id, role="user")

    # Regular user attempting admin endpoint
    resp_denied = await client.get("/api/v1/auth/verify-admin", headers={"Authorization": f"Bearer {normal_token}"})
    assert resp_denied.status_code == 403
    problem = resp_denied.json()
    assert problem["status"] == 403
    assert problem["title"] == "Forbidden"
    assert "Administrator privileges required" in problem["detail"]

    # Admin user
    admin_id = uuid.uuid4()
    admin_token = create_test_jwt(user_id=admin_id, role="admin")

    # Also register in admin_users table
    admin_record = AdminUser(user_id=admin_id, role="superadmin", status="active")
    db_session.add(admin_record)
    await db_session.commit()

    resp_allowed = await client.get("/api/v1/auth/verify-admin", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_allowed.status_code == 200
    assert resp_allowed.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_agency_rbac_enforcement(client: AsyncClient, db_session: AsyncSession):
    """Agency owners or users with agency role are authorized for agency endpoints."""
    agency_owner_id = uuid.uuid4()
    agency_token = create_test_jwt(user_id=agency_owner_id, role="agency")

    # Insert agency into DB
    agency = Agency(
        owner_user_id=agency_owner_id,
        name="Sundarban Eco Travels",
        verification_status="verified",
        status="active",
    )
    db_session.add(agency)
    await db_session.commit()

    resp = await client.get("/api/v1/auth/verify-agency", headers={"Authorization": f"Bearer {agency_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "agency"
    assert data["agency_id"] == str(agency.id)
