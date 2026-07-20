"""Layout detection schemas for PaddleOCR PP-DocLayout models."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region
from app.schemas.models.paddle._meta import InferenceMeta


class DocLayoutOptions(BaseModel):
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class DocLayoutInput(BaseModel):
    """PP-DocLayout detection input.

    Example:
        {
            "page": {"page_index": 0, "image_base64": "...", "width": 1654, "height": 2339},
            "options": {"confidence_threshold": 0.5}
        }
    """

    page: PageImage
    options: DocLayoutOptions = Field(default_factory=DocLayoutOptions)


class DocLayoutOutput(BaseModel):
    page_index: int
    regions: list[Region]
    meta: InferenceMeta
