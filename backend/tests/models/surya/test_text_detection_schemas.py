import pytest

from app.models.errors import ModelValidationError
from app.models.surya.text_detection_validate import validate_text_lines
from app.schemas.artifacts import TextLine
from app.schemas.models.surya.text_detection import TextDetectionInput, TextDetectionOutput
from app.schemas.models.surya._meta import InferenceMeta


def test_text_detection_input_round_trip(sample_page_image):
    payload = TextDetectionInput(page=sample_page_image).model_dump()
    restored = TextDetectionInput.model_validate(payload)
    assert restored.page.page_index == 0


def test_validate_text_lines_rejects_text(sample_bbox):
    lines = [TextLine(id="l1", bbox=sample_bbox, text="hello")]
    with pytest.raises(ModelValidationError):
        validate_text_lines(lines)


def test_text_detection_output_round_trip(sample_bbox):
    output = TextDetectionOutput(
        page_index=0,
        lines=[TextLine(id="l1", bbox=sample_bbox)],
        meta=InferenceMeta(model_id="surya/text-detection", latency_ms=3.0),
    )
    restored = TextDetectionOutput.model_validate(output.model_dump())
    assert restored.lines[0].id == "l1"
