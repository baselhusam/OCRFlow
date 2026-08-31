import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin, require_member_manager
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserItem,
    AdminUserList,
    AdminUserPasswordUpdate,
    AdminUserUpdate,
)
from app.services import admin_users as admin_users_service

router = APIRouter()


@router.get("/users", response_model=AdminUserList)
async def list_users(
    _: User = Depends(require_member_manager),
    db: AsyncSession = Depends(get_db),
) -> AdminUserList:
    return await admin_users_service.list_admin_users(db)


@router.post("/users", response_model=AdminUserItem, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserItem:
    try:
        return await admin_users_service.create_admin_user(db, payload)
    except ValueError as exc:
        if "already exists" in str(exc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/users/{user_id}", response_model=AdminUserItem)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserItem:
    try:
        return await admin_users_service.update_admin_user(
            db,
            user_id,
            payload,
            acting_user_id=current_user.id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_user_password(
    user_id: uuid.UUID,
    payload: AdminUserPasswordUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await admin_users_service.reset_admin_user_password(db, user_id, payload.password)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await admin_users_service.delete_admin_user(
            db,
            user_id,
            acting_user_id=current_user.id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
