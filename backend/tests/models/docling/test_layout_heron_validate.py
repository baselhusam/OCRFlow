from docling.datamodel.base_models import Cluster
from docling_core.types.doc import BoundingBox, CoordOrigin, DocItemLabel

from app.models.docling.layout_heron_validate import cluster_to_region, validate_layout_regions


def test_cluster_to_region_normalized_bbox():
    cluster = Cluster(
        id=0,
        label=DocItemLabel.TEXT,
        confidence=0.95,
        bbox=BoundingBox(l=100, t=200, r=500, b=400, coord_origin=CoordOrigin.TOPLEFT),
        cells=[],
    )
    region = cluster_to_region(cluster, "r1", width=1000, height=1000)
    assert region.id == "r1"
    assert region.docling_label == "TEXT"
    assert region.bbox == [0.1, 0.2, 0.5, 0.4]
    validate_layout_regions([region])
