"""Validation for Surya reading order."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import Region, validate_bbox


def validate_reading_order(regions: list[Region], ordered_ids: list[str]) -> list[Region]:
    region_ids = {region.id for region in regions}
    if len(ordered_ids) != len(regions):
        raise ModelValidationError("reading_order length must match regions length")
    if set(ordered_ids) != region_ids:
        raise ModelValidationError("reading_order ids must match input region ids")

    ordered_regions: list[Region] = []
    region_by_id = {region.id: region for region in regions}
    for region_id in ordered_ids:
        region = region_by_id[region_id]
        validate_bbox(region.bbox)
        ordered_regions.append(region)
    return ordered_regions
