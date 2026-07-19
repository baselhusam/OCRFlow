"""Surya label mapping to OCRFlow LayoutLabel."""

from __future__ import annotations

from app.schemas.artifacts import LayoutLabel

SURYA_TO_LAYOUT_LABEL: dict[str, LayoutLabel] = {
    "text": LayoutLabel.paragraph,
    "text-inline-math": LayoutLabel.paragraph,
    "handwriting": LayoutLabel.paragraph,
    "section-header": LayoutLabel.section_header,
    "page-header": LayoutLabel.page_header,
    "page-footer": LayoutLabel.page_footer,
    "table": LayoutLabel.table,
    "table-of-contents": LayoutLabel.table,
    "picture": LayoutLabel.figure,
    "figure": LayoutLabel.figure,
    "caption": LayoutLabel.caption,
    "list-item": LayoutLabel.list_item,
    "formula": LayoutLabel.formula,
    "footnote": LayoutLabel.paragraph,
    "form": LayoutLabel.other,
}


def map_surya_label(label: str) -> LayoutLabel:
    key = label.strip().lower()
    return SURYA_TO_LAYOUT_LABEL.get(key, LayoutLabel.other)
