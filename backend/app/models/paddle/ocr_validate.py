"""Post-inference validation for PaddleOCR text recognition."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import TextLine, validate_bbox


def validate_recognized_lines(
    lines: list[TextLine],
    *,
    confidence_threshold: float = 0.5,
) -> list[TextLine]:
    seen_ids: set[str] = set()
    for line in lines:
        if line.id in seen_ids:
            raise ModelValidationError(f"Duplicate text line id: {line.id}")
        seen_ids.add(line.id)
        validate_bbox(line.bbox)
        if line.confidence is not None and line.confidence > confidence_threshold:
            if not (line.text and line.text.strip()):
                raise ModelValidationError(
                    f"line {line.id} has confidence {line.confidence} but empty text"
                )
    return lines
