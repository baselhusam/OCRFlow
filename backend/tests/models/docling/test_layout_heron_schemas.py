import pytest

from app.models.docling.layout_heron_validate import map_docling_label, validate_layout_regions
from app.models.errors import ModelValidationError
from app.schemas.artifacts import LayoutLabel, Region
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.layout_heron import (
    LayoutDetectionInput,
    LayoutDetectionOutput,
)


def test_layout_detection_input_round_trip(sample_page_image):
    payload = LayoutDetectionInput(page=sample_page_image).model_dump()
    restored = LayoutDetectionInput.model_validate(payload)
    assert restored.page.page_index == 0


def test_layout_detection_output_round_trip(sample_region):
    output = LayoutDetectionOutput(
        page_index=0,
        regions=[sample_region],
        meta=InferenceMeta(model_id="docling/layout-heron", latency_ms=12.5),
    )
    restored = LayoutDetectionOutput.model_validate(output.model_dump())
    assert restored.meta.model_id == "docling/layout-heron"


def test_map_docling_label_text_to_paragraph():
    assert map_docling_label("text") == LayoutLabel.paragraph


def test_validate_layout_regions_rejects_duplicate_ids(sample_bbox):
    regions = [
        Region(id="r1", label=LayoutLabel.paragraph, bbox=sample_bbox, confidence=0.9),
        Region(id="r1", label=LayoutLabel.table, bbox=sample_bbox, confidence=0.8),
    ]
    with pytest.raises(ModelValidationError):
        validate_layout_regions(regions)
