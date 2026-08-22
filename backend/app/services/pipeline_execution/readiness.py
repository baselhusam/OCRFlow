"""Readiness and ordering helpers for backend pipeline execution."""

from __future__ import annotations

from dataclasses import dataclass

from app.models.runner_factory import RUNNER_FACTORIES
from app.services.pipeline_execution.registry import MODEL_EXECUTION_SPECS
from app.services.pipeline_execution.schemas import PipelineGraph


@dataclass(frozen=True)
class PipelineReadiness:
    ready: bool
    ordered_node_ids: list[str]
    issues: list[str]


def topological_sort(graph: PipelineGraph) -> list[str]:
    node_ids = {node.id for node in graph.nodes}
    in_degree = {node_id: 0 for node_id in node_ids}
    adjacency: dict[str, list[str]] = {node_id: [] for node_id in node_ids}

    for edge in graph.edges:
        if edge.valid is False:
            continue
        if edge.source not in node_ids or edge.target not in node_ids:
            continue
        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] += 1

    queue = [node.id for node in graph.nodes if in_degree.get(node.id, 0) == 0]
    ordered: list[str] = []

    while queue:
        current = queue.pop(0)
        ordered.append(current)
        for next_id in adjacency.get(current, []):
            in_degree[next_id] -= 1
            if in_degree[next_id] == 0:
                queue.append(next_id)

    if len(ordered) != len(node_ids):
        raise ValueError("Pipeline graph contains a cycle")
    return ordered


def get_pipeline_readiness(graph: PipelineGraph) -> PipelineReadiness:
    issues: list[str] = []
    if not graph.nodes:
        issues.append("Pipeline has no nodes")

    node_ids = {node.id for node in graph.nodes}
    for edge in graph.edges:
        if edge.source not in node_ids or edge.target not in node_ids:
            issues.append(f"Edge {edge.id} references a missing node")

    for node in graph.nodes:
        if node.modelId.startswith("custom-pipeline/"):
            continue
        if node.modelId not in RUNNER_FACTORIES:
            issues.append(f"Node {node.id} uses unsupported model {node.modelId}")
        elif node.modelId not in MODEL_EXECUTION_SPECS:
            issues.append(
                f"Node {node.id} model {node.modelId} is not available in pipeline execution"
            )

    try:
        ordered = topological_sort(graph)
    except ValueError as exc:
        issues.append(str(exc))
        ordered = []

    return PipelineReadiness(ready=not issues, ordered_node_ids=ordered, issues=issues)
