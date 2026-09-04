"""Provider-neutral LLM/VLM execution contracts."""
from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator
from app.schemas.artifacts import PageImage

class ConnectedOptions(BaseModel):
    connection_id: str = Field(min_length=1)
    model: str = Field(min_length=1, max_length=256)
    temperature: float = Field(default=0, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=1, le=32768)
    system_prompt: str | None = Field(default=None, max_length=8000)
    provider_protocol: Literal["openai", "anthropic", "openai-compatible", "anthropic-compatible"] | None = None

class ConnectedTextInput(BaseModel):
    text: str = Field(min_length=1, max_length=200_000)
    prompt: str = Field(min_length=1, max_length=20_000)
    options: ConnectedOptions

class ConnectedStructuredInput(ConnectedTextInput):
    json_schema: dict[str, Any]
    @field_validator("json_schema")
    @classmethod
    def schema(cls, value: dict[str, Any]) -> dict[str, Any]:
        if value.get("type") != "object" or not isinstance(value.get("properties"), dict): raise ValueError("json_schema must be a top-level object with properties")
        return value

class ConnectedVisionInput(BaseModel):
    page: PageImage
    prompt: str = Field(min_length=1, max_length=20_000)
    options: ConnectedOptions

class ConnectedVisionStructuredInput(ConnectedVisionInput):
    json_schema: dict[str, Any]
    @field_validator("json_schema")
    @classmethod
    def schema(cls, value: dict[str, Any]) -> dict[str, Any]:
        if value.get("type") != "object" or not isinstance(value.get("properties"), dict): raise ValueError("json_schema must be a top-level object with properties")
        return value

class ConnectedTextOutput(BaseModel):
    kind: Literal["text"] = "text"
    text: str
    model: str
    provider: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None

class ConnectedStructuredOutput(BaseModel):
    kind: Literal["json"] = "json"
    data: dict[str, Any]
    raw_text: str
    model: str
    provider: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
