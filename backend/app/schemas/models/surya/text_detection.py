"""Text detection schemas for Surya."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region, TextLine
from app.schemas.models.surya._meta import InferenceMeta


class TextDetectionInput(BaseModel):
    page: PageImage
    regions: list[Region] = Field(default_factory=list)


class TextDetectionOutput(BaseModel):
    page_index: int
    lines: list[TextLine]
    meta: InferenceMeta
