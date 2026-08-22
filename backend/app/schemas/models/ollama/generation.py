"""Typed inputs and outputs for local Ollama text and vision nodes."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.artifacts import PageImage

DEFAULT_TEXT_MODEL = "qwen3:0.6b"
DEFAULT_VISION_MODEL = "qwen3.5:0.8b"
SUPPORTED_TEXT_MODELS = frozenset({DEFAULT_TEXT_MODEL, DEFAULT_VISION_MODEL})
SUPPORTED_VISION_MODELS = frozenset({DEFAULT_VISION_MODEL})


class OllamaGenerationOptions(BaseModel):
    model: str = DEFAULT_TEXT_MODEL
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=8192)
    system_prompt: str | None = Field(default=None, max_length=8000)


class OllamaTextInput(BaseModel):
    text: str = Field(min_length=1, max_length=200_000)
    prompt: str = Field(
        default="Summarize the input accurately and concisely.",
        min_length=1,
        max_length=20_000,
    )
    options: OllamaGenerationOptions = Field(default_factory=OllamaGenerationOptions)

    @field_validator("options")
    @classmethod
    def validate_text_model(
        cls,
        value: OllamaGenerationOptions,
    ) -> OllamaGenerationOptions:
        if value.model not in SUPPORTED_TEXT_MODELS:
            raise ValueError(
                f"model must be one of: {', '.join(sorted(SUPPORTED_TEXT_MODELS))}"
            )
        return value


class OllamaStructuredInput(OllamaTextInput):
    json_schema: dict[str, Any]

    @field_validator("json_schema")
    @classmethod
    def validate_json_schema(cls, value: dict[str, Any]) -> dict[str, Any]:
        if value.get("type") != "object":
            raise ValueError("json_schema must describe a top-level object")
        properties = value.get("properties")
        if not isinstance(properties, dict) or not properties:
            raise ValueError("json_schema.properties must be a non-empty object")
        return value


class OllamaVisionInput(BaseModel):
    page: PageImage
    prompt: str = Field(
        default="Describe this document page, including charts and tables.",
        min_length=1,
        max_length=20_000,
    )
    options: OllamaGenerationOptions = Field(
        default_factory=lambda: OllamaGenerationOptions(model=DEFAULT_VISION_MODEL)
    )

    @field_validator("options")
    @classmethod
    def validate_vision_model(
        cls,
        value: OllamaGenerationOptions,
    ) -> OllamaGenerationOptions:
        if value.model not in SUPPORTED_VISION_MODELS:
            raise ValueError(
                f"vision model must be one of: {', '.join(sorted(SUPPORTED_VISION_MODELS))}"
            )
        return value


class OllamaVisionStructuredInput(OllamaVisionInput):
    json_schema: dict[str, Any]

    @field_validator("json_schema")
    @classmethod
    def validate_json_schema(cls, value: dict[str, Any]) -> dict[str, Any]:
        if value.get("type") != "object":
            raise ValueError("json_schema must describe a top-level object")
        properties = value.get("properties")
        if not isinstance(properties, dict) or not properties:
            raise ValueError("json_schema.properties must be a non-empty object")
        return value


class OllamaTextOutput(BaseModel):
    kind: Literal["text"] = "text"
    text: str
    model: str
    prompt_tokens: int | None = Field(default=None, ge=0)
    completion_tokens: int | None = Field(default=None, ge=0)


class OllamaStructuredOutput(BaseModel):
    kind: Literal["json"] = "json"
    data: dict[str, Any]
    raw_text: str
    model: str
    prompt_tokens: int | None = Field(default=None, ge=0)
    completion_tokens: int | None = Field(default=None, ge=0)
