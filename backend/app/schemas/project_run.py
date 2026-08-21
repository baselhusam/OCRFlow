import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


ProjectRunStatus = Literal["queued", "running", "succeeded", "failed", "cancelled"]


class ProjectRunCreate(BaseModel):
    pass


class ProjectRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    owner_id: uuid.UUID
    status: ProjectRunStatus
    task_id: str | None
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


class ProjectRunList(BaseModel):
    items: list[ProjectRunRead]


class ProjectBatchRunRequest(BaseModel):
    asset_ids: list[str]


class ProjectBatchRunResponse(BaseModel):
    items: list[ProjectRunRead]
