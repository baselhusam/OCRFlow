"""Administrator APIs for managed LLM and VLM connections."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import require_admin, require_member_manager
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.model_connection import ModelConnection, ModelConnectionCreate, ModelConnectionList, ModelConnectionUpdate, ModelConnectionValidation, ModelConnectionValidationRequest
from app.services import model_connections

router = APIRouter()

@router.get("/model-connections", response_model=ModelConnectionList)
async def list_connections(_: User = Depends(require_member_manager), db: AsyncSession = Depends(get_db)) -> ModelConnectionList:
    return ModelConnectionList(items=await model_connections.list_connections(db))

@router.post("/model-connections/validate", response_model=ModelConnectionValidation)
async def validate(payload: ModelConnectionValidationRequest, _: User = Depends(require_admin)) -> ModelConnectionValidation:
    return await model_connections.validate_connection(payload)

@router.post("/model-connections", response_model=ModelConnection, status_code=status.HTTP_201_CREATED)
async def create(payload: ModelConnectionCreate, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> ModelConnection:
    return await model_connections.create_connection(db, payload)

@router.post("/model-connections/{connection_id}/validate", response_model=ModelConnection)
async def revalidate(connection_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> ModelConnection:
    try: return await model_connections.revalidate_connection(db, connection_id)
    except LookupError as exc: raise HTTPException(404, str(exc)) from exc

@router.patch("/model-connections/{connection_id}", response_model=ModelConnection)
async def update(connection_id: str, payload: ModelConnectionUpdate, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> ModelConnection:
    try: return await model_connections.update_connection(db, connection_id, payload)
    except LookupError as exc: raise HTTPException(404, str(exc)) from exc

@router.delete("/model-connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(connection_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> None:
    try: await model_connections.delete_connection(db, connection_id)
    except LookupError as exc: raise HTTPException(404, str(exc)) from exc
