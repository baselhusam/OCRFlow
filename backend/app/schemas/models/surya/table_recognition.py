"""Table recognition schemas for Surya."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, TableStructure
from app.schemas.models.surya._meta import InferenceMeta


class TableRecognitionOptions(BaseModel):
    detect_boxes: bool = True


class TableRegionInput(BaseModel):
    id: str
    bbox: list[float] = Field(min_length=4, max_length=4)


class TableRecognitionInput(BaseModel):
    page: PageImage
    tables: list[TableRegionInput] = Field(default_factory=list)
    options: TableRecognitionOptions = Field(default_factory=TableRecognitionOptions)


class TableRecognitionOutput(BaseModel):
    page_index: int
    tables: list[TableStructure]
    meta: InferenceMeta
