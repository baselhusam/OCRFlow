"""Text recognition schemas for Surya."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region, TextLine
from app.schemas.models.surya._meta import InferenceMeta


class TextRecognitionOptions(BaseModel):
    task_name: str = "ocr_with_boxes"
    disable_math: bool = False
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class TextRecognitionInput(BaseModel):
    page: PageImage
    lines: list[TextLine] = Field(default_factory=list)
    regions: list[Region] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=lambda: ["eng"])
    options: TextRecognitionOptions = Field(default_factory=TextRecognitionOptions)
    engine_options: dict[str, Any] = Field(default_factory=dict)


class TextRecognitionOutput(BaseModel):
    page_index: int
    lines: list[TextLine]
    meta: InferenceMeta
