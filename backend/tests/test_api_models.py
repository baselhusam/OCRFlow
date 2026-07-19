import uuid

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from app.main import app

client = TestClient(app)


def _register_and_login(email: str, password: str = "password123") -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_models_catalog():
    response = client.get("/api/v1/models/")
    assert response.status_code == 200
    models = response.json()
    assert any(entry["id"] == "docling/layout-heron" for entry in models)


def test_get_model_metadata():
    response = client.get("/api/v1/models/docling/layout-heron")
    assert response.status_code == 200
    assert response.json()["status"] == "done"


def test_layout_heron_health_endpoint():
    response = client.post("/api/v1/models/docling/layout-heron/health")
    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == "docling/layout-heron"


def test_list_surya_models_in_catalog():
    response = client.get("/api/v1/models/")
    assert response.status_code == 200
    models = response.json()
    assert any(entry["id"] == "surya/layout" for entry in models)


def test_get_surya_model_metadata():
    response = client.get("/api/v1/models/surya/layout")
    assert response.status_code == 200
    assert response.json()["status"] == "done"


def test_surya_layout_health_endpoint():
    response = client.post("/api/v1/models/surya/layout/health")
    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == "surya/layout"


def test_model_inference_requires_authentication():
    response = client.post(
        "/api/v1/models/loader/page-at",
        json={"pages": [], "options": {"page_index": 0}},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_authenticated_model_inference_reaches_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        register_response = await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": f"model-auth-{uuid.uuid4()}@example.com",
                "password": "password123",
                "full_name": "Test User",
            },
        )
        assert register_response.status_code == 201
        token = register_response.json()["access_token"]

        response = await http_client.post(
            "/api/v1/models/loader/page-at",
            headers=_auth_headers(token),
            json={"pages": [], "options": {"page_index": 0}},
        )
    assert response.status_code == 503
    assert response.json()["error_code"] == "model_inference"
