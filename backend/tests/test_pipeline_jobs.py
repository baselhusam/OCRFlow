"""API tests for pipeline jobs (batch document apply)."""

from __future__ import annotations

from pathlib import Path
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.asset import AssetMeta
from app.services.pipeline_jobs import derive_job_status, upsert_node_trace

VALID_GRAPH = {
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
        {"id": "e1", "source": "layout", "target": "order", "valid": True},
    ],
}


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


def _seed_asset(tmp_path: Path, namespace: str, filename: str = "doc.pdf") -> str:
    asset_id = str(uuid.uuid4())
    asset_dir = tmp_path / namespace / asset_id
    asset_dir.mkdir(parents=True)
    (asset_dir / "data").write_bytes(b"%PDF-1.4 fake")
    meta = AssetMeta(
        asset_id=asset_id,
        project_id=namespace,
        filename=filename,
        mime_type="application/pdf",
        size_bytes=12,
        format="pdf",
    )
    (asset_dir / "meta.json").write_text(meta.model_dump_json(), encoding="utf-8")
    return asset_id


@pytest.mark.asyncio(loop_scope="session")
async def test_pipeline_job_lifecycle(client: AsyncClient, monkeypatch, tmp_path):
    monkeypatch.setattr(
        "app.api.v1.pipeline_jobs.enqueue_pipeline_run",
        lambda run_id: f"task-{run_id}",
    )
    revoked: list[str] = []
    monkeypatch.setattr(
        "app.api.v1.pipeline_jobs.revoke_pipeline_run",
        lambda task_id: revoked.append(task_id),
    )

    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "upload_dir", tmp_path)

    token = await _register_and_login(client, f"pipe-job-{uuid.uuid4()}@example.com")
    headers = _auth_headers(token)

    pipeline_response = await client.post(
        "/api/v1/pipelines",
        json={"name": "Batch layout", "graph": VALID_GRAPH},
        headers=headers,
    )
    assert pipeline_response.status_code == 201, pipeline_response.text
    pipeline_id = pipeline_response.json()["id"]
    namespace = f"pipeline-{pipeline_id}"
    asset_a = _seed_asset(tmp_path, namespace, "a.pdf")
    asset_b = _seed_asset(tmp_path, namespace, "b.pdf")

    start = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/jobs",
        json={"asset_ids": [asset_a, asset_b]},
        headers=headers,
    )
    assert start.status_code == 201, start.text
    job = start.json()
    assert job["document_count"] == 2
    assert job["status"] == "queued"
    assert len(job["items"]) == 2
    assert {item["input_filename"] for item in job["items"]} == {"a.pdf", "b.pdf"}
    assert all(item["job_id"] == job["id"] for item in job["items"])

    listed = await client.get("/api/v1/jobs", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == job["id"]
    assert listed.json()["items"][0]["pipeline_name"] == "Batch layout"

    detail = await client.get(f"/api/v1/jobs/{job['id']}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()["items"]) == 2

    cancel = await client.post(
        f"/api/v1/jobs/{job['id']}/cancel",
        headers=headers,
    )
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"
    assert cancel.json()["cancelled_count"] == 2
    assert len(revoked) == 2


def test_derive_job_status_partial():
    class _Run:
        def __init__(self, status: str) -> None:
            self.status = status
            self.error = "boom" if status == "failed" else None

    assert derive_job_status([]) == "queued"
    assert derive_job_status([_Run("queued"), _Run("queued")]) == "queued"
    assert derive_job_status([_Run("queued"), _Run("running")]) == "running"
    assert derive_job_status([_Run("succeeded"), _Run("succeeded")]) == "succeeded"
    assert derive_job_status([_Run("failed"), _Run("failed")]) == "failed"
    assert derive_job_status([_Run("succeeded"), _Run("failed")]) == "partial"
    assert derive_job_status([_Run("cancelled"), _Run("cancelled")]) == "cancelled"


def test_node_trace_keeps_item_counts_distinct_from_pages():
    class _Run:
        node_traces: list[dict] = []

    run = _Run()
    upsert_node_trace(
        run,  # type: ignore[arg-type]
        node_id="extract",
        model_id="ollama/vision-structured-extract",
        status="succeeded",
        item_count=4,
        output_kind="json",
    )

    trace = run.node_traces[0]
    assert trace["item_count"] == 4
    assert trace["output_kind"] == "json"
    assert trace["status"] == "succeeded"
    assert "page_count" not in trace
