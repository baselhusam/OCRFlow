import io
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.main import app

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.fixture(scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client


async def _register_and_login(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123", "full_name": "Test User"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _png_bytes() -> bytes:
    image = Image.new("RGB", (24, 24), color=(10, 20, 30))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_upload_and_load_image_asset(client: AsyncClient, tmp_path, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("OCRFLOW_UPLOAD_DIR", str(tmp_path / "uploads"))
    get_settings.cache_clear()

    email = f"assets-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    project_response = await client.post(
        "/api/v1/projects",
        json={"name": "Asset test"},
        headers=_auth_headers(token),
    )
    project_id = project_response.json()["id"]

    upload_response = await client.post(
        f"/api/v1/projects/{project_id}/assets",
        headers=_auth_headers(token),
        files={"file": ("sample.png", _png_bytes(), "image/png")},
    )
    assert upload_response.status_code == 201
    asset = upload_response.json()
    assert asset["format"] == "image"
    assert asset["asset_id"]

    loader_response = await client.post(
        "/api/v1/models/loader/image",
        headers=_auth_headers(token),
        json={
            "document": {"source": f"asset:{asset['asset_id']}", "format": "image"},
            "options": {"project_id": project_id},
        },
    )
    assert loader_response.status_code == 200
    body = loader_response.json()
    assert len(body["pages"]) == 1
    assert body["pages"][0]["page"]["width"] == 24

    get_settings.cache_clear()
