from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.roles import UserRole
from app.core.security import hash_password
from app.db.models.user import User


def _normalize_admin_email(settings: Settings) -> str | None:
    email = settings.admin_email.strip().lower()
    return email or None


async def ensure_admin_user(db: AsyncSession, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    admin_email = _normalize_admin_email(settings)
    if admin_email is None:
        return

    result = await db.execute(select(User).where(User.email == admin_email))
    user = result.scalar_one_or_none()

    if user is not None:
        if user.role != UserRole.ADMIN.value:
            user.role = UserRole.ADMIN.value
            await db.commit()
        return

    if not settings.admin_password:
        return

    user = User(
        email=admin_email,
        hashed_password=hash_password(settings.admin_password),
        full_name=settings.admin_full_name or None,
        role=UserRole.ADMIN.value,
    )
    db.add(user)
    await db.commit()


async def ensure_admin_role(db: AsyncSession, email: str, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    admin_email = _normalize_admin_email(settings)
    if admin_email is None or email.lower().strip() != admin_email:
        return

    result = await db.execute(select(User).where(User.email == admin_email))
    user = result.scalar_one_or_none()
    if user is None:
        return

    if user.role != UserRole.ADMIN.value:
        user.role = UserRole.ADMIN.value
        await db.commit()
