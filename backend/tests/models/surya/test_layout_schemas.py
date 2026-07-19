from types import SimpleNamespace

import pytest

from app.models.errors import ModelValidationError
from app.models.surya._label_map import map_surya_label
from app.models.surya.layout_validate import layout_box_to_region, validate_layout_regions
from app.schemas.artifacts import LayoutLabel, Region
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.layout import LayoutDetectionInput, LayoutDetectionOutput


def test_layout_detection_input_round_trip(sample_page_image):
    payload = LayoutDetectionInput(page=sample_page_image).model_dump()
    restored = LayoutDetectionInput.model_validate(payload)
    assert restored.page.page_index == 0


def test_layout_detection_output_round_trip(sample_region):
    output = LayoutDetectionOutput(
        page_index=0,
        regions=[sample_region],
        meta=InferenceMeta(model_id="surya/layout", latency_ms=12.5),
    )
    restored = LayoutDetectionOutput.model_validate(output.model_dump())
    assert restored.meta.model_id == "surya/layout"


def test_map_surya_label_text_to_paragraph():
    assert map_surya_label("Text") == LayoutLabel.paragraph


def test_layout_box_to_region_normalized_bbox():
    box = SimpleNamespace(
        label="Table",
        confidence=0.9,
        bbox=[100, 200, 500, 400],
        polygon=[[100, 200], [500, 200], [500, 400], [100, 400]],
        top_k={"Table": 0.9},
    )
    region = layout_box_to_region(box, "r1", width=1000, height=1000)
    assert region is not None
    assert region.id == "r1"
    assert region.provider_label == "Table"
    assert region.bbox == [0.1, 0.2, 0.5, 0.4]


def test_validate_layout_regions_rejects_duplicate_ids(sample_bbox):
    regions = [
        Region(id="r1", label=LayoutLabel.paragraph, bbox=sample_bbox, confidence=0.9),
        Region(id="r1", label=LayoutLabel.table, bbox=sample_bbox, confidence=0.8),
    ]
    with pytest.raises(ModelValidationError):
        validate_layout_regions(regions)
