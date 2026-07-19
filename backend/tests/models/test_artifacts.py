import pytest
from pydantic import ValidationError

from app.schemas.artifacts import (
    DocumentArtifact,
    PageArtifact,
    PageImage,
    Region,
    LayoutLabel,
    ReadingOrder,
    TextLine,
    validate_bbox,
    validate_polygon,
)


def test_bbox_validation_accepts_valid_box():
    assert validate_bbox([0.0, 0.0, 1.0, 1.0]) == [0.0, 0.0, 1.0, 1.0]


def test_bbox_validation_rejects_inverted_x():
    with pytest.raises(ValueError, match="x1 must be greater than x0"):
        validate_bbox([0.5, 0.0, 0.4, 1.0])


def test_bbox_validation_rejects_out_of_range():
    with pytest.raises(ValueError, match="x0 must be in"):
        validate_bbox([-0.1, 0.0, 1.0, 1.0])


def test_polygon_validation_requires_three_points():
    with pytest.raises(ValueError, match="at least 3 points"):
        validate_polygon([[0.0, 0.0], [1.0, 0.0]])


def test_page_image_requires_exactly_one_source(sample_page_image: PageImage):
    assert sample_page_image.image_base64 is not None

    with pytest.raises(ValidationError):
        PageImage(page_index=0, width=100, height=100)

    with pytest.raises(ValidationError):
        PageImage(
            page_index=0,
            width=100,
            height=100,
            image_base64="abc",
            image_url="http://example.com/a.png",
        )


def test_region_json_round_trip(sample_region: Region):
    payload = sample_region.model_dump()
    restored = Region.model_validate(payload)
    assert restored == sample_region
    assert restored.label == LayoutLabel.paragraph


def test_page_artifact_round_trip(sample_page_image: PageImage, sample_region: Region):
    artifact = PageArtifact(
        page_index=0,
        page=sample_page_image,
        regions=[sample_region],
        reading_order=ReadingOrder(ordered_ids=["r1"]),
    )
    document = DocumentArtifact(pages=[artifact], metadata={"source": "test"})
    restored = DocumentArtifact.model_validate(document.model_dump())
    assert restored.pages[0].regions[0].id == "r1"


def test_text_line_optional_polygon(sample_bbox: list[float]):
    line = TextLine(id="l1", bbox=sample_bbox, polygon=[[0.1, 0.2], [0.5, 0.2], [0.5, 0.8]])
    assert line.polygon is not None

    with pytest.raises(ValueError, match="at least 3 points"):
        TextLine(id="l1", bbox=sample_bbox, polygon=[[0.0, 0.0], [1.0, 1.0]])
