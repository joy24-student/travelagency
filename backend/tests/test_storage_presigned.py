"""
Tests for Cloudflare R2 Presigned Upload URL Generation and MIME Whitelisting.
"""

import uuid
import pytest
from httpx import AsyncClient

from tests.conftest import create_test_jwt


@pytest.mark.asyncio
async def test_presigned_url_generation_success(client: AsyncClient):
    """Authenticated user requests a presigned PUT URL for avatar upload."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id)

    payload = {
        "file_name": "profile_photo.png",
        "mime_type": "image/png",
        "size_bytes": 1024 * 500,  # 500 KB
        "entity_type": "avatar",
    }

    response = await client.post(
        "/api/v1/storage/upload-url",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "upload_url" in data
    assert "key" in data
    assert "avatars" in data["key"]
    assert data["http_method"] == "PUT"
    assert data["required_headers"]["Content-Type"] == "image/png"


@pytest.mark.asyncio
async def test_presigned_url_disallowed_mime_type(client: AsyncClient):
    """Uploading an unauthorized executable or script as an avatar is rejected."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id)

    payload = {
        "file_name": "malicious.exe",
        "mime_type": "application/x-msdownload",
        "size_bytes": 1024 * 10,
        "entity_type": "avatar",
    }

    response = await client.post(
        "/api/v1/storage/upload-url",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    problem = response.json()
    assert problem["status"] == 400
    assert "not permitted" in problem["detail"]


@pytest.mark.asyncio
async def test_presigned_url_file_too_large(client: AsyncClient):
    """Avatar exceeding 5MB max size is rejected."""
    user_id = uuid.uuid4()
    token = create_test_jwt(user_id=user_id)

    payload = {
        "file_name": "huge_avatar.jpg",
        "mime_type": "image/jpeg",
        "size_bytes": 10 * 1024 * 1024,  # 10 MB > 5MB limit
        "entity_type": "avatar",
    }

    response = await client.post(
        "/api/v1/storage/upload-url",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    problem = response.json()
    assert problem["status"] == 400
    assert "exceeds limit" in problem["detail"]
