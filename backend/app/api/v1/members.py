import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin, require_member_manager
from app.core.roles import UserRole
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import MemberList, MemberRead, MemberUpdate

router = APIRouter()


@router.get("", response_model=MemberList)
async def list_members(
    _: User = Depends(require_member_manager),
    db: AsyncSession = Depends(get_db),
) -> MemberList:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    users = result.scalars().all()
    return MemberList(items=[MemberRead.from_user(user) for user in users])


@router.patch("/{user_id}", response_model=MemberRead)
async def update_member(
    user_id: uuid.UUID,
    payload: MemberUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MemberRead:
    if user_id == current_user.id:
        if payload.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account",
            )
        if payload.role is not None and payload.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot demote your own admin role",
            )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    if "role" in updates and updates["role"] is not None:
        user.role = updates["role"].value
    if "is_active" in updates and updates["is_active"] is not None:
        user.is_active = updates["is_active"]

    await db.commit()
    await db.refresh(user)
    return MemberRead.from_user(user)
