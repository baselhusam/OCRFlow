"""Post-inference validation for PaddleOCR PP-DocLayout detection."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import Region, validate_bbox


def validate_layout_regions(regions: list[Region]) -> list[Region]:
    seen_ids: set[str] = set()
    for region in regions:
        if region.id in seen_ids:
            raise ModelValidationError(f"Duplicate region id: {region.id}")
        seen_ids.add(region.id)
        validate_bbox(region.bbox)
    return regions
