"""Public contracts for LLM and VLM provider connections."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.engine_url import EngineUrlSafetyError, normalise_engine_url

ModelProtocol = Literal["openai", "anthropic", "openai-compatible", "anthropic-compatible"]
ModelConnectionStatus = Literal["ready", "authentication_required", "incompatible", "unreachable", "blocked"]


def _url(value: str) -> str:
    try:
        return normalise_engine_url(value)
    except EngineUrlSafetyError as exc:
        raise ValueError(str(exc)) from exc


class ModelConnectionValidation(BaseModel):
    status: ModelConnectionStatus
    detail: str
    discovered_models: list[str] = Field(default_factory=list)
    authentication_required: bool = False


class ModelConnectionInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    protocol: ModelProtocol
    base_url: str
    api_key: str | None = Field(default=None, max_length=1024, repr=False)
    text_model: str | None = Field(default=None, max_length=256)
    vision_model: str | None = Field(default=None, max_length=256)
    enabled: bool = True

    @field_validator("base_url")
    @classmethod
    def normalise_url(cls, value: str) -> str:
        return _url(value)

    @field_validator("api_key", "text_model", "vision_model")
    @classmethod
    def strip(cls, value: str | None) -> str | None:
        return value.strip() if value else None


class ModelConnectionCreate(ModelConnectionInput):
    pass


class ModelConnectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    enabled: bool | None = None


class ModelConnection(BaseModel):
    id: UUID
    name: str
    protocol: ModelProtocol
    base_url: str
    text_model: str | None = None
    vision_model: str | None = None
    has_api_key: bool
    enabled: bool
    last_validation: ModelConnectionValidation | None = None
    last_checked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ModelConnectionList(BaseModel):
    items: list[ModelConnection]


class ModelConnectionValidationRequest(ModelConnectionInput):
    pass
