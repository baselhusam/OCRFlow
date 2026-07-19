from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import UserPreferencesRead, UserPreferencesUpdate, UserProfileUpdate, UserRead

router = APIRouter()


def _merge_preferences(current: dict, updates: UserPreferencesUpdate) -> dict:
    merged = dict(current or {})
    for key, value in updates.model_dump(exclude_unset=True).items():
        merged[key] = value
    return merged


@router.patch("/profile", response_model=UserRead)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return UserRead.from_user(current_user)


@router.get("/preferences", response_model=UserPreferencesRead)
async def get_preferences(
    current_user: User = Depends(get_current_user),
) -> UserPreferencesRead:
    return UserPreferencesRead.model_validate(current_user.preferences or {})


@router.patch("/preferences", response_model=UserRead)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    current_user.preferences = _merge_preferences(current_user.preferences, payload)
    await db.commit()
    await db.refresh(current_user)
    return UserRead.from_user(current_user)
