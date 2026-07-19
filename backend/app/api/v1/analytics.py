"""Analytics API routes."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.analytics import (
    ActivitySeries,
    AnalyticsOverview,
    AnalyticsSummary,
    DocumentBreakdownList,
    ModelUsageList,
    NodeBreakdownList,
    PipelineBreakdownList,
    PipelineLibraryStats,
    ProjectBreakdownList,
    RecentRunList,
    RunKindBreakdown,
    RunOutcomes,
    TopPipelineList,
)
from app.services import analytics as analytics_service

router = APIRouter()


def _parse_project_id(project_id: str | None) -> uuid.UUID | None:
    if project_id is None:
        return None
    try:
        return uuid.UUID(project_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid project_id",
        ) from exc


def _parse_range(range_key: str) -> str:
    if range_key not in analytics_service.RANGE_DAYS:
        return "30d"
    return range_key


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsOverview:
    settings = get_settings()
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_overview(
        db,
        owner_id=current_user.id,
        upload_dir=settings.upload_dir,
        project_id=parsed_project_id,
    )


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    range: str = Query(default="30d", alias="range"),
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummary:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_summary(
        db,
        owner_id=current_user.id,
        range_key=_parse_range(range),
        project_id=parsed_project_id,
    )


@router.get("/outcomes", response_model=RunOutcomes)
async def analytics_outcomes(
    range: str = Query(default="30d", alias="range"),
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RunOutcomes:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_run_outcomes(
        db,
        owner_id=current_user.id,
        range_key=_parse_range(range),
        project_id=parsed_project_id,
    )


@router.get("/top-pipelines", response_model=TopPipelineList)
async def analytics_top_pipelines(
    range: str = Query(default="30d", alias="range"),
    project_id: str | None = Query(default=None),
    limit: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TopPipelineList:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_top_pipelines(
        db,
        owner_id=current_user.id,
        range_key=_parse_range(range),
        project_id=parsed_project_id,
        limit=limit,
    )


@router.get("/runs", response_model=RecentRunList)
async def analytics_runs(
    range: str = Query(default="30d", alias="range"),
    project_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecentRunList:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_recent_runs(
        db,
        owner_id=current_user.id,
        range_key=_parse_range(range),
        project_id=parsed_project_id,
        limit=limit,
    )


@router.get("/export")
async def analytics_export(
    range: str = Query(default="30d", alias="range"),
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    parsed_project_id = _parse_project_id(project_id)
    normalized = _parse_range(range)
    csv_content = await analytics_service.build_export_csv(
        db,
        owner_id=current_user.id,
        range_key=normalized,
        project_id=parsed_project_id,
    )
    date_stamp = datetime.now().strftime("%Y%m%d")
    filename = f"ocrflow-analytics-{normalized}-{date_stamp}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/activity", response_model=ActivitySeries)
async def analytics_activity(
    from_at: datetime | None = Query(default=None, alias="from"),
    to_at: datetime | None = Query(default=None, alias="to"),
    bucket: str = Query(default="day", pattern="^(day|hour)$"),
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActivitySeries:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_activity_series(
        db,
        owner_id=current_user.id,
        from_at=from_at,
        to_at=to_at,
        bucket=bucket,
        project_id=parsed_project_id,
    )


@router.get("/models", response_model=ModelUsageList)
async def analytics_models(
    project_id: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModelUsageList:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_model_usage(
        db,
        owner_id=current_user.id,
        project_id=parsed_project_id,
        limit=limit,
    )


@router.get("/projects", response_model=ProjectBreakdownList)
async def analytics_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectBreakdownList:
    return await analytics_service.get_projects_breakdown(
        db,
        owner_id=current_user.id,
    )


@router.get("/nodes", response_model=NodeBreakdownList)
async def analytics_nodes(
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NodeBreakdownList:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_nodes_breakdown(
        db,
        owner_id=current_user.id,
        project_id=parsed_project_id,
    )


@router.get("/documents", response_model=DocumentBreakdownList)
async def analytics_documents(
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentBreakdownList:
    settings = get_settings()
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_documents_breakdown(
        db,
        owner_id=current_user.id,
        upload_dir=settings.upload_dir,
        project_id=parsed_project_id,
    )


@router.get("/pipeline-library", response_model=PipelineLibraryStats)
async def analytics_pipeline_library(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineLibraryStats:
    return await analytics_service.get_pipeline_library_stats(
        db,
        owner_id=current_user.id,
    )


@router.get("/pipelines", response_model=PipelineBreakdownList)
async def analytics_pipelines(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineBreakdownList:
    return await analytics_service.get_pipeline_breakdown(
        db,
        owner_id=current_user.id,
        limit=limit,
    )


@router.get("/run-kinds", response_model=RunKindBreakdown)
async def analytics_run_kinds(
    range: str = Query(default="30d", alias="range"),
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RunKindBreakdown:
    parsed_project_id = _parse_project_id(project_id)
    return await analytics_service.get_run_kind_breakdown(
        db,
        owner_id=current_user.id,
        range_key=_parse_range(range),
        project_id=parsed_project_id,
    )
