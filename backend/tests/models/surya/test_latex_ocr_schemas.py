import pytest

from app.models.errors import ModelValidationError
from app.models.surya.latex_ocr_validate import validate_formulas
from app.schemas.artifacts import Formula
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.latex_ocr import LatexOcrInput, LatexOcrOutput


def test_latex_ocr_input_round_trip(sample_page_image):
    payload = LatexOcrInput(page=sample_page_image).model_dump()
    restored = LatexOcrInput.model_validate(payload)
    assert restored.formulas == []


def test_validate_formulas_rejects_empty_latex(sample_bbox):
    formulas = [Formula(id="f1", bbox=sample_bbox, latex="   ")]
    with pytest.raises(ModelValidationError):
        validate_formulas(formulas)


def test_latex_ocr_output_round_trip(sample_bbox):
    output = LatexOcrOutput(
        page_index=0,
        formulas=[Formula(id="f1", bbox=sample_bbox, latex=r"x^2")],
        meta=InferenceMeta(model_id="surya/latex-ocr", latency_ms=4.0),
    )
    restored = LatexOcrOutput.model_validate(output.model_dump())
    assert restored.formulas[0].latex == r"x^2"
