"""Helpers for injecting uploaded assets into a project graph for batch runs."""

from __future__ import annotations

import copy
from typing import Any

from app.services.pipeline_wire_kinds import FILE_LOADER_MODELS


def graph_with_asset(
    graph: dict[str, Any] | None,
    *,
    asset_id: str,
    filename: str,
    doc_format: str,
) -> dict[str, Any]:
    """Return a deep-copied graph with file loaders pointed at ``asset_id``.

    Used by bulk OCR: one project graph, many documents — each run gets its own
    snapshot with the loader config rewritten.
    """
    snapshot = copy.deepcopy(graph) if isinstance(graph, dict) else {"nodes": [], "edges": []}
    nodes = snapshot.get("nodes")
    if not isinstance(nodes, list):
        snapshot["nodes"] = []
        return snapshot

    for node in nodes:
        if not isinstance(node, dict):
            continue
        model_id = node.get("modelId")
        if model_id not in FILE_LOADER_MODELS:
            continue
        config = node.get("config")
        if not isinstance(config, dict):
            config = {}
            node["config"] = config
        config["assetId"] = asset_id
        config["assetFilename"] = filename
        config["format"] = doc_format
    return snapshot


def count_file_loaders(graph: dict[str, Any] | None) -> int:
    if not isinstance(graph, dict):
        return 0
    nodes = graph.get("nodes")
    if not isinstance(nodes, list):
        return 0
    return sum(
        1
        for node in nodes
        if isinstance(node, dict) and node.get("modelId") in FILE_LOADER_MODELS
    )
