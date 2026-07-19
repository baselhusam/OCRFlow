"""Derive pipeline boundary I/O from graph JSON."""

from __future__ import annotations

from typing import Any

from app.schemas.pipeline import PipelineBoundaryIO
from app.services.pipeline_wire_kinds import (
    BLOCKED_PIPELINE_MODELS,
    FILE_LOADER_MODELS,
    are_wire_kinds_compatible,
    get_model_wire_kinds,
    get_model_wire_labels,
)


def _parse_nodes(graph: dict[str, Any]) -> list[dict[str, Any]]:
    nodes = graph.get("nodes")
    if not isinstance(nodes, list):
        return []
    return [n for n in nodes if isinstance(n, dict) and isinstance(n.get("id"), str)]


def _parse_edges(graph: dict[str, Any]) -> list[dict[str, Any]]:
    edges = graph.get("edges")
    if not isinstance(edges, list):
        return []
    return [
        e
        for e in edges
        if isinstance(e, dict)
        and isinstance(e.get("source"), str)
        and isinstance(e.get("target"), str)
    ]


def _topological_has_cycle(
    node_ids: set[str], edges: list[dict[str, Any]]
) -> bool:
    in_degree = {nid: 0 for nid in node_ids}
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source not in node_ids or target not in node_ids:
            continue
        adjacency[source].append(target)
        in_degree[target] = in_degree.get(target, 0) + 1

    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    visited = 0

    while queue:
        current = queue.pop(0)
        visited += 1
        for nxt in adjacency.get(current, []):
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)

    return visited != len(node_ids)


def _connected_components(
    node_ids: set[str], edges: list[dict[str, Any]]
) -> list[set[str]]:
    adjacency: dict[str, set[str]] = {nid: set() for nid in node_ids}
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source in node_ids and target in node_ids:
            adjacency[source].add(target)
            adjacency[target].add(source)

    visited: set[str] = set()
    components: list[set[str]] = []

    for start in node_ids:
        if start in visited:
            continue
        stack = [start]
        component: set[str] = set()
        while stack:
            current = stack.pop()
            if current in visited:
                continue
            visited.add(current)
            component.add(current)
            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    stack.append(neighbor)
        components.append(component)

    return components


def _validate_edge_compatibility(
    edges: list[dict[str, Any]],
    model_by_id: dict[str, str],
    node_ids: set[str],
) -> bool:
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source not in node_ids or target not in node_ids:
            continue
        source_model = model_by_id.get(source, "")
        target_model = model_by_id.get(target, "")
        source_wires = get_model_wire_kinds(source_model)
        target_wires = get_model_wire_kinds(target_model)
        if not are_wire_kinds_compatible(
            source_wires["output"], target_wires["input"]
        ):
            return False
    return True


def derive_pipeline_boundary_io(graph: dict[str, Any]) -> PipelineBoundaryIO:
    nodes = _parse_nodes(graph)
    edges = _parse_edges(graph)
    errors: list[str] = []

    if not nodes:
        return PipelineBoundaryIO(valid=False, errors=["no_nodes"])

    if len(nodes) < 2:
        errors.append("insufficient_nodes")

    node_ids = {n["id"] for n in nodes}
    model_by_id = {
        n["id"]: n.get("modelId", "") for n in nodes if isinstance(n.get("modelId"), str)
    }

    for model_id in model_by_id.values():
        if model_id in BLOCKED_PIPELINE_MODELS:
            if model_id in FILE_LOADER_MODELS:
                errors.append("contains_file_loader")
            else:
                errors.append("contains_page_branch")

    if _topological_has_cycle(node_ids, edges):
        errors.append("cycle_detected")

    components = _connected_components(node_ids, edges)
    if len(components) > 1:
        errors.append("disconnected_graph")

    if not _validate_edge_compatibility(edges, model_by_id, node_ids):
        errors.append("incompatible_connection")

    in_degree = {nid: 0 for nid in node_ids}
    out_degree = {nid: 0 for nid in node_ids}
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source in node_ids and target in node_ids:
            out_degree[source] += 1
            in_degree[target] += 1

    entry_node_ids = [nid for nid in node_ids if in_degree[nid] == 0]
    exit_node_ids = [nid for nid in node_ids if out_degree[nid] == 0]

    if not entry_node_ids:
        errors.append("no_entry_node")
    if not exit_node_ids:
        errors.append("no_exit_node")

    entry_input_kinds: set[str] = set()
    exit_output_kinds: set[str] = set()

    for entry_id in entry_node_ids:
        entry_wires = get_model_wire_kinds(model_by_id.get(entry_id, ""))
        entry_input = entry_wires["input"]
        if entry_input in ("none", "file"):
            errors.append("invalid_entry_input")
        else:
            entry_input_kinds.add(entry_input)

    for exit_id in exit_node_ids:
        exit_wires = get_model_wire_kinds(model_by_id.get(exit_id, ""))
        exit_output = exit_wires["output"]
        if exit_output in ("none",):
            errors.append("invalid_exit_output")
        else:
            exit_output_kinds.add(exit_output)

    if len(entry_input_kinds) > 1:
        errors.append("incompatible_entry_inputs")
    if len(exit_output_kinds) > 1:
        errors.append("incompatible_exit_outputs")

    if errors:
        return PipelineBoundaryIO(
            valid=False,
            errors=errors,
            entry_node_ids=entry_node_ids,
            exit_node_ids=exit_node_ids,
        )

    primary_entry_id = entry_node_ids[0]
    primary_exit_id = exit_node_ids[0]
    entry_model = model_by_id.get(primary_entry_id, "")
    exit_model = model_by_id.get(primary_exit_id, "")

    entry_wires = get_model_wire_kinds(entry_model)
    exit_wires = get_model_wire_kinds(exit_model)
    entry_labels = get_model_wire_labels(entry_model)
    exit_labels = get_model_wire_labels(exit_model)

    return PipelineBoundaryIO(
        valid=True,
        errors=[],
        entry_node_ids=entry_node_ids,
        exit_node_ids=exit_node_ids,
        input_wire_kind=entry_wires["input"],
        output_wire_kind=exit_wires["output"],
        input_type_label=entry_labels["input"],
        output_type_label=exit_labels["output"],
    )
