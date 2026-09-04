"""Account-facing API-key management for developer and admin users."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyList, ApiKeyUsageSummary
from app.services import api_keys as api_keys_service
from app.services.access_control import can_use_developer_api

router = APIRouter()


def _require_developer(user: User) -> None:
    if not can_use_developer_api(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer access is required")


@router.get("", response_model=ApiKeyList)
async def list_my_api_keys(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ApiKeyList:
    _require_developer(current_user)
    return ApiKeyList(items=await api_keys_service.list_keys(db, owner_id=current_user.id))


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ApiKeyCreated:
    _require_developer(current_user)
    read, secret = await api_keys_service.create_key(db, owner=current_user, payload=payload)
    return ApiKeyCreated(**read.model_dump(), key=secret)


@router.get("/{key_id}/usage", response_model=ApiKeyUsageSummary)
async def get_my_api_key_usage(
    key_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ApiKeyUsageSummary:
    _require_developer(current_user)
    keys = await api_keys_service.list_keys(db, owner_id=current_user.id)
    if not any(key.id == key_id for key in keys):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return await api_keys_service.usage_summary(db, key_id=key_id)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_my_api_key(
    key_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    _require_developer(current_user)
    try:
        await api_keys_service.revoke_key(db, key_id=key_id, owner_id=current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
