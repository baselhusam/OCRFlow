from app.services.pipeline_execution.schemas import NodeCachedOutput
from app.services.pipeline_execution.upstream import extract_page_image


def _loader_output(preview_page: dict) -> NodeCachedOutput:
    return NodeCachedOutput(
        kind="pages",
        raw={
            "pages": [
                {
                    "page_index": 0,
                    "page": {
                        "page_index": 0,
                        "width": 10,
                        "height": 20,
                        "image_base64": "AAAA",
                    },
                }
            ]
        },
        preview={"pageCount": 1, "pageImage": preview_page},
    )


def test_stripped_preview_falls_back_to_raw_page():
    # The canvas strips pixels from persisted previews; a project run must
    # still find the real page image in `raw`.
    output = _loader_output({"page_index": 0, "width": 10, "height": 20})
    page = extract_page_image(output)
    assert page is not None
    assert page["image_base64"] == "AAAA"


def test_preview_with_pixels_is_used():
    output = _loader_output(
        {"page_index": 0, "width": 10, "height": 20, "image_base64": "BBBB"}
    )
    page = extract_page_image(output)
    assert page is not None
    assert page["image_base64"] == "BBBB"


def test_preview_only_output_still_returns_page():
    output = NodeCachedOutput(
        kind="regions",
        raw={"regions": []},
        preview={"pageImage": {"page_index": 0, "width": 1, "height": 1}},
    )
    assert extract_page_image(output) == {"page_index": 0, "width": 1, "height": 1}
