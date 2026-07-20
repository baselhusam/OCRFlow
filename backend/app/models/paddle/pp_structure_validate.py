"""Post-inference validation for PaddleOCR PP-StructureV3 page artifacts."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import Region, TableStructure, TextLine, validate_bbox


def validate_page_artifact(
    regions: list[Region],
    lines: list[TextLine],
    tables: list[TableStructure],
) -> None:
    """Ensure ids are unique within each list and every bbox is normalized."""
    for label, items in (("region", regions), ("line", lines), ("table", tables)):
        seen_ids: set[str] = set()
        for item in items:
            if item.id in seen_ids:
                raise ModelValidationError(f"Duplicate {label} id: {item.id}")
            seen_ids.add(item.id)
            validate_bbox(item.bbox)
