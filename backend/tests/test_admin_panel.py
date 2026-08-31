"""Admin Panel integration tests."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.roles import UserRole
from app.db.models.analytics_event import AnalyticsEvent
from app.db.models.project import Project
from app.db.models.user import User
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
    full_name: str = "Test User",
) -> tuple[str, dict]:
    register_response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert register_response.status_code == 201
    payload = register_response.json()
    return payload["access_token"], payload["user"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _set_user_role(email: str, role: UserRole) -> None:
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        user.role = role.value
        await session.commit()


async def _seed_run_for_user(user_id: uuid.UUID, project_id: uuid.UUID) -> None:
    async with async_session_factory() as session:
        session.add(
            AnalyticsEvent(
                owner_id=user_id,
                project_id=project_id,
                event_type="pipeline_run",
                model_id="loader/pdf",
                status="success",
                latency_ms=120.0,
                page_count=2,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_login_sets_last_login_at(client: AsyncClient):
    email = f"login-track-{uuid.uuid4()}@example.com"
    token, _ = await _register_and_login(client, email)

    me_before = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    assert me_before.json()["last_login_at"] is None

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["last_login_at"] is not None


@pytest.mark.asyncio
async def test_admin_user_crud_and_view_admin_read_only(client: AsyncClient):
    admin_email = f"panel-admin-{uuid.uuid4()}@example.com"
    view_admin_email = f"panel-view-{uuid.uuid4()}@example.com"
    user_email = f"panel-user-{uuid.uuid4()}@example.com"

    admin_token, _ = await _register_and_login(client, admin_email)
    view_admin_token, _ = await _register_and_login(client, view_admin_email)
    user_token, _ = await _register_and_login(client, user_email)

    await _set_user_role(admin_email, UserRole.ADMIN)
    await _set_user_role(view_admin_email, UserRole.VIEW_ADMIN)

    forbidden = await client.get("/api/v1/admin/users", headers=_auth_headers(user_token))
    assert forbidden.status_code == 403

    admin_list = await client.get("/api/v1/admin/users", headers=_auth_headers(admin_token))
    assert admin_list.status_code == 200
    assert len(admin_list.json()["items"]) >= 3

    view_list = await client.get("/api/v1/admin/users", headers=_auth_headers(view_admin_token))
    assert view_list.status_code == 200

    create_response = await client.post(
        "/api/v1/admin/users",
        json={
            "email": f"created-{uuid.uuid4()}@example.com",
            "password": "password123",
            "full_name": "Created User",
            "role": "user",
        },
        headers=_auth_headers(admin_token),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["full_name"] == "Created User"

    view_admin_create = await client.post(
        "/api/v1/admin/users",
        json={
            "email": f"blocked-{uuid.uuid4()}@example.com",
            "password": "password123",
            "full_name": "Blocked",
        },
        headers=_auth_headers(view_admin_token),
    )
    assert view_admin_create.status_code == 403

    patch_response = await client.patch(
        f"/api/v1/admin/users/{created['id']}",
        json={"role": "view_admin"},
        headers=_auth_headers(admin_token),
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["role"] == "view_admin"

    password_response = await client.post(
        f"/api/v1/admin/users/{created['id']}/password",
        json={"password": "new-password123"},
        headers=_auth_headers(admin_token),
    )
    assert password_response.status_code == 204

    updated_login = await client.post(
        "/api/v1/auth/login",
        json={"email": created["email"], "password": "new-password123"},
    )
    assert updated_login.status_code == 200

    view_admin_password = await client.post(
        f"/api/v1/admin/users/{created['id']}/password",
        json={"password": "blocked-password123"},
        headers=_auth_headers(view_admin_token),
    )
    assert view_admin_password.status_code == 403

    delete_response = await client.delete(
        f"/api/v1/admin/users/{created['id']}",
        headers=_auth_headers(admin_token),
    )
    assert delete_response.status_code == 204

    user_list_after_delete = await client.get(
        "/api/v1/admin/users",
        headers=_auth_headers(admin_token),
    )
    assert all(item["id"] != created["id"] for item in user_list_after_delete.json()["items"])


@pytest.mark.asyncio
async def test_user_analytics_scoped_even_for_admin(client: AsyncClient):
    admin_email = f"analytics-admin-{uuid.uuid4()}@example.com"
    other_email = f"analytics-other-{uuid.uuid4()}@example.com"

    admin_token, admin_user = await _register_and_login(client, admin_email)
    other_token, other_user = await _register_and_login(client, other_email)
    await _set_user_role(admin_email, UserRole.ADMIN)

    other_project_response = await client.post(
        "/api/v1/projects",
        json={"name": "Other user project"},
        headers=_auth_headers(other_token),
    )
    other_project_id = uuid.UUID(other_project_response.json()["id"])
    await _seed_run_for_user(uuid.UUID(other_user["id"]), other_project_id)

    admin_project_response = await client.post(
        "/api/v1/projects",
        json={"name": "Admin project"},
        headers=_auth_headers(admin_token),
    )
    admin_project_id = uuid.UUID(admin_project_response.json()["id"])
    await _seed_run_for_user(uuid.UUID(admin_user["id"]), admin_project_id)

    admin_summary = await client.get(
        "/api/v1/analytics/summary?range=30d",
        headers=_auth_headers(admin_token),
    )
    assert admin_summary.status_code == 200
    assert admin_summary.json()["pipeline_runs"] == 1

    platform_summary = await client.get(
        "/api/v1/admin/analytics/summary?range=30d",
        headers=_auth_headers(admin_token),
    )
    assert platform_summary.status_code == 200
    assert platform_summary.json()["pipeline_runs"] >= 2

    user_forbidden = await client.get(
        "/api/v1/admin/analytics/summary?range=30d",
        headers=_auth_headers(other_token),
    )
    assert user_forbidden.status_code == 403


@pytest.mark.asyncio
async def test_admin_user_leaderboard(client: AsyncClient):
    admin_email = f"leaderboard-admin-{uuid.uuid4()}@example.com"
    runner_email = f"leaderboard-runner-{uuid.uuid4()}@example.com"

    admin_token, _ = await _register_and_login(client, admin_email)
    runner_token, runner_user = await _register_and_login(client, runner_email)
    await _set_user_role(admin_email, UserRole.ADMIN)

    project_response = await client.post(
        "/api/v1/projects",
        json={"name": "Runner project"},
        headers=_auth_headers(runner_token),
    )
    project_id = uuid.UUID(project_response.json()["id"])
    await _seed_run_for_user(uuid.UUID(runner_user["id"]), project_id)

    leaderboard = await client.get(
        "/api/v1/admin/analytics/users?range=30d",
        headers=_auth_headers(admin_token),
    )
    assert leaderboard.status_code == 200
    items = leaderboard.json()["items"]
    assert any(item["email"] == runner_email for item in items)


@pytest.mark.asyncio
async def test_admin_analytics_breakdown_and_user_activity(client: AsyncClient):
    admin_email = f"breakdown-admin-{uuid.uuid4()}@example.com"
    runner_email = f"breakdown-runner-{uuid.uuid4()}@example.com"

    admin_token, _ = await _register_and_login(client, admin_email)
    runner_token, runner_user = await _register_and_login(client, runner_email)
    await _set_user_role(admin_email, UserRole.ADMIN)

    project_response = await client.post(
        "/api/v1/projects",
        json={"name": "Platform breakdown project", "icon": "scan", "color": "#12A65B"},
        headers=_auth_headers(runner_token),
    )
    assert project_response.status_code == 201
    project_id = uuid.UUID(project_response.json()["id"])

    patch_response = await client.patch(
        f"/api/v1/projects/{project_response.json()['id']}",
        json={
            "graph": {
                "nodes": [{"id": "node-breakdown", "modelId": "loader/pdf"}],
                "edges": [],
            },
        },
        headers=_auth_headers(runner_token),
    )
    assert patch_response.status_code == 200

    async with async_session_factory() as session:
        session.add(
            AnalyticsEvent(
                owner_id=uuid.UUID(runner_user["id"]),
                project_id=project_id,
                node_id="node-breakdown",
                event_type="pipeline_run",
                model_id="loader/pdf",
                status="success",
                latency_ms=90.0,
                page_count=1,
            )
        )
        await session.commit()

    projects = await client.get(
        "/api/v1/admin/analytics/projects",
        headers=_auth_headers(admin_token),
    )
    assert projects.status_code == 200
    project_items = projects.json()["items"]
    matched = next(
        (item for item in project_items if item["project_id"] == str(project_id)),
        None,
    )
    assert matched is not None
    assert matched["owner_email"] == runner_email
    assert matched["icon"] == "scan"
    assert matched["color"] == "#12A65B"
    assert matched["status"] is not None
    assert matched["node_count"] == 1
    assert matched["run_count"] >= 1

    nodes = await client.get(
        "/api/v1/admin/analytics/nodes",
        headers=_auth_headers(admin_token),
    )
    assert nodes.status_code == 200
    node_items = nodes.json()["items"]
    matched_node = next(
        (item for item in node_items if item["node_id"] == "node-breakdown"),
        None,
    )
    assert matched_node is not None
    assert matched_node["owner_email"] == runner_email
    assert matched_node["run_count"] >= 1

    documents = await client.get(
        "/api/v1/admin/analytics/documents",
        headers=_auth_headers(admin_token),
    )
    assert documents.status_code == 200
    assert isinstance(documents.json()["items"], list)

    user_activity = await client.get(
        "/api/v1/admin/analytics/user-activity",
        headers=_auth_headers(admin_token),
    )
    assert user_activity.status_code == 200
    activity_body = user_activity.json()
    assert activity_body["bucket"] == "day"
    assert any(bucket["active_users"] >= 1 for bucket in activity_body["items"])

    view_admin_email = f"breakdown-view-{uuid.uuid4()}@example.com"
    view_admin_token, _ = await _register_and_login(client, view_admin_email)
    await _set_user_role(view_admin_email, UserRole.VIEW_ADMIN)

    view_projects = await client.get(
        "/api/v1/admin/analytics/projects",
        headers=_auth_headers(view_admin_token),
    )
    assert view_projects.status_code == 200

    forbidden = await client.get(
        "/api/v1/admin/analytics/projects",
        headers=_auth_headers(runner_token),
    )
    assert forbidden.status_code == 403
