"""Analytics API integration tests."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models.analytics_event import AnalyticsEvent
from app.db.models.project_run import ProjectRun
from app.db.session import async_session_factory
from app.main import app

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.fixture(scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client


async def _register_and_login(
    client: AsyncClient,
    email: str,
    password: str = "password123",
) -> str:
    register_response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Analytics User"},
    )
    assert register_response.status_code == 201
    return register_response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_analytics_overview_endpoint(client: AsyncClient):
    email = f"analytics-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Analytics project"},
        headers=_auth_headers(token),
    )
    assert create_response.status_code == 201
    project_id = create_response.json()["id"]

    patch_response = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={
            "graph": {
                "nodes": [
                    {"id": "n1", "modelId": "loader/pdf"},
                ],
                "edges": [],
            },
        },
        headers=_auth_headers(token),
    )
    assert patch_response.status_code == 200

    overview_response = await client.get(
        "/api/v1/analytics/overview",
        headers=_auth_headers(token),
    )
    assert overview_response.status_code == 200
    body = overview_response.json()
    assert body["project_count"] == 1
    assert body["total_nodes"] == 1
    assert body["unique_models"] == 1
    assert body["total_runs"] == 0

    filtered_response = await client.get(
        f"/api/v1/analytics/overview?project_id={project_id}",
        headers=_auth_headers(token),
    )
    assert filtered_response.status_code == 200
    assert filtered_response.json()["project_count"] == 1


@pytest.mark.asyncio
async def test_analytics_breakdown_endpoints(client: AsyncClient):
    email = f"analytics-tables-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Breakdown project"},
        headers=_auth_headers(token),
    )
    assert create_response.status_code == 201
    project_id = create_response.json()["id"]

    patch_response = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={
            "graph": {
                "nodes": [{"id": "node-a", "modelId": "loader/image"}],
                "edges": [],
            },
        },
        headers=_auth_headers(token),
    )
    assert patch_response.status_code == 200

    projects = await client.get("/api/v1/analytics/projects", headers=_auth_headers(token))
    assert projects.status_code == 200
    assert len(projects.json()["items"]) == 1

    nodes = await client.get("/api/v1/analytics/nodes", headers=_auth_headers(token))
    assert nodes.status_code == 200
    assert len(nodes.json()["items"]) == 1
    assert nodes.json()["items"][0]["node_id"] == "node-a"

    activity = await client.get("/api/v1/analytics/activity", headers=_auth_headers(token))
    assert activity.status_code == 200
    assert activity.json()["bucket"] == "day"

    models = await client.get("/api/v1/analytics/models", headers=_auth_headers(token))
    assert models.status_code == 200
    assert models.json()["items"] == []

    documents = await client.get("/api/v1/analytics/documents", headers=_auth_headers(token))
    assert documents.status_code == 200
    assert documents.json()["items"] == []


async def _seed_analytics_events(
    *,
    owner_id: uuid.UUID,
    project_id: uuid.UUID,
    current_count: int = 3,
    previous_count: int = 1,
) -> None:
    now = datetime.now(tz=UTC)
    current_start = now - timedelta(days=5)
    previous_start = now - timedelta(days=35)

    async with async_session_factory() as session:
        for index in range(current_count):
            session.add(
                AnalyticsEvent(
                    owner_id=owner_id,
                    project_id=project_id,
                    node_id=f"node-{index}",
                    event_type="pipeline_run",
                    model_id="loader/pdf",
                    status="success" if index < current_count - 1 else "error",
                    latency_ms=3200.0 + index * 100,
                    page_count=2,
                    metadata_={"run_kind": "pipeline_run"},
                    created_at=current_start + timedelta(hours=index),
                )
            )
        for index in range(previous_count):
            session.add(
                AnalyticsEvent(
                    owner_id=owner_id,
                    project_id=project_id,
                    node_id=f"prev-node-{index}",
                    event_type="pipeline_run",
                    model_id="loader/pdf",
                    status="success",
                    latency_ms=2800.0,
                    page_count=1,
                    metadata_={"run_kind": "pipeline_run"},
                    created_at=previous_start + timedelta(hours=index),
                )
            )
        await session.commit()


@pytest.mark.asyncio
async def test_analytics_summary_and_dashboard_endpoints(client: AsyncClient):
    email = f"analytics-dash-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    register_body = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    owner_id = uuid.UUID(register_body.json()["id"])

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "invoice-pipeline"},
        headers=_auth_headers(token),
    )
    assert create_response.status_code == 201
    project_id = uuid.UUID(create_response.json()["id"])

    await _seed_analytics_events(owner_id=owner_id, project_id=project_id)

    summary_response = await client.get(
        "/api/v1/analytics/summary?range=30d",
        headers=_auth_headers(token),
    )
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["range"] == "30d"
    assert summary["pipeline_runs"] == 3
    assert summary["pages_processed"] == 6
    assert len(summary["kpis"]) == 4

    outcomes_response = await client.get(
        "/api/v1/analytics/outcomes?range=30d",
        headers=_auth_headers(token),
    )
    assert outcomes_response.status_code == 200
    outcomes = outcomes_response.json()
    assert outcomes["total_runs"] == 3
    assert len(outcomes["segments"]) >= 2

    top_response = await client.get(
        "/api/v1/analytics/top-pipelines?range=30d",
        headers=_auth_headers(token),
    )
    assert top_response.status_code == 200
    top_items = top_response.json()["items"]
    assert len(top_items) == 1
    assert top_items[0]["name"] == "invoice-pipeline"
    assert top_items[0]["run_count"] == 3

    runs_response = await client.get(
        "/api/v1/analytics/runs?range=30d&limit=5",
        headers=_auth_headers(token),
    )
    assert runs_response.status_code == 200
    runs = runs_response.json()
    assert runs["total"] == 3
    assert len(runs["items"]) == 3
    assert runs["items"][0]["pipeline_name"] == "invoice-pipeline"

    export_response = await client.get(
        "/api/v1/analytics/export?range=30d",
        headers=_auth_headers(token),
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("text/csv")
    assert "OCRFlow Analytics Export" in export_response.text
    assert "invoice-pipeline" in export_response.text


@pytest.mark.asyncio
async def test_project_run_events_count_as_full_pipeline_runs(client: AsyncClient):
    email = f"analytics-project-run-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    me_response = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    owner_id = uuid.UUID(me_response.json()["id"])

    project_response = await client.post(
        "/api/v1/projects",
        json={"name": "durable-run-project"},
        headers=_auth_headers(token),
    )
    assert project_response.status_code == 201
    project_id = uuid.UUID(project_response.json()["id"])

    async with async_session_factory() as session:
        run = ProjectRun(
            project_id=project_id,
            owner_id=owner_id,
            status="succeeded",
            graph_snapshot={},
        )
        session.add(run)
        await session.flush()
        session.add(
            AnalyticsEvent(
                owner_id=owner_id,
                project_id=project_id,
                project_run_id=run.id,
                event_type="project_run",
                model_id="project-run",
                status="success",
                latency_ms=1200.0,
                page_count=4,
                metadata_={"run_kind": "pipeline_run"},
            )
        )
        await session.commit()

    summary_response = await client.get(
        "/api/v1/analytics/summary?range=30d",
        headers=_auth_headers(token),
    )
    assert summary_response.status_code == 200
    assert summary_response.json()["pipeline_runs"] == 1
    assert summary_response.json()["pages_processed"] == 4

    runs_response = await client.get(
        "/api/v1/analytics/runs?range=30d",
        headers=_auth_headers(token),
    )
    assert runs_response.status_code == 200
    runs = runs_response.json()
    assert runs["total"] == 1
    assert runs["items"][0]["pipeline_name"] == "durable-run-project"


@pytest.mark.asyncio
async def test_analytics_summary_respects_project_filter(client: AsyncClient):
    email = f"analytics-filter-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    register_body = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    owner_id = uuid.UUID(register_body.json()["id"])

    project_a = await client.post(
        "/api/v1/projects",
        json={"name": "project-a"},
        headers=_auth_headers(token),
    )
    project_b = await client.post(
        "/api/v1/projects",
        json={"name": "project-b"},
        headers=_auth_headers(token),
    )
    project_a_id = uuid.UUID(project_a.json()["id"])
    project_b_id = uuid.UUID(project_b.json()["id"])

    await _seed_analytics_events(owner_id=owner_id, project_id=project_a_id, current_count=2)
    await _seed_analytics_events(owner_id=owner_id, project_id=project_b_id, current_count=5)

    filtered = await client.get(
        f"/api/v1/analytics/summary?range=30d&project_id={project_a_id}",
        headers=_auth_headers(token),
    )
    assert filtered.status_code == 200
    assert filtered.json()["pipeline_runs"] == 2
