"""Full DocumentConverter preset schemas."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.artifacts import DocumentArtifact, DocumentInput
from app.schemas.models.docling._meta import InferenceMeta


class ConvertPipelineOptions(BaseModel):
    project_id: str | None = Field(
        default=None,
        description="Project id required when document.source uses asset:{id}",
    )
    layout_model: str = "heron"
    ocr_engine: str = "auto"
    tableformer_mode: str = "accurate"
    enrich_pictures: bool = True
    enrich_formulas: bool = True


class ConvertPipelineInput(BaseModel):
    document: DocumentInput
    options: ConvertPipelineOptions = Field(default_factory=ConvertPipelineOptions)


class ConvertPipelineOutput(BaseModel):
    document: DocumentArtifact
    markdown: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    meta: InferenceMeta
