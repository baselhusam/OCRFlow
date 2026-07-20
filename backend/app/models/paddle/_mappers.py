"""Map PaddleOCR prediction objects to OCRFlow wire types.

PaddleOCR (3.x) prediction results behave like dicts. These helpers stay defensive
(``getattr``/``.get`` with fallbacks) so minor version differences in the result shape
degrade gracefully rather than crash — the heavy paddle calls only run under the
GPU-marked smoke tests.
"""

from __future__ import annotations

from typing import Any

from app.models._image_utils import (
    normalize_bbox_from_pixels,
    normalize_polygon_from_pixels,
)
from app.models.paddle._label_map import map_paddle_label
from app.schemas.artifacts import Region, TableStructure, TextLine


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def as_result_dict(result: Any) -> dict[str, Any]:
    """Coerce a PaddleOCR result object into a plain dict.

    3.x result objects expose their payload via a ``json`` attribute or behave like a
    mapping; fall back to ``__dict__`` for anything else.
    """
    if isinstance(result, dict):
        return result
    payload = getattr(result, "json", None)
    if isinstance(payload, dict):
        # Some result types nest the useful payload under a "res" key.
        return payload.get("res", payload)
    res = getattr(result, "res", None)
    if isinstance(res, dict):
        return res
    return getattr(result, "__dict__", {}) or {}


def poly_to_points(poly: Any) -> list[list[float]]:
    """Normalize a quad/polygon (list or ndarray of points) to ``[[x, y], ...]`` floats."""
    return [[float(point[0]), float(point[1])] for point in poly]


def paddle_layout_box_to_region(
    coordinate: Any,
    label: Any,
    score: Any,
    region_id: str,
    width: int,
    height: int,
    *,
    confidence_threshold: float = 0.0,
) -> Region | None:
    """Convert a PP-DocLayout box ``[x0, y0, x1, y1]`` (pixels) to a normalized Region."""
    confidence = _clamp01(float(score)) if score is not None else 1.0
    if confidence < confidence_threshold:
        return None

    left, top, right, bottom = (float(v) for v in coordinate)
    bbox = normalize_bbox_from_pixels(left, top, right, bottom, width, height)
    raw_label = str(label)
    return Region(
        id=region_id,
        label=map_paddle_label(raw_label),
        bbox=bbox,
        confidence=confidence,
        provider_label=raw_label,
    )


def paddle_ocr_to_text_line(
    poly: Any,
    text: Any,
    score: Any,
    line_id: str,
    width: int,
    height: int,
) -> TextLine:
    """Convert a PP-OCR detection quad + recognized text/score to a normalized TextLine."""
    points = poly_to_points(poly)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    bbox = normalize_bbox_from_pixels(min(xs), min(ys), max(xs), max(ys), width, height)
    polygon = normalize_polygon_from_pixels(points, width, height)
    confidence = _clamp01(float(score)) if score is not None else None
    return TextLine(
        id=line_id,
        bbox=bbox,
        polygon=polygon if len(polygon) >= 3 else None,
        text=str(text) if text is not None else None,
        confidence=confidence,
    )


def _count_html_grid(html: str) -> tuple[int, int]:
    """Best-effort (rows, cols) count from a table HTML string."""
    if not html:
        return 0, 0
    lowered = html.lower()
    rows = lowered.count("<tr")
    first_row = lowered.split("</tr>", 1)[0]
    cols = first_row.count("<td") + first_row.count("<th")
    return rows, cols


def paddle_table_to_structure(
    html: str | None,
    bbox: list[float],
    table_id: str,
) -> TableStructure:
    """Build a TableStructure from PP-Structure HTML output (cells parsed lazily elsewhere)."""
    rows, cols = _count_html_grid(html or "")
    return TableStructure(
        id=table_id,
        bbox=bbox,
        rows=rows,
        cols=cols,
        cells=[],
        html=html or None,
    )


def iter_ocr_items(result: Any) -> list[tuple[Any, Any, Any]]:
    """Yield ``(polygon, text, score)`` triples from a PP-OCR predict result.

    Handles the 3.x ``predict`` payload (``rec_texts`` / ``rec_scores`` /
    ``rec_polys`` | ``dt_polys``) and the legacy 2.x ``ocr`` nested-list format.
    """
    data = as_result_dict(result)
    texts = data.get("rec_texts")
    if texts is not None:
        scores = data.get("rec_scores") or [None] * len(texts)
        polys = data.get("rec_polys")
        if polys is None:
            polys = data.get("dt_polys") or []
        items: list[tuple[Any, Any, Any]] = []
        for index, text in enumerate(texts):
            poly = polys[index] if index < len(polys) else [[0, 0], [1, 0], [1, 1], [0, 1]]
            score = scores[index] if index < len(scores) else None
            items.append((poly, text, score))
        return items

    # Legacy 2.x: result is [[ [poly, (text, score)], ... ]]
    items = []
    rows = result[0] if isinstance(result, (list, tuple)) and result else []
    for entry in rows or []:
        poly, rec = entry[0], entry[1]
        text, score = rec if isinstance(rec, (list, tuple)) else (rec, None)
        items.append((poly, text, score))
    return items


def iter_layout_boxes(result: Any) -> list[dict[str, Any]]:
    """Yield layout boxes ``{coordinate, label, score}`` from a PP-DocLayout result."""
    data = as_result_dict(result)
    boxes = data.get("boxes") or []
    normalized: list[dict[str, Any]] = []
    for box in boxes:
        box_dict = box if isinstance(box, dict) else getattr(box, "__dict__", {})
        normalized.append(
            {
                "coordinate": box_dict.get("coordinate"),
                "label": box_dict.get("label", box_dict.get("cls_id")),
                "score": box_dict.get("score"),
            }
        )
    return normalized
