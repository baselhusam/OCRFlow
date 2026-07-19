"""Resolve upstream cached outputs for backend pipeline execution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.pipeline_execution.schemas import (
    NodeCachedOutput,
    PipelineEdgeRecord,
    PipelineGraph,
)


@dataclass(frozen=True)
class UpstreamContext:
    node_id: str | None
    output: NodeCachedOutput | None
    source_handle: str | None
    edge: PipelineEdgeRecord | None
    node: PipelineNodeRecord | None = None


def get_incoming_edge(graph: PipelineGraph, node_id: str) -> PipelineEdgeRecord | None:
    return next(
        (
            edge
            for edge in graph.edges
            if edge.target == node_id and edge.valid is not False
        ),
        None,
    )


def get_upstream_context(
    graph: PipelineGraph,
    node_id: str,
    outputs: dict[str, NodeCachedOutput],
) -> UpstreamContext:
    incoming = get_incoming_edge(graph, node_id)
    if incoming is None:
        return UpstreamContext(node_id=None, output=None, source_handle=None, edge=None, node=None)
    upstream_node = next(
        (node for node in graph.nodes if node.id == incoming.source),
        None,
    )
    return UpstreamContext(
        node_id=incoming.source,
        output=outputs.get(incoming.source),
        source_handle=incoming.sourceHandle or "output",
        edge=incoming,
        node=upstream_node,
    )


def extract_pages(output: NodeCachedOutput | None) -> list[dict[str, Any]]:
    if output is None:
        return []
    if output.kind == "pages" and isinstance(output.raw, dict):
        pages = output.raw.get("pages")
        if isinstance(pages, list):
            return [page for page in pages if isinstance(page, dict)]
    if output.kind == "page" and isinstance(output.raw, dict):
        page = output.raw.get("page")
        if isinstance(page, dict):
            return [page]
    return []


def extract_page_image(output: NodeCachedOutput | None) -> dict[str, Any] | None:
    if output is None:
        return None
    if output.preview and isinstance(output.preview.get("pageImage"), dict):
        return output.preview["pageImage"]
    pages = extract_pages(output)
    page = pages[0] if pages else None
    if isinstance(page, dict) and isinstance(page.get("page"), dict):
        return page["page"]
    if output.kind == "page" and isinstance(output.raw, dict):
        raw_page = output.raw.get("page")
        if isinstance(raw_page, dict) and isinstance(raw_page.get("page"), dict):
            return raw_page["page"]
    return None


def extract_raw_list(output: NodeCachedOutput | None, key: str) -> list[dict[str, Any]]:
    if output is None or not isinstance(output.raw, dict):
        return []
    values = output.raw.get(key)
    if isinstance(values, list):
        return [value for value in values if isinstance(value, dict)]
    return []
