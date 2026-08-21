"""Project asset upload and retrieval routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.asset import (
    AssetBatchUploadResponse,
    AssetListResponse,
    AssetUploadResponse,
)
from app.services.access_control import get_accessible_project, require_write_access
from app.services.asset_storage import (
    delete_project_asset,
    list_project_assets,
    load_asset_bytes,
    load_asset_meta,
    save_project_asset,
)

router = APIRouter()

_MAX_BATCH_FILES = 50


@router.post(
    "/{project_id}/assets",
    response_model=AssetUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_asset(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssetUploadResponse:
    require_write_access(current_user)
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    settings = get_settings()
    return await save_project_asset(
        upload_dir=settings.upload_dir,
        project_id=str(project_id),
        file=file,
    )


@router.post(
    "/{project_id}/assets/batch",
    response_model=AssetBatchUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_assets_batch(
    project_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssetBatchUploadResponse:
    """Upload many documents in one request for bulk OCR workflows."""
    require_write_access(current_user)
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")
    if len(files) > _MAX_BATCH_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many files (max {_MAX_BATCH_FILES})",
        )

    settings = get_settings()
    items: list[AssetUploadResponse] = []
    for file in files:
        items.append(
            await save_project_asset(
                upload_dir=settings.upload_dir,
                project_id=str(project_id),
                file=file,
            )
        )
    return AssetBatchUploadResponse(items=items)


@router.get(
    "/{project_id}/assets",
    response_model=AssetListResponse,
)
async def list_assets(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssetListResponse:
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    settings = get_settings()
    return AssetListResponse(
        items=list_project_assets(settings.upload_dir, str(project_id))
    )


@router.get("/{project_id}/assets/{asset_id}")
async def get_asset(
    project_id: uuid.UUID,
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    settings = get_settings()
    try:
        meta = load_asset_meta(settings.upload_dir, str(project_id), asset_id)
        data = load_asset_bytes(settings.upload_dir, str(project_id), asset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found") from None
    return Response(
        content=data,
        media_type=meta.mime_type,
        headers={"Content-Disposition": f'inline; filename="{meta.filename}"'},
    )


@router.delete(
    "/{project_id}/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_asset(
    project_id: uuid.UUID,
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    require_write_access(current_user)
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    settings = get_settings()
    delete_project_asset(settings.upload_dir, str(project_id), asset_id)
