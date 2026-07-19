"""Shared OCR schemas for Docling OCR engines."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region, TextLine
from app.schemas.models.docling._meta import InferenceMeta


class OcrRecognitionInput(BaseModel):
    page: PageImage
    regions: list[Region] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=lambda: ["eng"])
    engine_options: dict[str, Any] = Field(default_factory=dict)


class OcrRecognitionOutput(BaseModel):
    page_index: int
    lines: list[TextLine]
    meta: InferenceMeta
