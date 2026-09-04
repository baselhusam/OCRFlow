"""Typed inputs and outputs for the local Liquid LFM2.5-VL provider."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.artifacts import PageImage

DEFAULT_VISION_MODEL = "LiquidAI/LFM2.5-VL-1.6B"
SUPPORTED_VISION_MODELS = frozenset({DEFAULT_VISION_MODEL})


class LiquidGenerationOptions(BaseModel):
    """Generation controls for the bundled LFM2.5-VL-1.6B checkpoint."""

    model: str = DEFAULT_VISION_MODEL
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=8192)
    system_prompt: str | None = Field(default=None, max_length=8000)

    @field_validator("model")
    @classmethod
    def validate_model(cls, value: str) -> str:
        if value not in SUPPORTED_VISION_MODELS:
            raise ValueError(
                f"model must be: {DEFAULT_VISION_MODEL}"
            )
        return value


class LiquidVisionInput(BaseModel):
    page: PageImage
    prompt: str = Field(
        default="Read this document page accurately, preserving meaningful structure.",
        min_length=1,
        max_length=20_000,
    )
    options: LiquidGenerationOptions = Field(default_factory=LiquidGenerationOptions)


class LiquidVisionStructuredInput(LiquidVisionInput):
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


class LiquidTextOutput(BaseModel):
    kind: Literal["text"] = "text"
    text: str
    model: str = DEFAULT_VISION_MODEL
    prompt_tokens: int | None = Field(default=None, ge=0)
    completion_tokens: int | None = Field(default=None, ge=0)


class LiquidStructuredOutput(BaseModel):
    kind: Literal["json"] = "json"
    data: dict[str, Any]
    raw_text: str
    model: str = DEFAULT_VISION_MODEL
    prompt_tokens: int | None = Field(default=None, ge=0)
    completion_tokens: int | None = Field(default=None, ge=0)
