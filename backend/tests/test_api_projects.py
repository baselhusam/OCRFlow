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


async def _register_and_login(
    client: AsyncClient,
    email: str,
    password: str = "password123",
) -> str:
    register_response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert register_response.status_code == 201
    return register_response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_list_projects(client: AsyncClient):
    email = f"projects-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Invoice pipeline"},
        headers=_auth_headers(token),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "Invoice pipeline"
    assert created["graph"] == {}
    assert "id" in created

    list_response = await client.get("/api/v1/projects", headers=_auth_headers(token))
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == created["id"]


@pytest.mark.asyncio
async def test_get_project_by_id(client: AsyncClient):
    email = f"project-get-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Layout test"},
        headers=_auth_headers(token),
    )
    project_id = create_response.json()["id"]

    get_response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(token),
    )
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Layout test"


@pytest.mark.asyncio
async def test_get_project_requires_ownership(client: AsyncClient):
    owner_email = f"owner-{uuid.uuid4()}@example.com"
    other_email = f"other-{uuid.uuid4()}@example.com"
    owner_token = await _register_and_login(client, owner_email)
    other_token = await _register_and_login(client, other_email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Private project"},
        headers=_auth_headers(owner_token),
    )
    project_id = create_response.json()["id"]

    other_get_response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(other_token),
    )
    assert other_get_response.status_code == 404


@pytest.mark.asyncio
async def test_projects_require_authentication(client: AsyncClient):
    response = await client.get("/api/v1/projects")
    assert response.status_code == 401

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Unauthorized"},
    )
    assert create_response.status_code == 401


@pytest.mark.asyncio
async def test_create_project_with_metadata_defaults(client: AsyncClient):
    email = f"meta-defaults-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Styled project"},
        headers=_auth_headers(token),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["icon"] == "file-text"
    assert created["color"] == "#5B2EEF"
    assert created["is_archived"] is False
    assert created["status"] == "draft"


@pytest.mark.asyncio
async def test_patch_project_metadata(client: AsyncClient):
    email = f"meta-patch-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Patch me", "icon": "scan", "color": "#12A65B"},
        headers=_auth_headers(token),
    )
    project_id = create_response.json()["id"]

    patch_response = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={
            "name": "Renamed",
            "description": "Updated description",
            "icon": "receipt",
            "color": "#FF5A2C",
            "is_archived": True,
            "status": "live",
        },
        headers=_auth_headers(token),
    )
    assert patch_response.status_code == 200
    updated = patch_response.json()
    assert updated["name"] == "Renamed"
    assert updated["description"] == "Updated description"
    assert updated["icon"] == "receipt"
    assert updated["color"] == "#FF5A2C"
    assert updated["is_archived"] is True
    assert updated["status"] == "live"


@pytest.mark.asyncio
async def test_patch_graph_derives_status(client: AsyncClient):
    email = f"graph-status-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Graph status"},
        headers=_auth_headers(token),
    )
    project_id = create_response.json()["id"]

    patch_response = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={
            "graph": {
                "nodes": [
                    {
                        "id": "n1",
                        "modelId": "pdf-loader",
                        "runtime": {"runStatus": "success"},
                    }
                ],
                "edges": [],
            }
        },
        headers=_auth_headers(token),
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["status"] == "live"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    email = f"delete-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Delete me"},
        headers=_auth_headers(token),
    )
    project_id = create_response.json()["id"]

    delete_response = await client.delete(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(token),
    )
    assert delete_response.status_code == 204

    get_response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(token),
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_requires_ownership(client: AsyncClient):
    owner_email = f"del-owner-{uuid.uuid4()}@example.com"
    other_email = f"del-other-{uuid.uuid4()}@example.com"
    owner_token = await _register_and_login(client, owner_email)
    other_token = await _register_and_login(client, other_email)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Protected"},
        headers=_auth_headers(owner_token),
    )
    project_id = create_response.json()["id"]

    delete_response = await client.delete(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(other_token),
    )
    assert delete_response.status_code == 404
