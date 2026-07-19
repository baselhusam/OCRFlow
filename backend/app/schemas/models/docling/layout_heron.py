"""Layout detection schemas for Docling layout models."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageImage, Region
from app.schemas.models.docling._meta import InferenceMeta


class LayoutDetectionOptions(BaseModel):
    keep_empty_clusters: bool = False
    skip_cell_assignment: bool = True


class LayoutDetectionInput(BaseModel):
    """Layout detection input.

    Example:
        {
            "page": {"page_index": 0, "image_base64": "...", "width": 1654, "height": 2339},
            "options": {"keep_empty_clusters": false, "skip_cell_assignment": false}
        }
    """

    page: PageImage
    options: LayoutDetectionOptions = Field(default_factory=LayoutDetectionOptions)


class LayoutDetectionOutput(BaseModel):
    page_index: int
    regions: list[Region]
    meta: InferenceMeta
