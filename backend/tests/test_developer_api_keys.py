"""End-to-end coverage for developer keys and multipart pipeline submission."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.roles import UserRole
from app.db.models.user import User
from app.db.session import async_session_factory
from app.main import app

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.fixture(scope="session")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as http_client:
        yield http_client


async def _register(client: AsyncClient, email: str) -> tuple[str, dict]:
    response = await client.post("/api/v1/auth/register", json={"email": email, "password": "password123", "full_name": "Developer"})
    assert response.status_code == 201
    body = response.json()
    return body["access_token"], body["user"]


async def _set_role(email: str, role: UserRole) -> None:
    async with async_session_factory() as session:
        user = await session.scalar(select(User).where(User.email == email))
        assert user is not None
        user.role = role.value
        await session.commit()


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_developer_key_uploads_two_documents_and_tracks_failures(client: AsyncClient, monkeypatch, tmp_path):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "upload_dir", tmp_path)
    monkeypatch.setattr("app.api.v1.developer.enqueue_pipeline_run", lambda run_id: f"task-{run_id}")

    email = f"developer-{uuid.uuid4()}@example.com"
    token, developer = await _register(client, email)
    headers = _bearer(token)

    normal_key_attempt = await client.post("/api/v1/account/api-keys", json={"name": "blocked"}, headers=headers)
    assert normal_key_attempt.status_code == 403
    await _set_role(email, UserRole.DEVELOPER)

    pipeline = await client.post("/api/v1/pipelines", json={"name": "External invoices"}, headers=headers)
    assert pipeline.status_code == 201
    pipeline_id = pipeline.json()["id"]
    graph = {
        "nodes": [
            {"id": "layout", "modelId": "surya/layout", "position": {"x": 0, "y": 0}, "config": {}},
            {"id": "order", "modelId": "surya/reading-order", "position": {"x": 200, "y": 0}, "config": {}},
        ],
        "edges": [{"id": "edge", "source": "layout", "target": "order", "valid": True}],
    }
    assert (await client.patch(f"/api/v1/pipelines/{pipeline_id}", json={"graph": graph}, headers=headers)).status_code == 200

    await _set_role(email, UserRole.DEVELOPER)
    created = await client.post("/api/v1/account/api-keys", json={"name": "Invoice sync", "allowed_pipeline_ids": [pipeline_id]}, headers=headers)
    assert created.status_code == 201, created.text
    key = created.json()
    assert key["key"].startswith("ocrflow_")
    stored_key = (await client.get("/api/v1/account/api-keys", headers=headers)).json()["items"][0]
    assert "key" not in stored_key
    assert stored_key["allowed_pipeline_names"] == ["External invoices"]

    api_headers = {"X-API-Key": key["key"]}
    available = await client.get("/api/v1/developer/pipelines", headers=api_headers)
    assert available.status_code == 200
    assert [item["id"] for item in available.json()["items"]] == [pipeline_id]

    queued = await client.post(
        f"/api/v1/developer/pipelines/{pipeline_id}/documents",
        headers=api_headers,
        data={"output_format": "json"},
        files=[
            ("files", ("first.pdf", b"%PDF-1.4 first", "application/pdf")),
            ("files", ("second.pdf", b"%PDF-1.4 second", "application/pdf")),
        ],
    )
    assert queued.status_code == 202, queued.text
    body = queued.json()
    assert len(body["runs"]) == 2
    assert all(run["task_id"].startswith("task-") for run in body["runs"])
    job = await client.get(f"/api/v1/developer/jobs/{body['job_id']}", headers=api_headers)
    assert job.status_code == 200
    assert len(job.json()["items"]) == 2

    run = await client.get(f"/api/v1/developer/pipelines/{pipeline_id}/runs/{body['runs'][0]['id']}", headers=api_headers)
    assert run.status_code == 200
    invalid_format = await client.post(
        f"/api/v1/developer/pipelines/{pipeline_id}/documents", headers=api_headers,
        data={"output_format": "csv"}, files=[("files", ("bad.pdf", b"%PDF", "application/pdf"))],
    )
    assert invalid_format.status_code == 422

    key_list = await client.get("/api/v1/account/api-keys", headers=headers)
    stored = key_list.json()["items"][0]
    assert stored["request_count"] >= 4
    assert stored["document_count"] == 2
    assert stored["failed_requests"] >= 1
    usage = await client.get(f"/api/v1/account/api-keys/{key['id']}/usage", headers=headers)
    assert usage.status_code == 200
    assert any(item["pipeline_name"] == "External invoices" for item in usage.json()["timeline"])

    assert (await client.delete(f"/api/v1/account/api-keys/{key['id']}", headers=headers)).status_code == 204
    assert (await client.get("/api/v1/developer/pipelines", headers=api_headers)).status_code == 401

    admin_email = f"admin-{uuid.uuid4()}@example.com"
    admin_token, _ = await _register(client, admin_email)
    await _set_role(admin_email, UserRole.ADMIN)
    inventory = await client.get("/api/v1/admin/api-keys", headers=_bearer(admin_token))
    assert inventory.status_code == 200
    assert any(item["id"] == key["id"] and item["owner_id"] == developer["id"] for item in inventory.json()["items"])
