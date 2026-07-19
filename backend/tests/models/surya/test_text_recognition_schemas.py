import pytest

from app.models.errors import ModelValidationError
from app.models.surya.text_recognition_validate import validate_recognized_lines
from app.schemas.artifacts import TextLine
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.text_recognition import (
    TextRecognitionInput,
    TextRecognitionOutput,
)


def test_text_recognition_input_round_trip(sample_page_image):
    payload = TextRecognitionInput(page=sample_page_image).model_dump()
    restored = TextRecognitionInput.model_validate(payload)
    assert restored.options.task_name == "ocr_with_boxes"


def test_validate_recognized_lines_requires_text_for_high_confidence(sample_bbox):
    lines = [TextLine(id="l1", bbox=sample_bbox, text="", confidence=0.9)]
    with pytest.raises(ModelValidationError):
        validate_recognized_lines(lines)


def test_text_recognition_output_round_trip(sample_bbox):
    output = TextRecognitionOutput(
        page_index=0,
        lines=[TextLine(id="l1", bbox=sample_bbox, text="Hello", confidence=0.9)],
        meta=InferenceMeta(model_id="surya/text-recognition", latency_ms=8.0),
    )
    restored = TextRecognitionOutput.model_validate(output.model_dump())
    assert restored.lines[0].text == "Hello"
