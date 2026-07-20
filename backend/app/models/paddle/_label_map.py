"""PP-DocLayout / PP-Structure label mapping to OCRFlow LayoutLabel."""

from __future__ import annotations

from app.schemas.artifacts import LayoutLabel

# PP-DocLayout / PP-StructureV3 layout labels (lowercased, spaces/hyphens normalized).
PADDLE_TO_LAYOUT_LABEL: dict[str, LayoutLabel] = {
    "text": LayoutLabel.paragraph,
    "paragraph": LayoutLabel.paragraph,
    "paragraph_title": LayoutLabel.section_header,
    "abstract": LayoutLabel.paragraph,
    "content": LayoutLabel.paragraph,
    "title": LayoutLabel.title,
    "doc_title": LayoutLabel.title,
    "section_header": LayoutLabel.section_header,
    "header": LayoutLabel.page_header,
    "page_header": LayoutLabel.page_header,
    "footer": LayoutLabel.page_footer,
    "page_footer": LayoutLabel.page_footer,
    "footnote": LayoutLabel.paragraph,
    "table": LayoutLabel.table,
    "table_title": LayoutLabel.caption,
    "figure": LayoutLabel.figure,
    "image": LayoutLabel.figure,
    "figure_title": LayoutLabel.caption,
    "chart": LayoutLabel.figure,
    "chart_title": LayoutLabel.caption,
    "caption": LayoutLabel.caption,
    "list": LayoutLabel.list,
    "list_item": LayoutLabel.list_item,
    "formula": LayoutLabel.formula,
    "formula_number": LayoutLabel.formula,
    "algorithm": LayoutLabel.code,
    "code": LayoutLabel.code,
    "reference": LayoutLabel.paragraph,
    "seal": LayoutLabel.other,
    "header_image": LayoutLabel.figure,
    "footer_image": LayoutLabel.figure,
    "aside_text": LayoutLabel.paragraph,
    "number": LayoutLabel.other,
}


def map_paddle_label(label: str) -> LayoutLabel:
    key = label.strip().lower().replace(" ", "_").replace("-", "_")
    return PADDLE_TO_LAYOUT_LABEL.get(key, LayoutLabel.other)
