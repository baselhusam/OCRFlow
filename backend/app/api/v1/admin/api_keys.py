import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_member_manager
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.api_key import ApiKeyList, ApiKeyUsageSummary
from app.services import api_keys as api_keys_service

router = APIRouter()


@router.get("/api-keys", response_model=ApiKeyList)
async def list_platform_api_keys(
    _: User = Depends(require_member_manager), db: AsyncSession = Depends(get_db)
) -> ApiKeyList:
    return ApiKeyList(items=await api_keys_service.list_keys(db))


@router.get("/api-keys/{key_id}/usage", response_model=ApiKeyUsageSummary)
async def get_platform_api_key_usage(
    key_id: uuid.UUID, _: User = Depends(require_member_manager), db: AsyncSession = Depends(get_db)
) -> ApiKeyUsageSummary:
    keys = await api_keys_service.list_keys(db)
    if not any(key.id == key_id for key in keys):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return await api_keys_service.usage_summary(db, key_id=key_id)
