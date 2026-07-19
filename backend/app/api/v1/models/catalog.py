"""Model catalog HTTP endpoints."""

from fastapi import APIRouter, Query

from app.models.registry import (
    CategoryMeta,
    ModelRegistryEntry,
    get_model,
    list_categories,
    list_models,
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


@router.get("/{model_id:path}", response_model=ModelRegistryEntry)
async def get_model_metadata(model_id: str) -> ModelRegistryEntry:
    return get_model(model_id)
