"""VLM convert schemas."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.artifacts import DocumentArtifact, DocumentInput
from app.schemas.models.docling._meta import InferenceMeta


class VlmConvertOptions(BaseModel):
    project_id: str | None = Field(
        default=None,
        description="Project id required when document.source uses asset:{id}",
    )
    preset: str = "granite_docling"
    engine: str = "transformers"
    export: list[str] = Field(default_factory=lambda: ["markdown", "json"])


class VlmConvertInput(BaseModel):
    document: DocumentInput
    options: VlmConvertOptions = Field(default_factory=VlmConvertOptions)


class VlmConvertOutput(BaseModel):
    document: DocumentArtifact
    doctags: str | None = None
    markdown: str | None = None
    json_data: dict[str, Any] | None = Field(default=None, serialization_alias="json")
    meta: InferenceMeta
