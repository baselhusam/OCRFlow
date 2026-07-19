"""Figure classification schemas."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import Figure, PageImage
from app.schemas.models.docling._meta import InferenceMeta


class FigureClassificationInput(BaseModel):
    page: PageImage
    figures: list[Figure] = Field(default_factory=list)


class FigureClassificationOutput(BaseModel):
    page_index: int
    figures: list[Figure]
    meta: InferenceMeta
