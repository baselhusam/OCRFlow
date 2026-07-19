"""Layout detection schemas for Surya."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region
from app.schemas.models.surya._meta import InferenceMeta


class LayoutDetectionOptions(BaseModel):
    confidence_threshold: float = Field(default=0.0, ge=0.0, le=1.0)


class LayoutDetectionInput(BaseModel):
    """Layout detection input.

    Example:
        {
            "page": {"page_index": 0, "image_base64": "...", "width": 1654, "height": 2339},
            "options": {"confidence_threshold": 0.0}
        }
    """

    page: PageImage
    options: LayoutDetectionOptions = Field(default_factory=LayoutDetectionOptions)


class LayoutDetectionOutput(BaseModel):
    page_index: int
    regions: list[Region]
    meta: InferenceMeta
