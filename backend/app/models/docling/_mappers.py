"""Map Docling native types to OCRFlow wire artifacts."""

from __future__ import annotations

from docling.datamodel.base_models import Cluster, Table
from docling_core.types.doc import BoundingBox, CoordOrigin
from docling_core.types.doc.page import TextCell

from app.schemas.artifacts import TableCell, TableStructure, TextLine, validate_bbox


def text_cell_to_line(cell: TextCell, line_id: str, width: int, height: int) -> TextLine:
    bbox = cell.rect.to_bounding_box()
    if bbox.coord_origin != CoordOrigin.TOPLEFT:
        bbox = bbox.to_top_left_origin(height)
    normalized = [
        bbox.l / width,
        bbox.t / height,
        bbox.r / width,
        bbox.b / height,
    ]
    validate_bbox(normalized)
    return TextLine(
        id=line_id,
        bbox=normalized,
        text=cell.text,
        confidence=float(cell.confidence) if cell.confidence is not None else None,
    )


def cluster_bbox_to_normalized(cluster: Cluster, width: int, height: int) -> list[float]:
    bbox = cluster.bbox
    if bbox.coord_origin != CoordOrigin.TOPLEFT:
        bbox = bbox.to_top_left_origin(height)
    normalized = [bbox.l / width, bbox.t / height, bbox.r / width, bbox.b / height]
    validate_bbox(normalized)
    return normalized


def table_to_structure(table: Table, table_id: str, width: int, height: int) -> TableStructure:
    cells: list[TableCell] = []
    max_row = 0
    max_col = 0
    for tc in table.table_cells:
        row = tc.start_row_offset_idx
        col = tc.start_col_offset_idx
        max_row = max(max_row, row)
        max_col = max(max_col, col)
        cell_bbox = [0.0, 0.0, 1.0, 1.0]
        if tc.bbox is not None:
            bb = tc.bbox
            if bb.coord_origin != CoordOrigin.TOPLEFT:
                bb = bb.to_top_left_origin(height)
            cell_bbox = [bb.l / width, bb.t / height, bb.r / width, bb.b / height]
        cells.append(
            TableCell(
                row=row,
                col=col,
                bbox=cell_bbox,
                text=tc.text,
                is_header=bool(tc.column_header),
            )
        )
    table_bbox = cluster_bbox_to_normalized(table.cluster, width, height)
    return TableStructure(
        id=table_id,
        bbox=table_bbox,
        rows=max_row + 1,
        cols=max_col + 1,
        cells=cells,
        html=getattr(table, "html", None),
        otsl=getattr(table, "otsl", None),
    )


def bbox_input_to_cluster(bbox: list[float], width: int, height: int, cluster_id: int):
    from docling.datamodel.base_models import Cluster
    from docling_core.types.doc import DocItemLabel

    l, t, r, b = bbox
    pixel_bbox = BoundingBox(
        l=l * width,
        t=t * height,
        r=r * width,
        b=b * height,
        coord_origin=CoordOrigin.TOPLEFT,
    )
    return Cluster(
        id=cluster_id,
        label=DocItemLabel.TABLE,
        confidence=1.0,
        bbox=pixel_bbox,
        cells=[],
    )
