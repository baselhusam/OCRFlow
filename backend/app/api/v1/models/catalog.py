"""Model catalog HTTP endpoints."""

from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.models.registry import (
    CategoryMeta,
    ModelRegistryEntry,
    get_model,
    list_categories,
    list_models,
)
from app.services.runtime_availability import (
    RuntimeAvailability,
    get_runtime_availability,
)

router = APIRouter()


@router.get("/", response_model=list[ModelRegistryEntry])
async def list_all_models(
    category: str | None = Query(default=None),
    provider: str | None = Query(default=None),
    status: str | None = Query(default=None),
) -> list[ModelRegistryEntry]:
    return list_models(category=category, provider=provider, status=status)


@router.get("/categories", response_model=list[CategoryMeta])
async def list_all_categories() -> list[CategoryMeta]:
    return list_categories()


@router.get("/runtime", response_model=RuntimeAvailability)
async def get_runtime(
    settings: Settings = Depends(get_settings),
) -> RuntimeAvailability:
    """Which provider backends are reachable right now (drives UI gating)."""
    return await get_runtime_availability(settings)


@router.get("/{model_id:path}", response_model=ModelRegistryEntry)
async def get_model_metadata(model_id: str) -> ModelRegistryEntry:
    return get_model(model_id)
