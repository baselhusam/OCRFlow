"""Table structure schemas for Docling TableFormer."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, TableStructure
from app.schemas.models.docling._meta import InferenceMeta


class TableStructureOptions(BaseModel):
    do_cell_matching: bool = True


class TableRegionInput(BaseModel):
    id: str
    bbox: list[float] = Field(min_length=4, max_length=4)


class TableStructureInput(BaseModel):
    page: PageImage
    tables: list[TableRegionInput] = Field(default_factory=list)
    options: TableStructureOptions = Field(default_factory=TableStructureOptions)


class TableStructureOutput(BaseModel):
    page_index: int
    tables: list[TableStructure]
    meta: InferenceMeta
