"""Reading order schemas for Surya."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, ReadingOrder, Region
from app.schemas.models.surya._meta import InferenceMeta


class ReadingOrderOptions(BaseModel):
    iou_threshold: float = Field(default=0.3, ge=0.0, le=1.0)


class ReadingOrderInput(BaseModel):
    page: PageImage
    regions: list[Region] = Field(min_length=1)
    options: ReadingOrderOptions = Field(default_factory=ReadingOrderOptions)


class ReadingOrderOutput(BaseModel):
    page_index: int
    reading_order: ReadingOrder
    regions: list[Region]
    meta: InferenceMeta
