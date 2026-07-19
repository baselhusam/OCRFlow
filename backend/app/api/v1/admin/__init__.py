from fastapi import APIRouter

from app.api.v1.admin import analytics, users

router = APIRouter()
router.include_router(users.router, tags=["admin-users"])
router.include_router(analytics.router, tags=["admin-analytics"])
