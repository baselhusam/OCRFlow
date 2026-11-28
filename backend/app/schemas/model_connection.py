"""Public contracts for LLM and VLM provider connections."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.engine_url import EngineUrlSafetyError, normalise_engine_url

ModelProtocol = Literal["openai", "anthropic", "openai-compatible", "anthropic-compatible", "openrouter"]

#: OpenRouter's fixed API root. The connection form pre-fills it.
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
ModelConnectionStatus = Literal["ready", "authentication_required", "incompatible", "unreachable", "blocked"]


def _url(value: str) -> str:
    try:
        return normalise_engine_url(value)
    except EngineUrlSafetyError as exc:
        raise ValueError(str(exc)) from exc


class OcrModel(BaseModel):
    """A hosted model that can read page images (image in, text out)."""

    id: str
    name: str
    description: str | None = None
    context_length: int | None = None
    #: USD per million tokens, as reported by the provider.
    prompt_price: float | None = None
    completion_price: float | None = None
    structured_outputs: bool = False
    free: bool = False
    #: The provider describes the model as built for OCR / documents.
    document_focused: bool = False


class ModelConnectionValidation(BaseModel):
    status: ModelConnectionStatus
    detail: str
    discovered_models: list[str] = Field(default_factory=list)
    #: OCR-capable models discovered on catalog-style providers (OpenRouter).
    ocr_models: list[OcrModel] = Field(default_factory=list)
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
    #: Model ids to show on the canvas; ``null`` restores the recommended set.
    enabled_models: list[str] | None = Field(default=None, max_length=5000)


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
    #: Discovered models enabled for the canvas (resolved, never null).
    enabled_models: list[str] = Field(default_factory=list)
    last_checked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ModelConnectionList(BaseModel):
    items: list[ModelConnection]


class OcrCatalogConnection(BaseModel):
    """A validated connection and its OCR models, safe for every signed-in user."""

    connection_id: UUID
    connection_name: str
    protocol: ModelProtocol
    models: list[OcrModel]


class OcrCatalog(BaseModel):
    connections: list[OcrCatalogConnection]


class ModelConnectionValidationRequest(ModelConnectionInput):
    pass
