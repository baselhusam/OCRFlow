"""Analytics API response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AnalyticsOverview(BaseModel):
    project_count: int = 0
    total_nodes: int = 0
    total_edges: int = 0
    unique_models: int = 0
    total_files: int = 0
    active_pipelines: int = 0
    total_runs: int = 0
    runs_today: int = 0
    pages_processed: int = 0
    success_rate: float | None = None
    last_activity_at: datetime | None = None


class ActivityBucket(BaseModel):
    bucket_start: datetime
    runs: int = 0
    pages: int = 0
    errors: int = 0
    active_projects: int = 0


class ActivitySeries(BaseModel):
    bucket: str
    from_at: datetime
    to_at: datetime
    items: list[ActivityBucket]


class ModelUsageItem(BaseModel):
    model_id: str
    display_name: str | None = None
    category: str | None = None
    run_count: int = 0
    avg_latency_ms: float | None = None
    success_rate: float | None = None
    last_used_at: datetime | None = None


class ModelUsageList(BaseModel):
    items: list[ModelUsageItem]


class ProjectBreakdownItem(BaseModel):
    project_id: str
    name: str
    node_count: int = 0
    model_count: int = 0
    file_count: int = 0
    run_count: int = 0
    last_activity_at: datetime | None = None
    updated_at: datetime
    owner_id: str | None = None
    owner_email: str | None = None
    icon: str | None = None
    color: str | None = None
    status: str | None = None


class ProjectBreakdownList(BaseModel):
    items: list[ProjectBreakdownItem]


class NodeBreakdownItem(BaseModel):
    project_id: str
    project_name: str
    node_id: str
    model_id: str
    category: str | None = None
    run_status: str | None = None
    last_run_at: str | None = None
    owner_email: str | None = None
    run_count: int = 0


class NodeBreakdownList(BaseModel):
    items: list[NodeBreakdownItem]


class DocumentBreakdownItem(BaseModel):
    project_id: str
    project_name: str
    asset_id: str
    filename: str
    format: str
    size_bytes: int = Field(ge=0)
    uploaded_at: datetime | None = None
    owner_email: str | None = None


class DocumentBreakdownList(BaseModel):
    items: list[DocumentBreakdownItem]


class AnalyticsKpi(BaseModel):
    label: str
    value: str
    delta: str
    delta_direction: str = "neutral"
    delta_label: str


class AnalyticsSummary(BaseModel):
    range: str
    from_at: datetime
    to_at: datetime
    pages_processed: int = 0
    pipeline_runs: int = 0
    success_rate: float | None = None
    avg_latency_ms_per_page: float | None = None
    kpis: list[AnalyticsKpi]


class RunOutcomeSegment(BaseModel):
    label: str
    count: int = 0
    percentage: float = 0.0
    color_key: str


class RunOutcomes(BaseModel):
    total_runs: int = 0
    segments: list[RunOutcomeSegment]


class TopPipelineItem(BaseModel):
    project_id: str
    name: str
    run_count: int = 0
    share: float = 0.0


class TopPipelineList(BaseModel):
    items: list[TopPipelineItem]


class RecentRunItem(BaseModel):
    id: str
    run_label: str
    project_id: str | None = None
    pipeline_name: str
    duration_ms: float | None = None
    status: str
    created_at: datetime
    owner_id: str | None = None
    owner_email: str | None = None


class RecentRunList(BaseModel):
    items: list[RecentRunItem]
    total: int = 0


class UserLeaderboardItem(BaseModel):
    user_id: str
    email: str
    full_name: str | None = None
    display_name: str | None = None
    role: str
    project_count: int = 0
    run_count: int = 0
    pages_processed: int = 0
    last_login_at: datetime | None = None
    last_run_at: datetime | None = None


class UserLeaderboardList(BaseModel):
    items: list[UserLeaderboardItem]


class UserActivityBucket(BaseModel):
    bucket_start: datetime
    active_users: int = 0


class UserActivitySeries(BaseModel):
    bucket: str
    from_at: datetime
    to_at: datetime
    items: list[UserActivityBucket]


class PipelineLibraryStats(BaseModel):
    total_pipelines: int = 0
    active_pipelines: int = 0
    archived_pipelines: int = 0
    avg_nodes: float = 0.0
    avg_models: float = 0.0
    avg_edges: float = 0.0
    unique_io_types: int = 0


class PipelineBreakdownItem(BaseModel):
    pipeline_id: str
    name: str
    description: str | None = None
    node_count: int = 0
    edge_count: int = 0
    model_count: int = 0
    input_type_label: str | None = None
    output_type_label: str | None = None
    accent_color: str = "#5B2EEF"
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    owner_id: str | None = None
    owner_email: str | None = None


class PipelineBreakdownList(BaseModel):
    items: list[PipelineBreakdownItem]


class RunKindSegment(BaseModel):
    label: str
    count: int = 0
    percentage: float = 0.0
    color_key: str


class RunKindBreakdown(BaseModel):
    total_runs: int = 0
    segments: list[RunKindSegment]
