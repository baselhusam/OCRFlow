import pytest

from app.models.errors import ModelValidationError
from app.models.paddle._mappers import iter_ocr_items, paddle_ocr_to_text_line
from app.models.paddle.ocr_validate import validate_recognized_lines
from app.schemas.artifacts import TextLine


def test_iter_ocr_items_reads_v3_predict_payload():
    result = {
        "rec_texts": ["hello", "world"],
        "rec_scores": [0.98, 0.91],
        "rec_polys": [
            [[10, 10], [90, 10], [90, 40], [10, 40]],
            [[10, 50], [90, 50], [90, 80], [10, 80]],
        ],
    }
    items = iter_ocr_items(result)
    assert len(items) == 2
    poly, text, score = items[0]
    assert text == "hello"
    assert score == 0.98


def test_iter_ocr_items_reads_legacy_2x_format():
    poly = [[10, 10], [90, 10], [90, 40], [10, 40]]
    entry = [poly, ("hi", 0.87)]
    page = [entry]
    result = [page]  # legacy 2.x: result[0] is the list of [poly, (text, score)] entries
    items = iter_ocr_items(result)
    assert len(items) == 1
    assert items[0][1] == "hi"
    assert items[0][2] == 0.87


def test_paddle_ocr_to_text_line_normalizes():
    poly = [[10, 20], [90, 20], [90, 80], [10, 80]]
    line = paddle_ocr_to_text_line(poly, "hi", 0.9, "l1", 100, 100)
    assert line.bbox == [0.1, 0.2, 0.9, 0.8]
    assert line.polygon is not None and len(line.polygon) == 4
    assert line.confidence == 0.9


def test_validate_recognized_lines_rejects_empty_text_high_confidence(sample_bbox):
    lines = [TextLine(id="l1", bbox=sample_bbox, text="", confidence=0.99)]
    with pytest.raises(ModelValidationError):
        validate_recognized_lines(lines, confidence_threshold=0.5)


def test_validate_recognized_lines_rejects_duplicate_ids(sample_bbox):
    lines = [
        TextLine(id="l1", bbox=sample_bbox, text="a", confidence=0.9),
        TextLine(id="l1", bbox=sample_bbox, text="b", confidence=0.9),
    ]
    with pytest.raises(ModelValidationError):
        validate_recognized_lines(lines)
