"""Public contracts for configuring remote OCR engines."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.engine_url import EngineUrlSafetyError, normalise_engine_url

EngineProvider = Literal["docling", "surya", "paddle"]
EngineAuthType = Literal["none", "bearer", "x-api-key"]
EngineStatus = Literal[
    "ready", "partial", "authentication_required", "incompatible", "unreachable", "blocked"
]


def _normalise_url(value: str) -> str:
    try:
        return normalise_engine_url(value)
    except EngineUrlSafetyError as exc:
        raise ValueError(str(exc)) from exc


class EngineModelCheck(BaseModel):
    model_id: str
    available: bool
    message: str | None = None


class EngineValidation(BaseModel):
    status: EngineStatus
    detail: str
    provider: str | None = None
    api_version: str | None = None
    engine_version: str | None = None
    authentication_required: bool = False
    model_checks: list[EngineModelCheck] = Field(default_factory=list)


class EngineConnectionInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    provider: EngineProvider
    base_url: str
    auth_type: EngineAuthType = "none"
    api_key: str | None = Field(default=None, max_length=1024, repr=False)
    enabled: bool = True

    @field_validator("base_url")
    @classmethod
    def normalise_url(cls, value: str) -> str:
        return _normalise_url(value)

    @field_validator("api_key")
    @classmethod
    def strip_api_key(cls, value: str | None) -> str | None:
        return value.strip() if value else None


class EngineConnectionCreate(EngineConnectionInput):
    pass


class EngineConnectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    enabled: bool | None = None


class EngineConnection(BaseModel):
    id: UUID
    name: str
    provider: EngineProvider
    base_url: str
    auth_type: EngineAuthType
    has_api_key: bool
    enabled: bool
    last_validation: EngineValidation | None = None
    last_checked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EngineConnectionList(BaseModel):
    items: list[EngineConnection]


class EngineValidationRequest(BaseModel):
    provider: EngineProvider
    base_url: str
    auth_type: EngineAuthType = "none"
    api_key: str | None = Field(default=None, max_length=1024, repr=False)

    @field_validator("base_url")
    @classmethod
    def normalise_url(cls, value: str) -> str:
        return _normalise_url(value)

    @field_validator("api_key")
    @classmethod
    def strip_api_key(cls, value: str | None) -> str | None:
        return value.strip() if value else None
