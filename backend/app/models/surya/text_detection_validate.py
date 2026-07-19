"""Validation for Surya text detection."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import TextLine, validate_bbox, validate_polygon


def validate_text_lines(lines: list[TextLine]) -> list[TextLine]:
    seen_ids: set[str] = set()
    for line in lines:
        if line.id in seen_ids:
            raise ModelValidationError(f"Duplicate text line id: {line.id}")
        seen_ids.add(line.id)
        validate_bbox(line.bbox)
        if line.polygon is not None:
            validate_polygon(line.polygon)
        if line.text is not None:
            raise ModelValidationError("text detection lines must not include text")
    return lines
