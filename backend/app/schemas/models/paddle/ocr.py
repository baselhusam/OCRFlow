"""Text recognition schemas for PaddleOCR (PP-OCR det+rec)."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region, TextLine
from app.schemas.models.paddle._meta import InferenceMeta


class PaddleOcrOptions(BaseModel):
    use_angle_cls: bool = True
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class PaddleOcrInput(BaseModel):
    """PP-OCR recognition input.

    When ``regions`` is empty the runner performs full-page detection + recognition.
    When ``regions`` are supplied it crops each region and recognizes text within it,
    returning one line per region.

    Example:
        {
            "page": {"page_index": 0, "image_base64": "...", "width": 1654, "height": 2339},
            "languages": ["en"],
            "options": {"use_angle_cls": true, "confidence_threshold": 0.5}
        }
    """

    page: PageImage
    regions: list[Region] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=lambda: ["en"])
    options: PaddleOcrOptions = Field(default_factory=PaddleOcrOptions)


class PaddleOcrOutput(BaseModel):
    page_index: int
    lines: list[TextLine]
    meta: InferenceMeta
