import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    allowed_pipeline_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)
    expires_at: datetime | None = None


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    owner_email: str | None = None
    name: str
    key_prefix: str
    allowed_pipeline_ids: list[str] = Field(default_factory=list)
    allowed_pipeline_names: list[str] = Field(default_factory=list)
    is_active: bool
    last_used_at: datetime | None
    expires_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime
    updated_at: datetime
    request_count: int = 0
    document_count: int = 0
    successful_requests: int = 0
    failed_requests: int = 0


class ApiKeyCreated(ApiKeyRead):
    key: str


class ApiKeyList(BaseModel):
    items: list[ApiKeyRead]


class ApiKeyUsageItem(BaseModel):
    id: uuid.UUID
    api_key_id: uuid.UUID
    pipeline_id: uuid.UUID | None
    pipeline_name: str | None = None
    endpoint: str
    method: str
    status_code: int
    outcome: Literal["success", "error"]
    document_count: int
    page_count: int
    error_code: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApiKeyUsageList(BaseModel):
    items: list[ApiKeyUsageItem]


class ApiKeyUsageSummary(BaseModel):
    request_count: int = 0
    document_count: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    last_used_at: datetime | None = None
    timeline: list[ApiKeyUsageItem] = Field(default_factory=list)


class DeveloperPipelineItem(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    input_type_label: str | None
    output_type_label: str | None


class DeveloperPipelineList(BaseModel):
    items: list[DeveloperPipelineItem]


class DeveloperUploadResponse(BaseModel):
    pipeline_id: uuid.UUID
    job_id: uuid.UUID | None = None
    runs: list[dict]
    retrieval: dict[str, str]
    output_format: Literal["json"] = "json"
