import pytest

from app.models.errors import ModelValidationError
from app.models.paddle._mappers import paddle_table_to_structure
from app.models.paddle.pp_structure import _split_pp_structure
from app.models.paddle.pp_structure_validate import validate_page_artifact
from app.schemas.artifacts import Region, TextLine


def test_split_pp_structure_extracts_regions_lines_tables():
    result = {
        "layout_det_res": {
            "boxes": [{"coordinate": [10, 10, 90, 90], "label": "table", "score": 0.95}]
        },
        "overall_ocr_res": {
            "rec_texts": ["hello"],
            "rec_scores": [0.9],
            "rec_polys": [[[10, 10], [90, 10], [90, 40], [10, 40]]],
        },
        "table_res_list": [{"pred_html": "<table><tr><td>a</td><td>b</td></tr></table>"}],
    }
    regions, lines, tables = _split_pp_structure(result, 100, 100)
    assert len(regions) == 1 and regions[0].label.value == "table"
    assert len(lines) == 1 and lines[0].text == "hello"
    assert len(tables) == 1 and tables[0].html.startswith("<table>")
    assert tables[0].rows == 1 and tables[0].cols == 2


def test_paddle_table_to_structure_counts_grid():
    html = "<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>"
    table = paddle_table_to_structure(html, [0.0, 0.0, 1.0, 1.0], "t1")
    assert table.rows == 2
    assert table.cols == 2


def test_validate_page_artifact_rejects_duplicate_ids(sample_bbox):
    regions = [
        Region(id="r1", label="table", bbox=sample_bbox, confidence=0.9),
        Region(id="r1", label="figure", bbox=sample_bbox, confidence=0.8),
    ]
    with pytest.raises(ModelValidationError):
        validate_page_artifact(regions, [], [])


def test_validate_page_artifact_accepts_unique_ids(sample_bbox):
    validate_page_artifact(
        [Region(id="r1", label="table", bbox=sample_bbox, confidence=0.9)],
        [TextLine(id="l1", bbox=sample_bbox, text="x", confidence=0.9)],
        [],
    )
