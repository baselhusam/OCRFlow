"""Validation for Surya LaTeX OCR."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import Formula, validate_bbox


def validate_formulas(formulas: list[Formula]) -> list[Formula]:
    seen_ids: set[str] = set()
    for formula in formulas:
        if formula.id in seen_ids:
            raise ModelValidationError(f"Duplicate formula id: {formula.id}")
        seen_ids.add(formula.id)
        validate_bbox(formula.bbox)
        if not formula.latex.strip():
            raise ModelValidationError(f"formula {formula.id} has empty latex")
    return formulas
