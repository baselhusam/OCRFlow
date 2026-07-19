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


async def test_project_run_lifecycle(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.project_runs.enqueue_project_run",
        lambda run_id: f"task-{run_id}",
    )
    revoked: list[str] = []
    monkeypatch.setattr(
        "app.api.v1.project_runs.revoke_project_run",
        lambda task_id: revoked.append(task_id),
    )

    token = await _register_and_login(client, f"runs-{uuid.uuid4()}@example.com")
    headers = _auth_headers(token)

    project_response = await client.post(
        "/api/v1/projects",
        json={"name": "Run lifecycle"},
        headers=headers,
    )
    assert project_response.status_code == 201
    project_id = project_response.json()["id"]

    graph = {
        "nodes": [
            {
                "id": "loader",
                "modelId": "loader/image",
                "position": {"x": 0, "y": 0},
                "config": {"assetId": "asset-1", "format": "image"},
            }
        ],
        "edges": [],
    }
    patch_response = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"graph": graph},
        headers=headers,
    )
    assert patch_response.status_code == 200

    start_response = await client.post(
        f"/api/v1/projects/{project_id}/runs",
        headers=headers,
    )
    assert start_response.status_code == 201
    run = start_response.json()
    assert run["status"] == "queued"
    assert run["task_id"] == f"task-{run['id']}"
    assert run["total_count"] == 1

    get_response = await client.get(
        f"/api/v1/projects/{project_id}/runs/{run['id']}",
        headers=headers,
    )
    assert get_response.status_code == 200
    assert get_response.json()["id"] == run["id"]

    list_response = await client.get(f"/api/v1/projects/{project_id}/runs", headers=headers)
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["items"]] == [run["id"]]

    cancel_response = await client.post(
        f"/api/v1/projects/{project_id}/runs/{run['id']}/cancel",
        headers=headers,
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "cancelled"
    assert revoked == [run["task_id"]]


async def test_project_runs_require_authentication(client: AsyncClient):
    response = await client.post(f"/api/v1/projects/{uuid.uuid4()}/runs")
    assert response.status_code == 401
