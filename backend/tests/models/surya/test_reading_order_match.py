"""Tests for reading-order region matching."""

from __future__ import annotations

from types import SimpleNamespace

from app.models.surya.reading_order_match import match_regions_to_positions
from app.schemas.artifacts import LayoutLabel, Region


def _box(position: int, bbox_norm: list[float]) -> SimpleNamespace:
    x0, y0, x1, y1 = bbox_norm
    width, height = 1000, 1000
    px_bbox = [x0 * width, y0 * height, x1 * width, y1 * height]
    return SimpleNamespace(
        position=position,
        bbox=px_bbox,
        polygon=[
            [px_bbox[0], px_bbox[1]],
            [px_bbox[2], px_bbox[1]],
            [px_bbox[2], px_bbox[3]],
            [px_bbox[0], px_bbox[3]],
        ],
        confidence=0.9,
    )


def test_exact_overlap_uses_surya_position():
    regions = [
        Region(
            id="r1",
            label=LayoutLabel.paragraph,
            bbox=[0.1, 0.1, 0.4, 0.2],
            confidence=0.9,
        )
    ]
    layout_boxes = [_box(3, [0.1, 0.1, 0.4, 0.2])]
    positions = match_regions_to_positions(regions, layout_boxes, 1000, 1000)
    assert positions["r1"] == 3


def test_low_iou_with_center_overlap_prefers_center_match():
    regions = [
        Region(
            id="r1",
            label=LayoutLabel.paragraph,
            bbox=[0.0, 0.0, 0.8, 0.8],
            confidence=0.9,
        )
    ]
    layout_boxes = [
        _box(1, [0.35, 0.35, 0.45, 0.45]),
        _box(7, [0.7, 0.7, 0.9, 0.9]),
    ]
    positions = match_regions_to_positions(
        regions, layout_boxes, 1000, 1000, iou_threshold=0.3
    )
    assert positions["r1"] == 1


def test_tiny_iou_still_assigns_best_layout_box():
    regions = [
        Region(
            id="r1",
            label=LayoutLabel.paragraph,
            bbox=[0.0, 0.0, 0.9, 0.9],
            confidence=0.9,
        )
    ]
    layout_boxes = [_box(2, [0.8, 0.8, 0.85, 0.85])]
    positions = match_regions_to_positions(
        regions, layout_boxes, 1000, 1000, iou_threshold=0.3
    )
    assert positions["r1"] == 2


def test_no_layout_boxes_falls_back_to_geometric_order():
    regions = [
        Region(
            id="top",
            label=LayoutLabel.paragraph,
            bbox=[0.1, 0.1, 0.3, 0.2],
            confidence=0.9,
        ),
        Region(
            id="bottom",
            label=LayoutLabel.paragraph,
            bbox=[0.1, 0.7, 0.3, 0.8],
            confidence=0.9,
        ),
    ]
    positions = match_regions_to_positions(regions, [], 1000, 1000)
    assert positions["top"] < positions["bottom"]
