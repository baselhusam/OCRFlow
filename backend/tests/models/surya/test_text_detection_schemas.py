import pytest

from app.models.errors import ModelValidationError
from app.models.surya._mappers import offset_text_line
from app.models.surya.text_detection_validate import keep_valid_text_lines, validate_text_lines
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


def test_offset_text_line_uses_crop_dimensions():
    line = TextLine(id="l1", bbox=[0.0, 0.0, 1.0, 1.0])
    mapped = offset_text_line(
        line,
        offset_x=100,
        offset_y=50,
        page_width=200,
        page_height=200,
        source_width=50,
        source_height=20,
    )
    assert mapped.bbox == [0.5, 0.25, 0.75, 0.35]


def test_keep_valid_text_lines_drops_collapsed_boxes():
    lines = [
        TextLine(id="ok", bbox=[0.1, 0.1, 0.4, 0.2]),
        TextLine.model_construct(id="collapsed", bbox=[1.0, 0.2, 1.0, 0.3]),
    ]
    kept = keep_valid_text_lines(lines)
    assert [line.id for line in kept] == ["ok"]
