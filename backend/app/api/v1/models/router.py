"""Model inference API routes."""

from fastapi import APIRouter

from app.api.v1.models import catalog
from app.api.v1.models.docling import routes as docling_routes
from app.api.v1.models.loader import routes as loader_routes
from app.api.v1.models.surya import routes as surya_routes

router = APIRouter()
router.include_router(catalog.router)
router.include_router(docling_routes.router, prefix="/docling", tags=["docling"])
router.include_router(surya_routes.router, prefix="/surya", tags=["surya"])
router.include_router(loader_routes.router, prefix="/loader", tags=["loader"])
