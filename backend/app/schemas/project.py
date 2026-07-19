import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProjectStatus = Literal["draft", "idle", "running", "live", "failed"]

PROJECT_STATUSES: frozenset[str] = frozenset(
    {"draft", "idle", "running", "live", "failed"}
)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1024)
    icon: str | None = Field(default=None, max_length=64)
    color: str | None = Field(default=None, max_length=7)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1024)
    graph: dict[str, Any] | None = None
    icon: str | None = Field(default=None, max_length=64)
    color: str | None = Field(default=None, max_length=7)
    is_archived: bool | None = None
    status: ProjectStatus | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    graph: dict[str, Any]
    icon: str
    color: str
    is_archived: bool
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectList(BaseModel):
    items: list[ProjectRead]
