"""Unit tests for batch graph asset injection."""

from __future__ import annotations

from app.services.batch_graph import count_file_loaders, graph_with_asset


def test_graph_with_asset_rewrites_loaders():
    graph = {
        "nodes": [
            {
                "id": "n1",
                "modelId": "loader/pdf",
                "config": {"assetId": "old"},
            },
            {
                "id": "n2",
                "modelId": "surya/layout",
                "config": {},
            },
        ],
        "edges": [],
    }
    out = graph_with_asset(
        graph,
        asset_id="new-asset",
        filename="doc.pdf",
        doc_format="pdf",
    )
    assert out["nodes"][0]["config"]["assetId"] == "new-asset"
    assert out["nodes"][0]["config"]["assetFilename"] == "doc.pdf"
    assert out["nodes"][0]["config"]["format"] == "pdf"
    assert out["nodes"][1]["config"] == {}
    # original unchanged
    assert graph["nodes"][0]["config"]["assetId"] == "old"


def test_count_file_loaders():
    assert count_file_loaders(None) == 0
    assert (
        count_file_loaders(
            {
                "nodes": [
                    {"modelId": "loader/image"},
                    {"modelId": "loader/pdf"},
                    {"modelId": "surya/layout"},
                ]
            }
        )
        == 2
    )
