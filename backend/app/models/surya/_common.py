"""Surya-specific coordinate and prediction helpers."""

from __future__ import annotations

from typing import Any

from app.models._image_utils import normalize_bbox_from_pixels, normalize_polygon_from_pixels
from app.schemas.artifacts import BBox, Polygon


def surya_bbox_to_normalized(bbox: list[float], width: int, height: int) -> BBox:
    if len(bbox) != 4:
        raise ValueError("Surya bbox must have 4 values")
    return normalize_bbox_from_pixels(bbox[0], bbox[1], bbox[2], bbox[3], width, height)


def surya_polygon_to_normalized(polygon: list[list[float]], width: int, height: int) -> Polygon:
    return normalize_polygon_from_pixels(polygon, width, height)


def bbox_iou(a: BBox, b: BBox) -> float:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    inter_x0 = max(ax0, bx0)
    inter_y0 = max(ay0, by0)
    inter_x1 = min(ax1, bx1)
    inter_y1 = min(ay1, by1)
    if inter_x1 <= inter_x0 or inter_y1 <= inter_y0:
        return 0.0
    inter_area = (inter_x1 - inter_x0) * (inter_y1 - inter_y0)
    area_a = (ax1 - ax0) * (ay1 - ay0)
    area_b = (bx1 - bx0) * (by1 - by0)
    union = area_a + area_b - inter_area
    if union <= 0:
        return 0.0
    return inter_area / union


def extract_confidence_from_top_k(top_k: dict[str, float] | None, label: str) -> float:
    if not top_k:
        return 1.0
    if label in top_k:
        return float(top_k[label])
    if top_k:
        return float(max(top_k.values()))
    return 1.0


def get_page_dimensions(prediction: dict[str, Any], fallback_width: int, fallback_height: int) -> tuple[int, int]:
    image_bbox = prediction.get("image_bbox")
    if isinstance(image_bbox, list) and len(image_bbox) == 4:
        width = int(image_bbox[2] - image_bbox[0])
        height = int(image_bbox[3] - image_bbox[1])
        if width > 0 and height > 0:
            return width, height
    return fallback_width, fallback_height
