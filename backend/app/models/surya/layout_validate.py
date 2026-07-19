"""Post-inference validation and label mapping for Surya layout detection."""

from __future__ import annotations

from typing import Any

from app.models.errors import ModelValidationError
from app.models.surya._common import extract_confidence_from_top_k, surya_bbox_to_normalized
from app.models.surya._label_map import map_surya_label
from app.schemas.artifacts import Region, validate_bbox


def layout_box_to_region(
    box: Any,
    region_id: str,
    width: int,
    height: int,
    *,
    confidence_threshold: float = 0.0,
) -> Region | None:
    label = str(box.label)
    confidence = float(box.confidence) if box.confidence is not None else extract_confidence_from_top_k(
        getattr(box, "top_k", None), label
    )
    if confidence < confidence_threshold:
        return None

    bbox = surya_bbox_to_normalized(box.bbox, width, height)
    validate_bbox(bbox)
    return Region(
        id=region_id,
        label=map_surya_label(label),
        bbox=bbox,
        confidence=confidence,
        provider_label=label,
    )


def validate_layout_regions(regions: list[Region]) -> list[Region]:
    seen_ids: set[str] = set()
    for region in regions:
        if region.id in seen_ids:
            raise ModelValidationError(f"Duplicate region id: {region.id}")
        seen_ids.add(region.id)
        validate_bbox(region.bbox)
    return regions
