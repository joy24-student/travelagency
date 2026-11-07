"""
Test Cloudflare R2 Presigned Upload URL Restrictions.
"""

import uuid
import pytest
from httpx import AsyncClient

from tests.conftest import make_test_jwt


@pytest.mark.asyncio
async def test_presigned_upload_valid_pdf_under_5mb(client: AsyncClient):
    """Valid PDF document under 5MB generates single-use PUT upload URL."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id)

    payload = {
        "file_name": "passport_scan.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 2 * 1024 * 1024,  # 2 MB
        "entity_type": "kyc_document",
    }
    resp = await client.post(
        "/api/v1/storage/presigned-upload",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "upload_url" in data
    assert data["http_method"] == "PUT"
    assert data["key"].endswith(".pdf")
    assert "public_url" in data


@pytest.mark.asyncio
async def test_presigned_upload_invalid_mime_type_rejected(client: AsyncClient):
    """Disallowed MIME type (e.g. application/zip, text/plain) is rejected with 400 Bad Request."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id)

    payload = {
        "file_name": "malicious.zip",
        "mime_type": "application/zip",
        "size_bytes": 1024 * 1024,
        "entity_type": "avatar",
    }
    resp = await client.post(
        "/api/v1/storage/presigned-upload",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "BAD_REQUEST"
    assert "not permitted" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_presigned_upload_exceeding_5mb_rejected(client: AsyncClient):
    """Upload request exceeding 5MB is rejected with 422 or 400."""
    user_id = uuid.uuid4()
    token = make_test_jwt(user_id)

    payload = {
        "file_name": "huge_avatar.png",
        "mime_type": "image/png",
        "size_bytes": 6 * 1024 * 1024,  # 6 MB
        "entity_type": "avatar",
    }
    resp = await client.post(
        "/api/v1/storage/presigned-upload",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (400, 422)
