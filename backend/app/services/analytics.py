"""Analytics aggregation service."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.analytics_event import AnalyticsEvent
from app.db.models.pipeline import Pipeline
from app.db.models.project import Project
from app.db.models.user import User
from app.models.registry import REGISTRY, get_model
from app.schemas.analytics import (
    ActivityBucket,
    ActivitySeries,
    AnalyticsKpi,
    AnalyticsOverview,
    AnalyticsSummary,
    DocumentBreakdownItem,
    DocumentBreakdownList,
    ModelUsageItem,
    ModelUsageList,
    NodeBreakdownItem,
    NodeBreakdownList,
    ProjectBreakdownItem,
    ProjectBreakdownList,
    RecentRunItem,
    RecentRunList,
    RunOutcomeSegment,
    RunOutcomes,
    TopPipelineItem,
    TopPipelineList,
    UserLeaderboardItem,
    UserLeaderboardList,
    UserActivityBucket,
    UserActivitySeries,
    PipelineLibraryStats,
    PipelineBreakdownItem,
    PipelineBreakdownList,
    RunKindSegment,
    RunKindBreakdown,
)
from app.services.asset_storage import list_project_assets
from app.services.graph_analytics import parse_graph_snapshot

MAX_RANGE_DAYS = 90
DEFAULT_RANGE_DAYS = 30
AnalyticsRange = Literal["7d", "30d", "90d"]

RANGE_DAYS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}
RANGE_DELTA_LABELS: dict[str, str] = {
    "7d": "vs prev 7d",
    "30d": "vs prev 30d",
    "90d": "vs prev 90d",
}


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)


def _start_of_day(value: datetime) -> datetime:
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _clamp_range(
    from_at: datetime | None,
    to_at: datetime | None,
) -> tuple[datetime, datetime]:
    now = _utc_now()
    end = to_at or now
    start = from_at or (end - timedelta(days=DEFAULT_RANGE_DAYS))
    if start > end:
        start, end = end, start
    if (end - start).days > MAX_RANGE_DAYS:
        start = end - timedelta(days=MAX_RANGE_DAYS)
    return start, end


def _owner_event_filters(owner_id: uuid.UUID | None) -> list:
    if owner_id is None:
        return []
    return [AnalyticsEvent.owner_id == owner_id]


def _event_filters(
    owner_id: uuid.UUID | None,
    project_id: uuid.UUID | None,
    from_at: datetime,
    to_at: datetime,
):
    filters = [
        AnalyticsEvent.created_at >= from_at,
        AnalyticsEvent.created_at <= to_at,
    ]
    filters.extend(_owner_event_filters(owner_id))
    if project_id is not None:
        filters.append(AnalyticsEvent.project_id == project_id)
    return filters


def _full_run_event_predicate():
    return (AnalyticsEvent.event_type == "project_run") | (
        (AnalyticsEvent.event_type == "pipeline_run")
        & AnalyticsEvent.project_run_id.is_(None)
    )


def _terminal_full_run_event_predicate():
    return _full_run_event_predicate() & AnalyticsEvent.status.in_(
        ["success", "error"]
    )


async def _load_projects(
    db: AsyncSession,
    owner_id: uuid.UUID | None,
    project_id: uuid.UUID | None = None,
) -> list[Project]:
    query = select(Project).order_by(Project.updated_at.desc())
    if owner_id is not None:
        query = query.where(Project.owner_id == owner_id)
    if project_id is not None:
        query = query.where(Project.id == project_id)
    result = await db.execute(query)
    return list(result.scalars().all())


def _aggregate_graph(projects: list[Project]) -> dict[str, object]:
    total_nodes = 0
    total_edges = 0
    model_ids: set[str] = set()
    asset_ids: set[str] = set()
    active_pipelines = 0

    for project in projects:
        snapshot = parse_graph_snapshot(project.graph)
        total_nodes += len(snapshot.nodes)
        total_edges += snapshot.edge_count
        model_ids.update(snapshot.model_ids)
        for asset_id in snapshot.asset_ids:
            asset_ids.add(f"{project.id}:{asset_id}")
        if snapshot.nodes:
            active_pipelines += 1

    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "unique_models": len(model_ids),
        "total_files": len(asset_ids),
        "active_pipelines": active_pipelines,
    }


async def get_overview(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    upload_dir: Path,
    project_id: uuid.UUID | None = None,
) -> AnalyticsOverview:
    projects = await _load_projects(db, owner_id, project_id)
    graph_stats = _aggregate_graph(projects)

    now = _utc_now()
    today_start = _start_of_day(now)

    event_query = select(
        func.count(AnalyticsEvent.id),
        func.count(case((AnalyticsEvent.status == "success", 1))),
        func.coalesce(func.sum(AnalyticsEvent.page_count), 0),
        func.max(AnalyticsEvent.created_at),
    )
    if owner_id is not None:
        event_query = event_query.where(AnalyticsEvent.owner_id == owner_id)
    if project_id is not None:
        event_query = event_query.where(AnalyticsEvent.project_id == project_id)

    total_runs, success_runs, pages_processed, last_event_at = (
        await db.execute(event_query)
    ).one()

    runs_today_query = select(func.count(AnalyticsEvent.id)).where(
        AnalyticsEvent.created_at >= today_start,
    )
    if owner_id is not None:
        runs_today_query = runs_today_query.where(AnalyticsEvent.owner_id == owner_id)
    if project_id is not None:
        runs_today_query = runs_today_query.where(AnalyticsEvent.project_id == project_id)
    runs_today = (await db.execute(runs_today_query)).scalar_one()

    last_project_update = max((project.updated_at for project in projects), default=None)
    last_activity_at = last_event_at
    if last_project_update and (last_activity_at is None or last_project_update > last_activity_at):
        last_activity_at = last_project_update

    success_rate: float | None = None
    if total_runs:
        success_rate = round(success_runs / total_runs, 4)

    return AnalyticsOverview(
        project_count=len(projects),
        total_nodes=int(graph_stats["total_nodes"]),
        total_edges=int(graph_stats["total_edges"]),
        unique_models=int(graph_stats["unique_models"]),
        total_files=int(graph_stats["total_files"]),
        active_pipelines=int(graph_stats["active_pipelines"]),
        total_runs=int(total_runs or 0),
        runs_today=int(runs_today or 0),
        pages_processed=int(pages_processed or 0),
        success_rate=success_rate,
        last_activity_at=last_activity_at,
    )


async def get_activity_series(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    from_at: datetime | None = None,
    to_at: datetime | None = None,
    bucket: str = "day",
    project_id: uuid.UUID | None = None,
) -> ActivitySeries:
    start, end = _clamp_range(from_at, to_at)
    filters = _event_filters(owner_id, project_id, start, end)

    if bucket == "hour":
        bucket_expr = func.date_trunc("hour", AnalyticsEvent.created_at)
        step = timedelta(hours=1)
    else:
        bucket = "day"
        bucket_expr = func.date_trunc("day", AnalyticsEvent.created_at)
        step = timedelta(days=1)

    query = (
        select(
            bucket_expr.label("bucket_start"),
            func.count(AnalyticsEvent.id).label("runs"),
            func.coalesce(func.sum(AnalyticsEvent.page_count), 0).label("pages"),
            func.count(case((AnalyticsEvent.status == "error", 1))).label("errors"),
            func.count(func.distinct(AnalyticsEvent.project_id)).label("active_projects"),
        )
        .where(*filters)
        .group_by(bucket_expr)
        .order_by(bucket_expr)
    )
    rows = (await db.execute(query)).all()
    row_map: dict[datetime, object] = {}
    for row in rows:
        bucket_start = row.bucket_start
        if bucket_start.tzinfo is None:
            bucket_start = bucket_start.replace(tzinfo=UTC)
        row_map[bucket_start] = row

    items: list[ActivityBucket] = []
    if bucket == "hour":
        cursor = start.replace(minute=0, second=0, microsecond=0)
    else:
        cursor = _start_of_day(start)
    if cursor.tzinfo is None:
        cursor = cursor.replace(tzinfo=UTC)

    end_cursor = end
    if end_cursor.tzinfo is None:
        end_cursor = end_cursor.replace(tzinfo=UTC)

    while cursor <= end_cursor:
        row = row_map.get(cursor)
        items.append(
            ActivityBucket(
                bucket_start=cursor,
                runs=int(row.runs if row else 0),
                pages=int(row.pages if row else 0),
                errors=int(row.errors if row else 0),
                active_projects=int(row.active_projects if row else 0),
            )
        )
        cursor += step

    return ActivitySeries(bucket=bucket, from_at=start, to_at=end, items=items)


async def get_user_activity_series(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    from_at: datetime | None = None,
    to_at: datetime | None = None,
    bucket: str = "day",
    project_id: uuid.UUID | None = None,
) -> UserActivitySeries:
    start, end = _clamp_range(from_at, to_at)
    filters = _event_filters(owner_id, project_id, start, end)

    if bucket == "hour":
        bucket_expr = func.date_trunc("hour", AnalyticsEvent.created_at)
        step = timedelta(hours=1)
    else:
        bucket = "day"
        bucket_expr = func.date_trunc("day", AnalyticsEvent.created_at)
        step = timedelta(days=1)

    query = (
        select(
            bucket_expr.label("bucket_start"),
            func.count(func.distinct(AnalyticsEvent.owner_id)).label("active_users"),
        )
        .where(*filters)
        .group_by(bucket_expr)
        .order_by(bucket_expr)
    )
    rows = (await db.execute(query)).all()
    row_map: dict[datetime, int] = {}
    for row in rows:
        bucket_start = row.bucket_start
        if bucket_start.tzinfo is None:
            bucket_start = bucket_start.replace(tzinfo=UTC)
        row_map[bucket_start] = int(row.active_users or 0)

    items: list[UserActivityBucket] = []
    if bucket == "hour":
        cursor = start.replace(minute=0, second=0, microsecond=0)
    else:
        cursor = _start_of_day(start)
    if cursor.tzinfo is None:
        cursor = cursor.replace(tzinfo=UTC)

    end_cursor = end
    if end_cursor.tzinfo is None:
        end_cursor = end_cursor.replace(tzinfo=UTC)

    while cursor <= end_cursor:
        items.append(
            UserActivityBucket(
                bucket_start=cursor,
                active_users=row_map.get(cursor, 0),
            )
        )
        cursor += step

    return UserActivitySeries(bucket=bucket, from_at=start, to_at=end, items=items)


async def get_model_usage(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    project_id: uuid.UUID | None = None,
    limit: int = 10,
) -> ModelUsageList:
    filters = _owner_event_filters(owner_id)
    if project_id is not None:
        filters.append(AnalyticsEvent.project_id == project_id)

    query = (
        select(
            AnalyticsEvent.model_id,
            func.count(AnalyticsEvent.id).label("run_count"),
            func.avg(AnalyticsEvent.latency_ms).label("avg_latency_ms"),
            func.count(case((AnalyticsEvent.status == "success", 1))).label("success_runs"),
            func.max(AnalyticsEvent.created_at).label("last_used_at"),
        )
        .where(*filters)
        .group_by(AnalyticsEvent.model_id)
        .order_by(func.count(AnalyticsEvent.id).desc())
        .limit(limit)
    )
    rows = (await db.execute(query)).all()

    items: list[ModelUsageItem] = []
    for row in rows:
        display_name: str | None = None
        category: str | None = None
        try:
            entry = get_model(row.model_id)
            display_name = entry.display_name
            category = entry.category
        except KeyError:
            pass

        success_rate: float | None = None
        if row.run_count:
            success_rate = round(row.success_runs / row.run_count, 4)

        items.append(
            ModelUsageItem(
                model_id=row.model_id,
                display_name=display_name,
                category=category,
                run_count=int(row.run_count),
                avg_latency_ms=round(row.avg_latency_ms, 2) if row.avg_latency_ms is not None else None,
                success_rate=success_rate,
                last_used_at=row.last_used_at,
            )
        )

    return ModelUsageList(items=items)


async def get_projects_breakdown(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
) -> ProjectBreakdownList:
    projects = await _load_projects(db, owner_id)

    run_stats_query = (
        select(
            AnalyticsEvent.project_id,
            func.count(AnalyticsEvent.id).label("run_count"),
            func.max(AnalyticsEvent.created_at).label("last_run_at"),
        )
        .where(AnalyticsEvent.project_id.is_not(None))
        .group_by(AnalyticsEvent.project_id)
    )
    if owner_id is not None:
        run_stats_query = run_stats_query.where(AnalyticsEvent.owner_id == owner_id)
    run_stats = {
        row.project_id: row for row in (await db.execute(run_stats_query)).all()
    }

    user_map: dict[uuid.UUID, User] = {}
    if owner_id is None and projects:
        owner_ids = {project.owner_id for project in projects}
        users_result = await db.execute(select(User).where(User.id.in_(owner_ids)))
        user_map = {user.id: user for user in users_result.scalars().all()}

    items: list[ProjectBreakdownItem] = []
    for project in projects:
        snapshot = parse_graph_snapshot(project.graph)
        stats = run_stats.get(project.id)
        last_activity = project.updated_at
        if stats and stats.last_run_at and stats.last_run_at > last_activity:
            last_activity = stats.last_run_at

        owner = user_map.get(project.owner_id)
        items.append(
            ProjectBreakdownItem(
                project_id=str(project.id),
                name=project.name,
                node_count=len(snapshot.nodes),
                model_count=len(snapshot.model_ids),
                file_count=len(snapshot.asset_ids),
                run_count=int(stats.run_count if stats else 0),
                last_activity_at=last_activity,
                updated_at=project.updated_at,
                owner_id=str(project.owner_id) if owner_id is None else None,
                owner_email=owner.email if owner else None,
                icon=project.icon,
                color=project.color,
                status=project.status,
            )
        )

    return ProjectBreakdownList(items=items)


async def get_nodes_breakdown(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    project_id: uuid.UUID | None = None,
) -> NodeBreakdownList:
    projects = await _load_projects(db, owner_id, project_id)

    node_run_stats_query = (
        select(
            AnalyticsEvent.node_id,
            func.count(AnalyticsEvent.id).label("run_count"),
        )
        .where(AnalyticsEvent.node_id.is_not(None))
        .group_by(AnalyticsEvent.node_id)
    )
    if owner_id is not None:
        node_run_stats_query = node_run_stats_query.where(AnalyticsEvent.owner_id == owner_id)
    if project_id is not None:
        node_run_stats_query = node_run_stats_query.where(
            AnalyticsEvent.project_id == project_id
        )
    node_run_stats = {
        row.node_id: int(row.run_count or 0)
        for row in (await db.execute(node_run_stats_query)).all()
    }

    user_map: dict[uuid.UUID, User] = {}
    if owner_id is None and projects:
        owner_ids = {project.owner_id for project in projects}
        users_result = await db.execute(select(User).where(User.id.in_(owner_ids)))
        user_map = {user.id: user for user in users_result.scalars().all()}

    items: list[NodeBreakdownItem] = []
    for project in projects:
        snapshot = parse_graph_snapshot(project.graph)
        owner = user_map.get(project.owner_id)
        for node in snapshot.nodes:
            category: str | None = None
            try:
                category = REGISTRY[node.model_id].category
            except KeyError:
                pass
            items.append(
                NodeBreakdownItem(
                    project_id=str(project.id),
                    project_name=project.name,
                    node_id=node.node_id,
                    model_id=node.model_id,
                    category=category,
                    run_status=node.run_status,
                    last_run_at=node.last_run_at,
                    owner_email=owner.email if owner else None,
                    run_count=node_run_stats.get(node.node_id, 0),
                )
            )

    return NodeBreakdownList(items=items)


async def get_documents_breakdown(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    upload_dir: Path,
    project_id: uuid.UUID | None = None,
) -> DocumentBreakdownList:
    projects = await _load_projects(db, owner_id, project_id)

    user_map: dict[uuid.UUID, User] = {}
    if owner_id is None and projects:
        owner_ids = {project.owner_id for project in projects}
        users_result = await db.execute(select(User).where(User.id.in_(owner_ids)))
        user_map = {user.id: user for user in users_result.scalars().all()}

    items: list[DocumentBreakdownItem] = []
    for project in projects:
        assets = list_project_assets(upload_dir, str(project.id))
        owner = user_map.get(project.owner_id)
        for asset in assets:
            meta_path = upload_dir / str(project.id) / asset.asset_id / "meta.json"
            uploaded_at: datetime | None = None
            if meta_path.is_file():
                uploaded_at = datetime.fromtimestamp(meta_path.stat().st_mtime, tz=UTC)

            items.append(
                DocumentBreakdownItem(
                    project_id=str(project.id),
                    project_name=project.name,
                    asset_id=asset.asset_id,
                    filename=asset.filename,
                    format=asset.format,
                    size_bytes=asset.size_bytes,
                    uploaded_at=uploaded_at,
                    owner_email=owner.email if owner else None,
                )
            )

    items.sort(key=lambda item: (item.uploaded_at or datetime.min.replace(tzinfo=UTC)), reverse=True)
    return DocumentBreakdownList(items=items)


def resolve_range(range_key: str) -> tuple[datetime, datetime, datetime, datetime, str]:
    normalized = range_key if range_key in RANGE_DAYS else "30d"
    days = RANGE_DAYS[normalized]
    end = _utc_now()
    start = end - timedelta(days=days)
    prev_end = start
    prev_start = prev_end - timedelta(days=days)
    return start, end, prev_start, prev_end, normalized


def _format_compact_number(value: int) -> str:
    if value >= 1_000_000:
        return f"{value / 1_000_000:.1f}M".replace(".0M", "M")
    if value >= 1_000:
        return f"{value / 1_000:.1f}k".replace(".0k", "k")
    return str(value)


def _format_latency_seconds(latency_ms: float | None) -> str:
    if latency_ms is None:
        return "—"
    return f"{latency_ms / 1000:.1f}s"


def _compute_percent_delta(current: float, previous: float) -> tuple[str, str]:
    if previous == 0:
        if current == 0:
            return "0%", "neutral"
        return "100%", "up"
    change = ((current - previous) / previous) * 100
    direction = "up" if change >= 0 else "down"
    return f"{abs(change):.0f}%", direction


def _compute_point_delta(current: float | None, previous: float | None) -> tuple[str, str]:
    if current is None or previous is None:
        return "—", "neutral"
    change = (current - previous) * 100
    direction = "up" if change >= 0 else "down"
    return f"{abs(change):.1f}pt", direction


def _compute_latency_delta(
    current: float | None,
    previous: float | None,
) -> tuple[str, str]:
    if current is None or previous is None:
        return "—", "neutral"
    change_seconds = (current - previous) / 1000
    direction = "down" if change_seconds <= 0 else "up"
    return f"{abs(change_seconds):.1f}s", direction


async def _aggregate_window_metrics(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    project_id: uuid.UUID | None,
    from_at: datetime,
    to_at: datetime,
) -> dict[str, float | int | None]:
    filters = _event_filters(owner_id, project_id, from_at, to_at)

    query = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        _terminal_full_run_event_predicate(),
                        AnalyticsEvent.page_count,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("pages_processed"),
        func.count(
            case((_terminal_full_run_event_predicate(), 1))
        ).label("pipeline_runs"),
        func.count(
            case((_full_run_event_predicate() & (AnalyticsEvent.status == "success"), 1))
        ).label("success_runs"),
        func.count(
            case((_full_run_event_predicate() & (AnalyticsEvent.status == "error"), 1))
        ).label("error_runs"),
        func.avg(
            case(
                (
                    _terminal_full_run_event_predicate()
                    & (AnalyticsEvent.status == "success")
                    & (AnalyticsEvent.page_count > 0)
                    & (AnalyticsEvent.latency_ms.is_not(None)),
                    AnalyticsEvent.latency_ms / AnalyticsEvent.page_count,
                )
            )
        ).label("avg_latency_ms_per_page"),
    ).where(*filters)

    row = (await db.execute(query)).one()
    total_runs = int(row.success_runs or 0) + int(row.error_runs or 0)
    success_rate: float | None = None
    if total_runs:
        success_rate = round(int(row.success_runs or 0) / total_runs, 4)

    return {
        "pages_processed": int(row.pages_processed or 0),
        "pipeline_runs": int(row.pipeline_runs or 0),
        "success_rate": success_rate,
        "avg_latency_ms_per_page": (
            round(float(row.avg_latency_ms_per_page), 2)
            if row.avg_latency_ms_per_page is not None
            else None
        ),
    }


async def get_summary(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    range_key: str = "30d",
    project_id: uuid.UUID | None = None,
) -> AnalyticsSummary:
    start, end, prev_start, prev_end, normalized = resolve_range(range_key)
    current = await _aggregate_window_metrics(
        db, owner_id=owner_id, project_id=project_id, from_at=start, to_at=end
    )
    previous = await _aggregate_window_metrics(
        db, owner_id=owner_id, project_id=project_id, from_at=prev_start, to_at=prev_end
    )

    delta_label = RANGE_DELTA_LABELS[normalized]

    pages_delta, pages_dir = _compute_percent_delta(
        float(current["pages_processed"] or 0),
        float(previous["pages_processed"] or 0),
    )
    runs_delta, runs_dir = _compute_percent_delta(
        float(current["pipeline_runs"] or 0),
        float(previous["pipeline_runs"] or 0),
    )
    rate_delta, rate_dir = _compute_point_delta(
        current["success_rate"],
        previous["success_rate"],
    )
    latency_delta, latency_dir = _compute_latency_delta(
        current["avg_latency_ms_per_page"],
        previous["avg_latency_ms_per_page"],
    )

    success_pct = (
        f"{round(float(current['success_rate']) * 100, 1)}%"
        if current["success_rate"] is not None
        else "—"
    )

    kpis = [
        AnalyticsKpi(
            label="PAGES PROCESSED",
            value=_format_compact_number(int(current["pages_processed"] or 0)),
            delta=pages_delta,
            delta_direction=pages_dir,
            delta_label=delta_label,
        ),
        AnalyticsKpi(
            label="PIPELINE RUNS",
            value=_format_compact_number(int(current["pipeline_runs"] or 0)),
            delta=runs_delta,
            delta_direction=runs_dir,
            delta_label=delta_label,
        ),
        AnalyticsKpi(
            label="SUCCESS RATE",
            value=success_pct,
            delta=rate_delta,
            delta_direction=rate_dir,
            delta_label=delta_label,
        ),
        AnalyticsKpi(
            label="AVG LATENCY",
            value=_format_latency_seconds(current["avg_latency_ms_per_page"]),
            delta=latency_delta,
            delta_direction=latency_dir,
            delta_label="per page",
        ),
    ]

    return AnalyticsSummary(
        range=normalized,
        from_at=start,
        to_at=end,
        pages_processed=int(current["pages_processed"] or 0),
        pipeline_runs=int(current["pipeline_runs"] or 0),
        success_rate=current["success_rate"],
        avg_latency_ms_per_page=current["avg_latency_ms_per_page"],
        kpis=kpis,
    )


async def get_run_outcomes(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    range_key: str = "30d",
    project_id: uuid.UUID | None = None,
) -> RunOutcomes:
    start, end, _, _, _ = resolve_range(range_key)
    filters = _event_filters(owner_id, project_id, start, end)
    filters.append(_terminal_full_run_event_predicate())

    counts_query = select(
        func.count(
            case((_full_run_event_predicate() & (AnalyticsEvent.status == "success"), 1))
        ).label("success"),
        func.count(
            case((_full_run_event_predicate() & (AnalyticsEvent.status == "error"), 1))
        ).label("error"),
    ).where(*filters)
    success_count, error_count = (await db.execute(counts_query)).one()
    success_count = int(success_count or 0)
    error_count = int(error_count or 0)

    running_query = select(func.count(Project.id)).where(
        Project.is_archived.is_(False),
        Project.status == "running",
    )
    if owner_id is not None:
        running_query = running_query.where(Project.owner_id == owner_id)
    if project_id is not None:
        running_query = running_query.where(Project.id == project_id)
    running_count = int((await db.execute(running_query)).scalar_one() or 0)

    total = success_count + error_count + running_count
    if total == 0:
        return RunOutcomes(total_runs=0, segments=[])

    def pct(count: int) -> float:
        return round((count / total) * 100, 1)

    segments = [
        RunOutcomeSegment(
            label="Done",
            count=success_count,
            percentage=pct(success_count),
            color_key="done",
        ),
        RunOutcomeSegment(
            label="Failed",
            count=error_count,
            percentage=pct(error_count),
            color_key="failed",
        ),
    ]
    if running_count > 0:
        segments.append(
            RunOutcomeSegment(
                label="Running",
                count=running_count,
                percentage=pct(running_count),
                color_key="running",
            )
        )

    return RunOutcomes(total_runs=success_count + error_count, segments=segments)


async def get_top_pipelines(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    range_key: str = "30d",
    project_id: uuid.UUID | None = None,
    limit: int = 5,
) -> TopPipelineList:
    start, end, _, _, _ = resolve_range(range_key)
    filters = _event_filters(owner_id, project_id, start, end)
    filters.append(AnalyticsEvent.project_id.is_not(None))
    filters.append(_terminal_full_run_event_predicate())

    query = (
        select(
            AnalyticsEvent.project_id,
            func.count(AnalyticsEvent.id).label("run_count"),
        )
        .where(*filters)
        .group_by(AnalyticsEvent.project_id)
        .order_by(func.count(AnalyticsEvent.id).desc())
        .limit(limit)
    )
    rows = (await db.execute(query)).all()
    if not rows:
        return TopPipelineList(items=[])

    project_ids = [row.project_id for row in rows]
    projects_result = await db.execute(
        select(Project).where(Project.id.in_(project_ids))
    )
    project_map = {project.id: project for project in projects_result.scalars().all()}

    max_runs = max(int(row.run_count) for row in rows) or 1
    items: list[TopPipelineItem] = []
    for row in rows:
        project = project_map.get(row.project_id)
        if project is None:
            continue
        run_count = int(row.run_count)
        items.append(
            TopPipelineItem(
                project_id=str(project.id),
                name=project.name,
                run_count=run_count,
                share=round(run_count / max_runs, 4),
            )
        )

    return TopPipelineList(items=items)


async def get_recent_runs(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    range_key: str = "30d",
    project_id: uuid.UUID | None = None,
    limit: int = 20,
) -> RecentRunList:
    start, end, _, _, _ = resolve_range(range_key)
    filters = _event_filters(owner_id, project_id, start, end)
    filters.append(_terminal_full_run_event_predicate())

    count_query = select(func.count(AnalyticsEvent.id)).where(*filters)
    total = int((await db.execute(count_query)).scalar_one() or 0)

    query = (
        select(AnalyticsEvent)
        .where(*filters)
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(limit)
    )
    events = list((await db.execute(query)).scalars().all())

    project_ids = {event.project_id for event in events if event.project_id is not None}
    project_map: dict[uuid.UUID, Project] = {}
    if project_ids:
        projects_result = await db.execute(
            select(Project).where(Project.id.in_(project_ids))
        )
        project_map = {project.id: project for project in projects_result.scalars().all()}

    owner_map: dict[uuid.UUID, User] = {}
    if owner_id is None:
        owner_ids = {event.owner_id for event in events}
        if owner_ids:
            owners_result = await db.execute(select(User).where(User.id.in_(owner_ids)))
            owner_map = {user.id: user for user in owners_result.scalars().all()}

    items: list[RecentRunItem] = []
    for event in events:
        project = project_map.get(event.project_id) if event.project_id else None
        owner = owner_map.get(event.owner_id)
        run_id = str(event.id).replace("-", "")[:6]
        status_label = "Done" if event.status == "success" else "Failed"
        items.append(
            RecentRunItem(
                id=str(event.id),
                run_label=f"run_{run_id}",
                project_id=str(event.project_id) if event.project_id else None,
                pipeline_name=project.name if project else "Unknown pipeline",
                duration_ms=event.latency_ms,
                status=status_label,
                created_at=event.created_at,
                owner_id=str(event.owner_id) if owner_id is None else None,
                owner_email=owner.email if owner else None,
            )
        )

    return RecentRunList(items=items, total=total)


async def get_user_leaderboard(
    db: AsyncSession,
    *,
    range_key: str = "30d",
    limit: int = 20,
) -> UserLeaderboardList:
    start, end, _, _, _ = resolve_range(range_key)
    filters = [
        AnalyticsEvent.created_at >= start,
        AnalyticsEvent.created_at <= end,
    ]

    run_stats_query = (
        select(
            AnalyticsEvent.owner_id,
            func.count(AnalyticsEvent.id).label("run_count"),
            func.coalesce(func.sum(AnalyticsEvent.page_count), 0).label("pages_processed"),
            func.max(AnalyticsEvent.created_at).label("last_run_at"),
        )
        .where(*filters)
        .group_by(AnalyticsEvent.owner_id)
        .order_by(func.count(AnalyticsEvent.id).desc())
        .limit(limit)
    )
    run_rows = list((await db.execute(run_stats_query)).all())
    if not run_rows:
        return UserLeaderboardList(items=[])

    owner_ids = [row.owner_id for row in run_rows]
    users_result = await db.execute(select(User).where(User.id.in_(owner_ids)))
    user_map = {user.id: user for user in users_result.scalars().all()}

    project_counts = {
        row.owner_id: int(row.project_count)
        for row in (
            await db.execute(
                select(Project.owner_id, func.count(Project.id).label("project_count"))
                .where(Project.owner_id.in_(owner_ids))
                .group_by(Project.owner_id)
            )
        ).all()
    }

    items: list[UserLeaderboardItem] = []
    for row in run_rows:
        user = user_map.get(row.owner_id)
        if user is None:
            continue
        items.append(
            UserLeaderboardItem(
                user_id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                display_name=user.display_name,
                role=user.role,
                project_count=project_counts.get(user.id, 0),
                run_count=int(row.run_count or 0),
                pages_processed=int(row.pages_processed or 0),
                last_login_at=user.last_login_at,
                last_run_at=row.last_run_at,
            )
        )

    return UserLeaderboardList(items=items)


async def build_export_csv(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    range_key: str = "30d",
    project_id: uuid.UUID | None = None,
) -> str:
    summary = await get_summary(
        db, owner_id=owner_id, range_key=range_key, project_id=project_id
    )
    start, end, _, _, normalized = resolve_range(range_key)
    activity = await get_activity_series(
        db,
        owner_id=owner_id,
        from_at=start,
        to_at=end,
        bucket="day",
        project_id=project_id,
    )
    recent = await get_recent_runs(
        db,
        owner_id=owner_id,
        range_key=range_key,
        project_id=project_id,
        limit=100,
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["OCRFlow Analytics Export"])
    writer.writerow(["Range", normalized])
    writer.writerow(["From", summary.from_at.isoformat()])
    writer.writerow(["To", summary.to_at.isoformat()])
    writer.writerow([])

    writer.writerow(["Summary"])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Pages processed", summary.pages_processed])
    writer.writerow(["Pipeline runs", summary.pipeline_runs])
    writer.writerow(
        ["Success rate", f"{round(summary.success_rate * 100, 1)}%" if summary.success_rate else "—"]
    )
    writer.writerow(
        ["Avg latency per page", _format_latency_seconds(summary.avg_latency_ms_per_page)]
    )
    writer.writerow([])

    writer.writerow(["Daily activity"])
    writer.writerow(["Date", "Runs", "Pages", "Errors"])
    for bucket in activity.items:
        writer.writerow([
            bucket.bucket_start.date().isoformat(),
            bucket.runs,
            bucket.pages,
            bucket.errors,
        ])
    writer.writerow([])

    writer.writerow(["Recent runs"])
    run_headers = ["Run ID", "Pipeline", "Duration (ms)", "Status", "Created at"]
    if owner_id is None:
        run_headers.insert(2, "Owner")
    writer.writerow(run_headers)
    for run in recent.items:
        row = [
            run.run_label,
            run.pipeline_name,
        ]
        if owner_id is None:
            row.append(run.owner_email or "")
        row.extend([
            run.duration_ms if run.duration_ms is not None else "",
            run.status,
            run.created_at.isoformat(),
        ])
        writer.writerow(row)

    return buffer.getvalue()


async def _load_pipelines(
    db: AsyncSession,
    owner_id: uuid.UUID | None,
) -> list[Pipeline]:
    query = select(Pipeline).order_by(Pipeline.updated_at.desc())
    if owner_id is not None:
        query = query.where(Pipeline.owner_id == owner_id)
    result = await db.execute(query)
    return list(result.scalars().all())


def _aggregate_pipeline_graphs(pipelines: list[Pipeline]) -> dict[str, object]:
    total_nodes = 0
    total_edges = 0
    total_models = 0
    io_types: set[str] = set()

    for pipeline in pipelines:
        snapshot = parse_graph_snapshot(pipeline.graph)
        total_nodes += len(snapshot.nodes)
        total_edges += snapshot.edge_count
        total_models += len(snapshot.model_ids)
        if pipeline.input_type_label and pipeline.output_type_label:
            io_types.add(f"{pipeline.input_type_label} → {pipeline.output_type_label}")

    count = len(pipelines) or 1
    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "total_models": total_models,
        "avg_nodes": round(total_nodes / count, 1) if pipelines else 0.0,
        "avg_models": round(total_models / count, 1) if pipelines else 0.0,
        "avg_edges": round(total_edges / count, 1) if pipelines else 0.0,
        "unique_io_types": len(io_types),
    }


async def get_pipeline_library_stats(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
) -> PipelineLibraryStats:
    pipelines = await _load_pipelines(db, owner_id)
    graph_stats = _aggregate_pipeline_graphs(pipelines)

    active = sum(1 for pipeline in pipelines if not pipeline.is_archived)
    archived = sum(1 for pipeline in pipelines if pipeline.is_archived)

    return PipelineLibraryStats(
        total_pipelines=len(pipelines),
        active_pipelines=active,
        archived_pipelines=archived,
        avg_nodes=float(graph_stats["avg_nodes"]),
        avg_models=float(graph_stats["avg_models"]),
        avg_edges=float(graph_stats["avg_edges"]),
        unique_io_types=int(graph_stats["unique_io_types"]),
    )


async def get_pipeline_breakdown(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    limit: int = 50,
) -> PipelineBreakdownList:
    pipelines = await _load_pipelines(db, owner_id)
    if limit > 0:
        pipelines = pipelines[:limit]

    owner_map: dict[uuid.UUID, User] = {}
    if owner_id is None and pipelines:
        owner_ids = {pipeline.owner_id for pipeline in pipelines}
        owners_result = await db.execute(select(User).where(User.id.in_(owner_ids)))
        owner_map = {user.id: user for user in owners_result.scalars().all()}

    items: list[PipelineBreakdownItem] = []
    for pipeline in pipelines:
        snapshot = parse_graph_snapshot(pipeline.graph)
        owner = owner_map.get(pipeline.owner_id)
        items.append(
            PipelineBreakdownItem(
                pipeline_id=str(pipeline.id),
                name=pipeline.name,
                description=pipeline.description,
                node_count=len(snapshot.nodes),
                edge_count=snapshot.edge_count,
                model_count=len(snapshot.model_ids),
                input_type_label=pipeline.input_type_label,
                output_type_label=pipeline.output_type_label,
                accent_color=pipeline.accent_color,
                is_archived=pipeline.is_archived,
                created_at=pipeline.created_at,
                updated_at=pipeline.updated_at,
                owner_id=str(pipeline.owner_id) if owner_id is None else None,
                owner_email=owner.email if owner else None,
            )
        )

    return PipelineBreakdownList(items=items)


async def get_run_kind_breakdown(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID | None,
    range_key: str = "30d",
    project_id: uuid.UUID | None = None,
) -> RunKindBreakdown:
    start, end, _, _, _ = resolve_range(range_key)
    filters = _event_filters(owner_id, project_id, start, end)

    run_kind_expr = AnalyticsEvent.metadata_["run_kind"].as_string()

    counts_query = select(
        func.count(
            case(
                (
                    _terminal_full_run_event_predicate(),
                    1,
                )
            )
        ).label("pipeline_runs"),
        func.count(
            case(
                (
                    (AnalyticsEvent.event_type == "inference_run")
                    & (
                        (run_kind_expr == "test_run")
                        | (run_kind_expr.is_(None))
                    ),
                    1,
                )
            )
        ).label("test_runs"),
        func.count(
            case(
                (
                    (AnalyticsEvent.event_type == "inference_run")
                    & run_kind_expr.is_not(None)
                    & (run_kind_expr != "test_run"),
                    1,
                )
            )
        ).label("inference_runs"),
    ).where(*filters)

    row = (await db.execute(counts_query)).one()
    pipeline_count = int(row.pipeline_runs or 0)
    test_count = int(row.test_runs or 0)
    inference_count = int(row.inference_runs or 0)
    total = pipeline_count + test_count + inference_count

    if total == 0:
        return RunKindBreakdown(total_runs=0, segments=[])

    def pct(count: int) -> float:
        return round((count / total) * 100, 1)

    segments = [
        RunKindSegment(
            label="Test runs",
            count=test_count,
            percentage=pct(test_count),
            color_key="test_run",
        ),
        RunKindSegment(
            label="Pipeline runs",
            count=pipeline_count,
            percentage=pct(pipeline_count),
            color_key="pipeline_run",
        ),
        RunKindSegment(
            label="Inference runs",
            count=inference_count,
            percentage=pct(inference_count),
            color_key="inference_run",
        ),
    ]

    return RunKindBreakdown(total_runs=total, segments=segments)
