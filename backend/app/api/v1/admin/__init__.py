from fastapi import APIRouter

from app.api.v1.admin import api_keys, analytics, users

router = APIRouter()
router.include_router(users.router, tags=["admin-users"])
router.include_router(analytics.router, tags=["admin-analytics"])
router.include_router(api_keys.router, tags=["admin-api-keys"])

__all__ = ["api_keys", "analytics", "users"]
