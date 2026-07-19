from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.roles import UserRole
from app.core.security import hash_password
from app.db.models.analytics_event import AnalyticsEvent
from app.db.models.project import Project
from app.db.models.user import User
from app.schemas.admin import AdminUserCreate, AdminUserItem, AdminUserList, AdminUserUpdate
from app.services.bootstrap import ensure_admin_role


async def _load_user_stats(
    db: AsyncSession,
    user_ids: list[uuid.UUID],
) -> dict[uuid.UUID, dict[str, int | None]]:
    if not user_ids:
        return {}

    project_counts = {
        row.owner_id: int(row.project_count)
        for row in (
            await db.execute(
                select(Project.owner_id, func.count(Project.id).label("project_count"))
                .where(Project.owner_id.in_(user_ids))
                .group_by(Project.owner_id)
            )
        ).all()
    }

    run_rows = (
        await db.execute(
            select(
                AnalyticsEvent.owner_id,
                func.count(AnalyticsEvent.id).label("run_count"),
                func.coalesce(func.sum(AnalyticsEvent.page_count), 0).label("pages_processed"),
                func.max(AnalyticsEvent.created_at).label("last_run_at"),
            )
            .where(AnalyticsEvent.owner_id.in_(user_ids))
            .group_by(AnalyticsEvent.owner_id)
        )
    ).all()

    run_stats: dict[uuid.UUID, dict[str, int | None]] = {}
    for row in run_rows:
        run_stats[row.owner_id] = {
            "run_count": int(row.run_count or 0),
            "pages_processed": int(row.pages_processed or 0),
            "last_run_at": row.last_run_at,
        }

    result: dict[uuid.UUID, dict[str, int | None]] = {}
    for user_id in user_ids:
        stats = run_stats.get(user_id, {})
        result[user_id] = {
            "project_count": project_counts.get(user_id, 0),
            "run_count": stats.get("run_count", 0),
            "pages_processed": stats.get("pages_processed", 0),
            "last_run_at": stats.get("last_run_at"),
        }
    return result


def _to_admin_user_item(user: User, stats: dict[str, int | None]) -> AdminUserItem:
    return AdminUserItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        display_name=user.display_name,
        role=UserRole(user.role) if user.role in UserRole._value2member_map_ else UserRole.USER,
        is_active=user.is_active,
        project_count=int(stats.get("project_count", 0) or 0),
        run_count=int(stats.get("run_count", 0) or 0),
        pages_processed=int(stats.get("pages_processed", 0) or 0),
        last_login_at=user.last_login_at,
        last_run_at=stats.get("last_run_at"),  # type: ignore[arg-type]
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def list_admin_users(db: AsyncSession) -> AdminUserList:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    users = list(result.scalars().all())
    stats_map = await _load_user_stats(db, [user.id for user in users])
    items = [
        _to_admin_user_item(user, stats_map.get(user.id, {}))
        for user in users
    ]
    return AdminUserList(items=items)


async def create_admin_user(db: AsyncSession, payload: AdminUserCreate) -> AdminUserItem:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise ValueError("A user with this email already exists")

    settings = get_settings()
    role = payload.role.value
    if settings.admin_email.strip().lower() == payload.email.lower().strip():
        role = UserRole.ADMIN.value

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await ensure_admin_role(db, user.email)
    await db.refresh(user)

    stats_map = await _load_user_stats(db, [user.id])
    return _to_admin_user_item(user, stats_map.get(user.id, {}))


async def update_admin_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    *,
    acting_user_id: uuid.UUID,
) -> AdminUserItem:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise LookupError("User not found")

    updates = payload.model_dump(exclude_unset=True)
    if user_id == acting_user_id:
        if updates.get("is_active") is False:
            raise ValueError("You cannot deactivate your own account")
        if updates.get("role") is not None and updates["role"] != UserRole.ADMIN:
            raise ValueError("You cannot demote your own admin role")

    if "full_name" in updates:
        user.full_name = updates["full_name"]
    if "display_name" in updates:
        user.display_name = updates["display_name"]
    if "role" in updates and updates["role"] is not None:
        user.role = updates["role"].value
    if "is_active" in updates and updates["is_active"] is not None:
        user.is_active = updates["is_active"]

    await db.commit()
    await db.refresh(user)
    stats_map = await _load_user_stats(db, [user.id])
    return _to_admin_user_item(user, stats_map.get(user.id, {}))


async def deactivate_admin_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    acting_user_id: uuid.UUID,
) -> None:
    if user_id == acting_user_id:
        raise ValueError("You cannot deactivate your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise LookupError("User not found")

    user.is_active = False
    await db.commit()
