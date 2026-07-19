"""Tests for pipeline graph snapshot parsing."""

from app.services.graph_analytics import parse_graph_snapshot


def test_parse_graph_snapshot_empty() -> None:
    snapshot = parse_graph_snapshot({})
    assert snapshot.nodes == []
    assert snapshot.edge_count == 0
    assert snapshot.model_ids == set()
    assert snapshot.asset_ids == set()


def test_parse_graph_snapshot_with_nodes_and_edges() -> None:
    graph = {
        "nodes": [
            {
                "id": "n1",
                "modelId": "loader/pdf",
                "config": {"assetId": "asset-1"},
                "runtime": {
                    "runStatus": "success",
                    "lastRunAt": "2026-06-19T10:00:00Z",
                },
            },
            {
                "id": "n2",
                "modelId": "docling/layout-heron",
            },
        ],
        "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
    }

    snapshot = parse_graph_snapshot(graph)
    assert len(snapshot.nodes) == 2
    assert snapshot.edge_count == 1
    assert snapshot.model_ids == {"loader/pdf", "docling/layout-heron"}
    assert snapshot.asset_ids == {"asset-1"}
    assert snapshot.nodes[0].run_status == "success"
    assert snapshot.nodes[0].last_run_at == "2026-06-19T10:00:00Z"
