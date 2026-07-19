import pytest

from app.models.errors import ModelValidationError
from app.models.surya.reading_order_validate import validate_reading_order
from app.schemas.artifacts import LayoutLabel, ReadingOrder, Region
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.reading_order import ReadingOrderInput, ReadingOrderOutput


def test_reading_order_input_round_trip(sample_page_image, sample_region):
    payload = ReadingOrderInput(page=sample_page_image, regions=[sample_region]).model_dump()
    restored = ReadingOrderInput.model_validate(payload)
    assert restored.regions[0].id == "r1"


def test_reading_order_output_round_trip(sample_region):
    output = ReadingOrderOutput(
        page_index=0,
        reading_order=ReadingOrder(ordered_ids=["r1"]),
        regions=[sample_region],
        meta=InferenceMeta(model_id="surya/reading-order", latency_ms=5.0),
    )
    restored = ReadingOrderOutput.model_validate(output.model_dump())
    assert restored.reading_order.ordered_ids == ["r1"]


def test_validate_reading_order_rejects_mismatched_ids(sample_bbox):
    regions = [
        Region(id="r1", label=LayoutLabel.paragraph, bbox=sample_bbox, confidence=0.9),
    ]
    with pytest.raises(ModelValidationError):
        validate_reading_order(regions, ["r2"])
