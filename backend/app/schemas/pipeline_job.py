import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.pipeline_run import PipelineRunRead


PipelineJobStatus = Literal[
    "queued",
    "running",
    "succeeded",
    "failed",
    "partial",
    "cancelled",
]


class PipelineJobCreate(BaseModel):
    """Apply a reusable pipeline to one or more uploaded assets."""

    asset_ids: list[str] = Field(min_length=1, max_length=50)


class PipelineJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pipeline_id: uuid.UUID
    pipeline_name: str | None = None
    owner_id: uuid.UUID
    status: PipelineJobStatus
    document_count: int
    succeeded_count: int
    failed_count: int
    cancelled_count: int
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[PipelineRunRead] = Field(default_factory=list)


class PipelineJobList(BaseModel):
    items: list[PipelineJobRead]


class PipelineJobSummary(BaseModel):
    """Job row without nested run traces — used on list pages."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pipeline_id: uuid.UUID
    pipeline_name: str | None = None
    owner_id: uuid.UUID
    status: PipelineJobStatus
    document_count: int
    succeeded_count: int
    failed_count: int
    cancelled_count: int
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PipelineJobSummaryList(BaseModel):
    items: list[PipelineJobSummary]
