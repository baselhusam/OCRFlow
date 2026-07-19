"""Map Surya prediction objects to OCRFlow wire types."""

from __future__ import annotations

from typing import Any

from app.models._image_utils import (
    denormalize_bbox_to_pixels,
    normalize_bbox_from_pixels,
    normalize_polygon_from_pixels,
)
from app.models.surya._common import surya_bbox_to_normalized, surya_polygon_to_normalized
from app.schemas.artifacts import TableCell, TableStructure, TextLine


def image_bbox_dimensions(image_bbox: list[float], fallback_width: int, fallback_height: int) -> tuple[int, int]:
    if len(image_bbox) == 4:
        width = int(image_bbox[2] - image_bbox[0])
        height = int(image_bbox[3] - image_bbox[1])
        if width > 0 and height > 0:
            return width, height
    return fallback_width, fallback_height


def polygon_box_to_text_line(
    box: Any,
    line_id: str,
    width: int,
    height: int,
    *,
    include_text: bool = False,
) -> TextLine:
    bbox = surya_bbox_to_normalized(box.bbox, width, height)
    polygon = surya_polygon_to_normalized(box.polygon, width, height)
    confidence = float(box.confidence) if getattr(box, "confidence", None) is not None else None
    text = getattr(box, "text", None) if include_text else None
    return TextLine(
        id=line_id,
        bbox=bbox,
        polygon=polygon,
        text=text,
        confidence=confidence,
    )


def ocr_line_to_text_line(line: Any, line_id: str, width: int, height: int) -> TextLine:
    return TextLine(
        id=line_id,
        bbox=surya_bbox_to_normalized(line.bbox, width, height),
        polygon=surya_polygon_to_normalized(line.polygon, width, height),
        text=line.text,
        confidence=float(line.confidence) if line.confidence is not None else None,
    )


def table_result_to_structure(table_result: Any, table_id: str, width: int, height: int) -> TableStructure:
    cells: list[TableCell] = []
    for cell in table_result.cells:
        cells.append(
            TableCell(
                row=int(cell.row_id),
                col=int(cell.col_id or 0),
                bbox=surya_bbox_to_normalized(cell.bbox, width, height),
                text=None,
                is_header=bool(cell.is_header),
                row_span=int(cell.rowspan or 1),
                col_span=int(cell.colspan or 1),
            )
        )

    if cells:
        xs = [cell.bbox[0] for cell in cells] + [cell.bbox[2] for cell in cells]
        ys = [cell.bbox[1] for cell in cells] + [cell.bbox[3] for cell in cells]
        table_bbox = [min(xs), min(ys), max(xs), max(ys)]
    else:
        table_bbox = [0.0, 0.0, 1.0, 1.0]

    row_count = len(table_result.rows)
    col_count = len(table_result.cols)
    return TableStructure(
        id=table_id,
        bbox=table_bbox,
        rows=row_count,
        cols=col_count,
        cells=cells,
    )


def offset_text_line(line: TextLine, offset_x: int, offset_y: int, page_width: int, page_height: int) -> TextLine:
    px_bbox = denormalize_bbox_to_pixels(line.bbox, page_width, page_height)
    left = px_bbox[0] + offset_x
    top = px_bbox[1] + offset_y
    right = px_bbox[2] + offset_x
    bottom = px_bbox[3] + offset_y
    bbox = normalize_bbox_from_pixels(left, top, right, bottom, page_width, page_height)
    polygon = None
    if line.polygon:
        polygon = [
            [
                max(0.0, min(1.0, (point[0] * page_width + offset_x) / page_width)),
                max(0.0, min(1.0, (point[1] * page_height + offset_y) / page_height)),
            ]
            for point in line.polygon
        ]
    return line.model_copy(update={"bbox": bbox, "polygon": polygon})
