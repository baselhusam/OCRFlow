import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PipelineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1024)
    accent_color: str | None = Field(default=None, max_length=7)
    graph: dict[str, Any] | None = None


class PipelineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1024)
    graph: dict[str, Any] | None = None
    accent_color: str | None = Field(default=None, max_length=7)
    is_archived: bool | None = None


class PipelineBoundaryIO(BaseModel):
    valid: bool
    errors: list[str] = Field(default_factory=list)
    entry_node_ids: list[str] = Field(default_factory=list)
    exit_node_ids: list[str] = Field(default_factory=list)
    input_wire_kind: str | None = None
    output_wire_kind: str | None = None
    input_type_label: str | None = None
    output_type_label: str | None = None


class PipelineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    graph: dict[str, Any]
    input_wire_kind: str | None
    output_wire_kind: str | None
    input_type_label: str | None
    output_type_label: str | None
    accent_color: str
    is_archived: bool
    has_logo: bool = False
    created_at: datetime
    updated_at: datetime


class PipelineList(BaseModel):
    items: list[PipelineRead]
