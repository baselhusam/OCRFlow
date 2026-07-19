"""Figure captioning schemas."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import Figure, PageImage, TextLine
from app.schemas.models.docling._meta import InferenceMeta


class PictureDescriptionInput(BaseModel):
    page: PageImage
    figures: list[Figure] = Field(default_factory=list)
    preset: str = "smolvlm"


class PictureDescriptionOutput(BaseModel):
    page_index: int
    lines: list[TextLine]
    meta: InferenceMeta
