import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


PipelineRunStatus = Literal["queued", "running", "succeeded", "failed", "cancelled"]


class PipelineRunCreate(BaseModel):
    """Start a reusable pipeline against an uploaded project asset.

    Pipelines do not embed file loaders — the API adapts ``asset_id`` into the
    pipeline's declared input wire kind before execution.
    """

    asset_id: str = Field(min_length=1, max_length=64)
    # Optional owning project used to resolve ``asset:`` paths. Defaults to a
    # synthetic pipeline-scoped namespace when omitted.
    project_id: uuid.UUID | None = None


class PipelineRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pipeline_id: uuid.UUID
    job_id: uuid.UUID | None = None
    owner_id: uuid.UUID
    status: PipelineRunStatus
    task_id: str | None
    input_asset_id: str | None
    input_filename: str | None = None
    input_wire_kind: str | None
    page_count: int | None = None
    result: dict[str, Any] | None
    node_traces: list[dict[str, Any]] = Field(default_factory=list)
    logs: list[dict[str, Any]] = Field(default_factory=list)
    current_node_id: str | None
    completed_count: int
    total_count: int
    error: str | None
    error_code: str | None
    error_context: dict[str, Any] | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PipelineRunList(BaseModel):
    items: list[PipelineRunRead]
