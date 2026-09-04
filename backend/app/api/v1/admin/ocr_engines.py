"""Administrator APIs for externally hosted OCRFlow engine services."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin, require_member_manager
from app.core.engine_url import EngineUrlSafetyError
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.ocr_engine import (
    EngineConnection,
    EngineConnectionCreate,
    EngineConnectionList,
    EngineConnectionUpdate,
    EngineValidation,
    EngineValidationRequest,
)
from app.services import ocr_engines

router = APIRouter()


@router.get("/engines", response_model=EngineConnectionList)
async def list_ocr_engines(
    _: User = Depends(require_member_manager),
    db: AsyncSession = Depends(get_db),
) -> EngineConnectionList:
    return EngineConnectionList(items=await ocr_engines.list_engines(db))


@router.post("/engines/validate", response_model=EngineValidation)
async def validate_ocr_engine(
    payload: EngineValidationRequest,
    _: User = Depends(require_admin),
) -> EngineValidation:
    return await ocr_engines.validate_engine(payload)


@router.post("/engines", response_model=EngineConnection, status_code=status.HTTP_201_CREATED)
async def create_ocr_engine(
    payload: EngineConnectionCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EngineConnection:
    try:
        return await ocr_engines.create_engine(db, payload)
    except EngineUrlSafetyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/engines/{engine_id}/validate", response_model=EngineConnection)
async def revalidate_ocr_engine(
    engine_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EngineConnection:
    try:
        return await ocr_engines.revalidate_engine(db, engine_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/engines/{engine_id}", response_model=EngineConnection)
async def update_ocr_engine(
    engine_id: str,
    payload: EngineConnectionUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EngineConnection:
    try:
        return await ocr_engines.update_engine(db, engine_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/engines/{engine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ocr_engine(
    engine_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await ocr_engines.delete_engine(db, engine_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
