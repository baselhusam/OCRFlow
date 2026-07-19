"""Validation for Surya table recognition."""

from __future__ import annotations

from app.models.errors import ModelValidationError
from app.schemas.artifacts import TableStructure, validate_bbox


def _normalize_row_col_indices(tables: list[TableStructure]) -> list[TableStructure]:
    normalized: list[TableStructure] = []
    for table in tables:
        if not table.cells:
            normalized.append(table)
            continue

        row_ids = sorted({cell.row for cell in table.cells})
        col_ids = sorted({cell.col for cell in table.cells})
        row_map = {row_id: index for index, row_id in enumerate(row_ids)}
        col_map = {col_id: index for index, col_id in enumerate(col_ids)}
        cells = [
            cell.model_copy(
                update={
                    "row": row_map[cell.row],
                    "col": col_map[cell.col],
                }
            )
            for cell in table.cells
        ]
        normalized.append(
            table.model_copy(
                update={
                    "cells": cells,
                    "rows": len(row_ids),
                    "cols": len(col_ids),
                }
            )
        )
    return normalized


def validate_table_structures(tables: list[TableStructure]) -> list[TableStructure]:
    seen_ids: set[str] = set()
    for table in tables:
        if table.id in seen_ids:
            raise ModelValidationError(f"Duplicate table id: {table.id}")
        seen_ids.add(table.id)
        validate_bbox(table.bbox)
        for cell in table.cells:
            validate_bbox(cell.bbox)
    return _normalize_row_col_indices(tables)
