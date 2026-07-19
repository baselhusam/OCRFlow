"""Match upstream layout regions to Surya layout boxes for reading-order positions."""

from __future__ import annotations

from typing import Any

from app.models.surya._common import bbox_iou
from app.models.surya._mappers import polygon_box_to_text_line
from app.schemas.artifacts import BBox, Region

# Minimum overlap to accept a best-effort IoU match (cross-provider layouts).
_MIN_IOU = 0.05


def _bbox_center(bbox: BBox) -> tuple[float, float]:
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def _point_in_bbox(x: float, y: float, bbox: BBox) -> bool:
    return bbox[0] <= x <= bbox[2] and bbox[1] <= y <= bbox[3]


def _centers_overlap(region_bbox: BBox, candidate_bbox: BBox) -> bool:
    rcx, rcy = _bbox_center(region_bbox)
    ccx, ccy = _bbox_center(candidate_bbox)
    return _point_in_bbox(rcx, rcy, candidate_bbox) or _point_in_bbox(
        ccx, ccy, region_bbox
    )


def _geometric_position(region: Region) -> int:
    """Synthetic position from top-to-bottom, left-to-right reading order."""
    cx, cy = _bbox_center(region.bbox)
    return int(cy * 1_000_000 + cx * 1_000)


def _layout_candidates(
    layout_boxes: list[Any],
    width: int,
    height: int,
) -> list[tuple[int, BBox]]:
    candidates: list[tuple[int, BBox]] = []
    for box in layout_boxes:
        line = polygon_box_to_text_line(box, "tmp", width, height)
        candidates.append((int(box.position), line.bbox))
    return candidates


def match_regions_to_positions(
    regions: list[Region],
    layout_boxes: list[Any],
    width: int,
    height: int,
    *,
    iou_threshold: float = 0.3,
) -> dict[str, int]:
    """Map each region id to a Surya layout position (or geometric fallback)."""
    candidates = _layout_candidates(layout_boxes, width, height)
    positions: dict[str, int] = {}

    for region in regions:
        best_position: int | None = None
        best_iou = 0.0
        best_center_position: int | None = None
        best_center_iou = 0.0

        for position, candidate_bbox in candidates:
            iou = bbox_iou(region.bbox, candidate_bbox)
            if iou > best_iou:
                best_iou = iou
                best_position = position
            if _centers_overlap(region.bbox, candidate_bbox) and iou > best_center_iou:
                best_center_iou = iou
                best_center_position = position

        if best_center_position is not None:
            positions[region.id] = best_center_position
        elif best_position is not None and (
            best_iou >= iou_threshold or best_iou >= _MIN_IOU
        ):
            positions[region.id] = best_position
        elif best_position is not None and candidates:
            # Last resort: take the closest Surya box even with tiny overlap.
            positions[region.id] = best_position
        else:
            positions[region.id] = _geometric_position(region)

    return positions
