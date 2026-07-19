import pytest

from app.models.surya._common import bbox_iou


def test_bbox_iou_identical_boxes():
    bbox = [0.1, 0.2, 0.5, 0.6]
    assert bbox_iou(bbox, bbox) == pytest.approx(1.0)
