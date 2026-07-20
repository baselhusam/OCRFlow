from app.schemas.artifacts import TextLine
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.ocr import PaddleOcrInput, PaddleOcrOutput


def test_ocr_input_round_trip(sample_page_image):
    payload = PaddleOcrInput(page=sample_page_image).model_dump()
    restored = PaddleOcrInput.model_validate(payload)
    assert restored.languages == ["en"]
    assert restored.options.use_angle_cls is True


def test_ocr_output_round_trip(sample_bbox):
    line = TextLine(id="l1", bbox=sample_bbox, text="hello", confidence=0.9)
    output = PaddleOcrOutput(
        page_index=0,
        lines=[line],
        meta=InferenceMeta(model_id="paddle/ocr-v6-small", latency_ms=7.5),
    )
    restored = PaddleOcrOutput.model_validate(output.model_dump())
    assert restored.meta.model_id == "paddle/ocr-v6-small"
    assert restored.lines[0].text == "hello"
