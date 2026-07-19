from types import SimpleNamespace

from app.models.surya.layout_validate import layout_box_to_region, validate_layout_regions


def test_layout_box_filters_by_confidence_threshold():
    box = SimpleNamespace(
        label="Text",
        confidence=0.2,
        bbox=[10, 10, 90, 90],
        polygon=[[10, 10], [90, 10], [90, 90], [10, 90]],
        top_k={"Text": 0.2},
    )
    assert layout_box_to_region(box, "r1", 100, 100, confidence_threshold=0.5) is None


def test_validate_layout_regions_accepts_unique_ids():
    box = SimpleNamespace(
        label="Text",
        confidence=0.9,
        bbox=[10, 10, 90, 90],
        polygon=[[10, 10], [90, 10], [90, 90], [10, 90]],
        top_k={"Text": 0.9},
    )
    region = layout_box_to_region(box, "r1", 100, 100)
    assert region is not None
    validate_layout_regions([region])
