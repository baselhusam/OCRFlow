"""Account, roles, and RBAC integration tests."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import get_settings
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.session import async_session_factory
from app.main import app
from app.services.bootstrap import ensure_admin_user

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


@pytest.mark.asyncio
async def test_register_defaults_to_user_role(client: AsyncClient):
    email = f"role-user-{uuid.uuid4()}@example.com"
    _, user = await _register_and_login(client, email)
    assert user["role"] == UserRole.USER.value
    assert user["preferences"]["appearance"] == "light"


@pytest.mark.asyncio
async def test_admin_email_promoted_on_register(client: AsyncClient):
    email = f"admin-promote-{uuid.uuid4()}@example.com"
    token, user = await _register_and_login(client, email, full_name="Promoted Admin")
    assert user["role"] == UserRole.USER.value

    async with async_session_factory() as session:
        from app.core.config import Settings
        from app.services.bootstrap import ensure_admin_role

        await ensure_admin_role(session, email, Settings(admin_email=email))

    me = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    assert me.json()["role"] == UserRole.ADMIN.value


@pytest.mark.asyncio
async def test_bootstrap_promotes_existing_admin_email(client: AsyncClient):
    settings = get_settings()
    email = f"bootstrap-{uuid.uuid4()}@example.com"

    token, _ = await _register_and_login(client, email)
    me_before = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    assert me_before.json()["role"] == UserRole.USER.value

    async with async_session_factory() as session:
        from app.core import config as config_module

        test_settings = config_module.Settings(admin_email=email)
        await ensure_admin_user(session, test_settings)

    me_after = await client.get("/api/v1/auth/me", headers=_auth_headers(token))
    assert me_after.json()["role"] == UserRole.ADMIN.value


@pytest.mark.asyncio
async def test_profile_and_preferences_update(client: AsyncClient):
    email = f"profile-{uuid.uuid4()}@example.com"
    token, _ = await _register_and_login(client, email)

    profile_response = await client.patch(
        "/api/v1/account/profile",
        json={
            "full_name": "Basel Mathar",
            "display_name": "Basel",
            "bio": "Building document pipelines.",
        },
        headers=_auth_headers(token),
    )
    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["full_name"] == "Basel Mathar"
    assert profile["display_name"] == "Basel"
    assert profile["bio"] == "Building document pipelines."

    prefs_response = await client.patch(
        "/api/v1/account/preferences",
        json={
            "appearance": "dark",
            "default_output_format": "json",
            "auto_run_on_upload": False,
        },
        headers=_auth_headers(token),
    )
    assert prefs_response.status_code == 200
    prefs = prefs_response.json()["preferences"]
    assert prefs["appearance"] == "dark"
    assert prefs["auto_run_on_upload"] is False


@pytest.mark.asyncio
async def test_members_list_and_role_change(client: AsyncClient):
    admin_email = f"admin-{uuid.uuid4()}@example.com"
    user_email = f"member-{uuid.uuid4()}@example.com"
    view_admin_email = f"view-admin-{uuid.uuid4()}@example.com"

    admin_token, admin_user = await _register_and_login(client, admin_email, full_name="Admin User")
    user_token, user_user = await _register_and_login(client, user_email, full_name="Regular User")
    view_admin_token, _ = await _register_and_login(client, view_admin_email, full_name="View Admin")

    await _set_user_role(admin_email, UserRole.ADMIN)
    await _set_user_role(view_admin_email, UserRole.VIEW_ADMIN)

    forbidden = await client.get("/api/v1/members", headers=_auth_headers(user_token))
    assert forbidden.status_code == 403

    admin_list = await client.get("/api/v1/members", headers=_auth_headers(admin_token))
    assert admin_list.status_code == 200
    assert len(admin_list.json()["items"]) >= 3

    view_admin_list = await client.get("/api/v1/members", headers=_auth_headers(view_admin_token))
    assert view_admin_list.status_code == 200

    change_role = await client.patch(
        f"/api/v1/members/{user_user['id']}",
        json={"role": UserRole.VIEW_ADMIN.value},
        headers=_auth_headers(admin_token),
    )
    assert change_role.status_code == 200
    assert change_role.json()["role"] == UserRole.VIEW_ADMIN.value

    view_admin_forbidden = await client.patch(
        f"/api/v1/members/{user_user['id']}",
        json={"role": UserRole.USER.value},
        headers=_auth_headers(view_admin_token),
    )
    assert view_admin_forbidden.status_code == 403


@pytest.mark.asyncio
async def test_view_admin_project_read_only(client: AsyncClient):
    owner_email = f"owner-{uuid.uuid4()}@example.com"
    view_admin_email = f"viewer-{uuid.uuid4()}@example.com"

    owner_token, _ = await _register_and_login(client, owner_email)
    view_admin_token, _ = await _register_and_login(client, view_admin_email)
    await _set_user_role(view_admin_email, UserRole.VIEW_ADMIN)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Owner pipeline"},
        headers=_auth_headers(owner_token),
    )
    assert create_response.status_code == 201
    project_id = create_response.json()["id"]

    list_response = await client.get("/api/v1/projects", headers=_auth_headers(view_admin_token))
    assert list_response.status_code == 200
    assert not any(item["id"] == project_id for item in list_response.json()["items"])

    get_response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(view_admin_token),
    )
    assert get_response.status_code == 200

    create_forbidden = await client.post(
        "/api/v1/projects",
        json={"name": "Blocked"},
        headers=_auth_headers(view_admin_token),
    )
    assert create_forbidden.status_code == 403

    patch_forbidden = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Renamed"},
        headers=_auth_headers(view_admin_token),
    )
    assert patch_forbidden.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_all_projects(client: AsyncClient):
    owner_email = f"proj-owner-{uuid.uuid4()}@example.com"
    admin_email = f"proj-admin-{uuid.uuid4()}@example.com"

    owner_token, _ = await _register_and_login(client, owner_email)
    admin_token, _ = await _register_and_login(client, admin_email)
    await _set_user_role(admin_email, UserRole.ADMIN)

    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "Cross-user project"},
        headers=_auth_headers(owner_token),
    )
    project_id = create_response.json()["id"]

    admin_get = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=_auth_headers(admin_token),
    )
    assert admin_get.status_code == 200

    admin_patch = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"description": "Updated by admin"},
        headers=_auth_headers(admin_token),
    )
    assert admin_patch.status_code == 200
    assert admin_patch.json()["description"] == "Updated by admin"
