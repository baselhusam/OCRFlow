from app.schemas.artifacts import Region, TableStructure, TextLine
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.pp_structure import PpStructureInput, PpStructureOutput


def test_pp_structure_input_round_trip(sample_page_image):
    payload = PpStructureInput(page=sample_page_image).model_dump()
    restored = PpStructureInput.model_validate(payload)
    assert restored.options.do_ocr is True


def test_pp_structure_output_round_trip(sample_bbox):
    output = PpStructureOutput(
        page_index=0,
        regions=[Region(id="r1", label="table", bbox=sample_bbox, confidence=0.9)],
        lines=[TextLine(id="l1", bbox=sample_bbox, text="cell", confidence=0.9)],
        tables=[
            TableStructure(id="t1", bbox=sample_bbox, rows=2, cols=2, html="<table></table>")
        ],
        meta=InferenceMeta(model_id="paddle/pp-structure", latency_ms=42.0),
    )
    restored = PpStructureOutput.model_validate(output.model_dump())
    assert restored.meta.model_id == "paddle/pp-structure"
    assert restored.tables[0].html == "<table></table>"
