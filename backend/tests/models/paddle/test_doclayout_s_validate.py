import pytest

from app.models.errors import ModelValidationError
from app.models.paddle._label_map import map_paddle_label
from app.models.paddle._mappers import paddle_layout_box_to_region
from app.models.paddle.doclayout_validate import validate_layout_regions
from app.schemas.artifacts import LayoutLabel, Region


def test_map_paddle_label_defaults_to_other():
    assert map_paddle_label("text") == LayoutLabel.paragraph
    assert map_paddle_label("Table") == LayoutLabel.table
    assert map_paddle_label("weird_unknown") == LayoutLabel.other


def test_layout_box_to_region_normalizes_and_keeps_provider_label():
    region = paddle_layout_box_to_region([10, 20, 90, 80], "text", 0.9, "r1", 100, 100)
    assert region is not None
    assert region.bbox == [0.1, 0.2, 0.9, 0.8]
    assert region.provider_label == "text"
    assert region.label == LayoutLabel.paragraph


def test_layout_box_below_threshold_is_dropped():
    region = paddle_layout_box_to_region(
        [10, 20, 90, 80], "text", 0.2, "r1", 100, 100, confidence_threshold=0.5
    )
    assert region is None


def test_validate_layout_regions_rejects_duplicate_ids(sample_bbox):
    regions = [
        Region(id="r1", label=LayoutLabel.paragraph, bbox=sample_bbox, confidence=0.9),
        Region(id="r1", label=LayoutLabel.table, bbox=sample_bbox, confidence=0.8),
    ]
    with pytest.raises(ModelValidationError):
        validate_layout_regions(regions)
