"""Code and formula extraction schemas."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import Formula, PageImage, Region
from app.schemas.models.docling._meta import InferenceMeta


class CodeFormulaInput(BaseModel):
    page: PageImage
    regions: list[Region] = Field(default_factory=list)
    preset: str = "codeformulav2"


class CodeFormulaOutput(BaseModel):
    page_index: int
    formulas: list[Formula]
    regions: list[Region] = Field(default_factory=list)
    meta: InferenceMeta
