"""PP-StructureV3 schemas for PaddleOCR.

PP-StructureV3 is a full document-parsing pipeline (layout + OCR + tables). The
endpoint therefore returns a flattened page artifact — ``regions`` (layout),
``lines`` (OCR text lines), and ``tables`` (structure + HTML) — matching the fields of
``app.schemas.artifacts.PageArtifact``.
"""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region, TableStructure, TextLine
from app.schemas.models.paddle._meta import InferenceMeta


class PpStructureOptions(BaseModel):
    do_ocr: bool = True


class PpStructureInput(BaseModel):
    """PP-StructureV3 input.

    Example:
        {
            "page": {"page_index": 0, "image_base64": "...", "width": 1654, "height": 2339},
            "options": {"do_ocr": true}
        }
    """

    page: PageImage
    options: PpStructureOptions = Field(default_factory=PpStructureOptions)


class PpStructureOutput(BaseModel):
    page_index: int
    regions: list[Region]
    lines: list[TextLine]
    tables: list[TableStructure]
    meta: InferenceMeta
