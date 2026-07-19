from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import UserRole
from app.db.models.project import Project
from app.db.models.pipeline import Pipeline
from app.db.models.user import User


def can_write(user: User) -> bool:
    return user.user_role in (UserRole.ADMIN, UserRole.USER)


def can_read_all(user: User) -> bool:
    return user.user_role in (UserRole.ADMIN, UserRole.VIEW_ADMIN)


def can_manage_members(user: User) -> bool:
    return user.user_role in (UserRole.ADMIN, UserRole.VIEW_ADMIN)


def can_change_roles(user: User) -> bool:
    return user.user_role == UserRole.ADMIN


def resolve_owner_scope(user: User) -> uuid.UUID | None:
    if can_read_all(user):
        return None
    return user.id


def require_write_access(user: User) -> None:
    if not can_write(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )


async def get_accessible_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user: User,
) -> Project | None:
    query = select(Project).where(Project.id == project_id)
    owner_scope = resolve_owner_scope(user)
    if owner_scope is not None:
        query = query.where(Project.owner_id == owner_scope)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_accessible_pipeline(
    db: AsyncSession,
    pipeline_id: uuid.UUID,
    user: User,
) -> Pipeline | None:
    query = select(Pipeline).where(Pipeline.id == pipeline_id)
    owner_scope = resolve_owner_scope(user)
    if owner_scope is not None:
        query = query.where(Pipeline.owner_id == owner_scope)
    result = await db.execute(query)
    return result.scalar_one_or_none()

