"""API lifecycle tests for reusable pipeline runs."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

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


async def test_pipeline_run_lifecycle(client: AsyncClient, monkeypatch, tmp_path):
    monkeypatch.setattr(
        "app.api.v1.pipeline_runs.enqueue_pipeline_run",
        lambda run_id: f"task-{run_id}",
    )
    revoked: list[str] = []
    monkeypatch.setattr(
        "app.api.v1.pipeline_runs.revoke_pipeline_run",
        lambda task_id: revoked.append(task_id),
    )

    from app.core.config import get_settings
    from app.schemas.asset import AssetMeta
    from pathlib import Path

    settings = get_settings()
    monkeypatch.setattr(settings, "upload_dir", tmp_path)

    token = await _register_and_login(client, f"pipe-run-{uuid.uuid4()}@example.com")
    headers = _auth_headers(token)

    pipeline_response = await client.post(
        "/api/v1/pipelines",
        json={"name": "API Layout"},
        headers=headers,
    )
    assert pipeline_response.status_code == 201
    pipeline_id = pipeline_response.json()["id"]

    graph = {
        "nodes": [
            {
                "id": "layout",
                "modelId": "surya/layout",
                "position": {"x": 0, "y": 0},
                "config": {},
            },
            {
                "id": "order",
                "modelId": "surya/reading-order",
                "position": {"x": 200, "y": 0},
                "config": {},
            },
        ],
        "edges": [
            {
                "id": "e1",
                "source": "layout",
                "target": "order",
                "valid": True,
            }
        ],
    }
    patch = await client.patch(
        f"/api/v1/pipelines/{pipeline_id}",
        json={"graph": graph},
        headers=headers,
    )
    assert patch.status_code == 200
    assert patch.json()["input_wire_kind"] is not None

    project = await client.post(
        "/api/v1/projects",
        json={"name": "Asset host"},
        headers=headers,
    )
    assert project.status_code == 201
    project_id = project.json()["id"]

    # Seed an asset on disk under the project namespace
    asset_id = str(uuid.uuid4())
    asset_dir = Path(tmp_path) / project_id / asset_id
    asset_dir.mkdir(parents=True)
    (asset_dir / "data").write_bytes(b"%PDF-1.4 fake")
    meta = AssetMeta(
        asset_id=asset_id,
        project_id=project_id,
        filename="doc.pdf",
        mime_type="application/pdf",
        size_bytes=12,
        format="pdf",
    )
    (asset_dir / "meta.json").write_text(meta.model_dump_json(), encoding="utf-8")

    start = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/runs",
        json={"asset_id": asset_id, "project_id": project_id},
        headers=headers,
    )
    assert start.status_code == 201, start.text
    run = start.json()
    assert run["status"] == "queued"
    assert run["task_id"] == f"task-{run['id']}"
    assert run["input_asset_id"] == asset_id

    listed = await client.get(f"/api/v1/pipelines/{pipeline_id}/runs", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == run["id"]

    cancel = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/runs/{run['id']}/cancel",
        headers=headers,
    )
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"
    assert revoked == [run["task_id"]]
