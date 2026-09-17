"""Resolve upstream cached outputs for backend pipeline execution."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote

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
    source_handle = incoming.sourceHandle or "output"
    return UpstreamContext(
        node_id=incoming.source,
        output=slice_output_by_handle(outputs.get(incoming.source), source_handle),
        source_handle=source_handle,
        edge=incoming,
        node=upstream_node,
    )


# Source handles address a collection (``output``), one item
# (``item:<kind>:<id>``) or a group (``items:<kind>:<id>,<id>``). Mirrors
# frontend/src/lib/canvas/output-slice.ts so a wire that carries "region 3"
# on the canvas carries region 3 in a project run too.
_ITEM_HANDLE_RE = re.compile(r"^item:([a-z]+):(.+)$")
_GROUP_HANDLE_RE = re.compile(r"^items:([a-z]+):(.+)$")
_RAW_LIST_KEY = {
    "region": "regions",
    "figure": "figures",
    "line": "lines",
    "table": "tables",
    "formula": "formulas",
}


def _split_page_suffix(value: str) -> tuple[str, int | None]:
    """``r1@3`` → (``r1``, 3): an item on page 4 of a mapped output."""
    at = value.rfind("@")
    if at <= 0 or not value[at + 1 :].isdigit():
        return value, None
    return value[:at], int(value[at + 1 :])


def parse_source_handle(handle: str | None) -> tuple[str, list[str], int | None] | None:
    """Return ``(item_kind, ids, page_index)`` for an item/group handle, ``None`` for the whole output."""
    if not handle or handle == "output":
        return None
    match = _ITEM_HANDLE_RE.match(handle)
    if match:
        kind = match.group(1)
        body, page = (match.group(2), None) if kind == "page" else _split_page_suffix(match.group(2))
        return kind, [body], page
    match = _GROUP_HANDLE_RE.match(handle)
    if match:
        kind = match.group(1)
        body, page = (match.group(2), None) if kind == "page" else _split_page_suffix(match.group(2))
        ids = [unquote(part) for part in body.split(",") if part]
        return (kind, ids, page) if ids else None
    return None


def slice_output_by_handle(
    output: NodeCachedOutput | None,
    handle: str | None,
) -> NodeCachedOutput | None:
    parsed = parse_source_handle(handle)
    if output is None or parsed is None:
        return output
    item_kind, ids, page_index = parsed

    # Items addressed on a page of a mapped ("apply to all pages") output.
    if page_index is not None and output.mapped:
        entry = next((item for item in output.mapped if item.get("page_index") == page_index), None)
        page_output = entry.get("output") if isinstance(entry, dict) and not entry.get("error") else None
        if not isinstance(page_output, dict):
            return None
        output = NodeCachedOutput.model_validate(page_output)

    if not isinstance(output.raw, dict):
        return output

    if item_kind == "page":
        wanted = {int(value) for value in ids if value.lstrip("-").isdigit()}
        pages = [page for page in extract_pages(output) if page.get("page_index") in wanted]
        if not pages:
            return output
        if len(pages) == 1:
            page = pages[0]
            image = page.get("page") if isinstance(page.get("page"), dict) else None
            return NodeCachedOutput(
                kind="page",
                raw={"page": page},
                preview={
                    "pageCount": 1,
                    "pageImage": image,
                    "thumbnailBase64": image.get("image_base64") if image else None,
                },
            )
        first = pages[0].get("page") if isinstance(pages[0].get("page"), dict) else None
        return NodeCachedOutput(
            kind="pages",
            raw={**output.raw, "pages": pages},
            preview={**(output.preview or {}), "pageCount": len(pages), "itemCount": len(pages), "pageImage": first},
        )

    key = _RAW_LIST_KEY.get(item_kind)
    if key is None:
        return output
    wanted_ids = set(ids)
    items = [item for item in extract_raw_list(output, key) if item.get("id") in wanted_ids]
    if not items:
        return output
    return NodeCachedOutput(
        kind=output.kind,
        raw={**output.raw, key: items},
        preview={**(output.preview or {}), "itemCount": len(items)},
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
