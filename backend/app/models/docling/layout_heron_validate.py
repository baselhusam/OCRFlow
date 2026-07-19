"""Post-inference validation and label mapping for layout detection."""

from __future__ import annotations

from docling.datamodel.base_models import Cluster
from docling_core.types.doc import DocItemLabel

from app.models.errors import ModelValidationError
from app.schemas.artifacts import LayoutLabel, Region, validate_bbox


DOCLING_TO_LAYOUT_LABEL: dict[str, LayoutLabel] = {
    DocItemLabel.TEXT.value: LayoutLabel.paragraph,
    DocItemLabel.TABLE.value: LayoutLabel.table,
    DocItemLabel.PICTURE.value: LayoutLabel.figure,
    DocItemLabel.SECTION_HEADER.value: LayoutLabel.section_header,
    DocItemLabel.PAGE_HEADER.value: LayoutLabel.page_header,
    DocItemLabel.PAGE_FOOTER.value: LayoutLabel.page_footer,
    DocItemLabel.CAPTION.value: LayoutLabel.caption,
    DocItemLabel.LIST_ITEM.value: LayoutLabel.list_item,
    DocItemLabel.FORMULA.value: LayoutLabel.formula,
    DocItemLabel.CODE.value: LayoutLabel.code,
    DocItemLabel.TITLE.value: LayoutLabel.title,
    DocItemLabel.FOOTNOTE.value: LayoutLabel.paragraph,
    DocItemLabel.FORM.value: LayoutLabel.other,
    DocItemLabel.KEY_VALUE_REGION.value: LayoutLabel.other,
    DocItemLabel.DOCUMENT_INDEX.value: LayoutLabel.table,
    DocItemLabel.CHECKBOX_SELECTED.value: LayoutLabel.other,
    DocItemLabel.CHECKBOX_UNSELECTED.value: LayoutLabel.other,
}


def map_docling_label(label: DocItemLabel | str) -> LayoutLabel:
    key = label.value if isinstance(label, DocItemLabel) else str(label).lower()
    key = key.replace(" ", "_").replace("-", "_")
    return DOCLING_TO_LAYOUT_LABEL.get(key, LayoutLabel.other)


def cluster_to_region(
    cluster: Cluster,
    region_id: str,
    width: int,
    height: int,
) -> Region:
    docling_label = (
        cluster.label.value if isinstance(cluster.label, DocItemLabel) else str(cluster.label)
    )
    bbox = [
        cluster.bbox.l / width,
        cluster.bbox.t / height,
        cluster.bbox.r / width,
        cluster.bbox.b / height,
    ]
    validate_bbox(bbox)
    return Region(
        id=region_id,
        label=map_docling_label(cluster.label),
        bbox=bbox,
        confidence=float(cluster.confidence),
        docling_label=docling_label.upper(),
    )


def validate_layout_regions(regions: list[Region]) -> list[Region]:
    seen_ids: set[str] = set()
    for region in regions:
        if region.id in seen_ids:
            raise ModelValidationError(f"Duplicate region id: {region.id}")
        seen_ids.add(region.id)
        validate_bbox(region.bbox)
    return regions
