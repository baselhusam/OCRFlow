"""LaTeX OCR schemas for Surya."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import Formula, PageImage
from app.schemas.models.surya._meta import InferenceMeta


class FormulaRegionInput(BaseModel):
    id: str
    bbox: list[float] = Field(min_length=4, max_length=4)


class LatexOcrInput(BaseModel):
    page: PageImage
    formulas: list[FormulaRegionInput] = Field(default_factory=list)


class LatexOcrOutput(BaseModel):
    page_index: int
    formulas: list[Formula]
    meta: InferenceMeta
