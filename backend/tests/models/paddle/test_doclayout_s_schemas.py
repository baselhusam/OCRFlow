from app.schemas.artifacts import LayoutLabel
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput


def test_doclayout_input_round_trip(sample_page_image):
    payload = DocLayoutInput(page=sample_page_image).model_dump()
    restored = DocLayoutInput.model_validate(payload)
    assert restored.page.page_index == 0
    assert restored.options.confidence_threshold == 0.5


def test_doclayout_output_round_trip(sample_region):
    output = DocLayoutOutput(
        page_index=0,
        regions=[sample_region],
        meta=InferenceMeta(model_id="paddle/doclayout-s", latency_ms=9.0),
    )
    restored = DocLayoutOutput.model_validate(output.model_dump())
    assert restored.meta.model_id == "paddle/doclayout-s"
    assert restored.regions[0].label == LayoutLabel.paragraph
