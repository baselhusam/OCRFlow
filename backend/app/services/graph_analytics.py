"""Parse pipeline graph JSON for analytics snapshots."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class GraphNodeSnapshot:
    node_id: str
    model_id: str
    run_status: str | None = None
    last_run_at: str | None = None
    asset_id: str | None = None


@dataclass
class GraphSnapshot:
    nodes: list[GraphNodeSnapshot] = field(default_factory=list)
    edge_count: int = 0
    model_ids: set[str] = field(default_factory=set)
    asset_ids: set[str] = field(default_factory=set)


def parse_graph_snapshot(graph: dict[str, Any] | None) -> GraphSnapshot:
    snapshot = GraphSnapshot()
    if not graph:
        return snapshot

    edges = graph.get("edges")
    if isinstance(edges, list):
        snapshot.edge_count = len(edges)

    nodes = graph.get("nodes")
    if not isinstance(nodes, list):
        return snapshot

    for raw_node in nodes:
        if not isinstance(raw_node, dict):
            continue
        node_id = raw_node.get("id")
        model_id = raw_node.get("modelId")
        if not isinstance(node_id, str) or not isinstance(model_id, str):
            continue

        runtime = raw_node.get("runtime") if isinstance(raw_node.get("runtime"), dict) else {}
        config = raw_node.get("config") if isinstance(raw_node.get("config"), dict) else {}
        asset_id = config.get("assetId")
        asset_id_str = asset_id if isinstance(asset_id, str) and asset_id else None

        snapshot.nodes.append(
            GraphNodeSnapshot(
                node_id=node_id,
                model_id=model_id,
                run_status=runtime.get("runStatus") if isinstance(runtime.get("runStatus"), str) else None,
                last_run_at=runtime.get("lastRunAt") if isinstance(runtime.get("lastRunAt"), str) else None,
                asset_id=asset_id_str,
            )
        )
        snapshot.model_ids.add(model_id)
        if asset_id_str:
            snapshot.asset_ids.add(asset_id_str)

    return snapshot
