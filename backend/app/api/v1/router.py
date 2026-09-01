from fastapi import APIRouter

from app.api.v1 import (
    account,
    admin,
    analytics,
    auth,
    members,
    # Admin routes are imported directly below to keep their paths grouped.
    pipeline_jobs,
    pipeline_runs,
    pipelines,
    project_assets,
    project_runs,
    projects,
)
from app.api.v1.admin import ocr_engines

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(account.router, prefix="/account", tags=["account"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ocr_engines.router, prefix="/admin", tags=["admin-engines"])
api_router.include_router(members.router, prefix="/members", tags=["members"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
api_router.include_router(
    pipeline_runs.router,
    prefix="/pipelines",
    tags=["pipeline-runs"],
)
api_router.include_router(
    pipeline_jobs.pipeline_jobs_router,
    prefix="/pipelines",
    tags=["pipeline-jobs"],
)
api_router.include_router(
    pipeline_jobs.jobs_router,
    prefix="/jobs",
    tags=["pipeline-jobs"],
)
api_router.include_router(
    project_assets.router,
    prefix="/projects",
    tags=["project-assets"],
)
api_router.include_router(project_runs.router, prefix="/projects", tags=["project-runs"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
