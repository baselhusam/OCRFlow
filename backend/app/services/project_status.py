"""Derive persisted project status from pipeline graph JSON."""

from __future__ import annotations

from typing import Any

from app.services.graph_analytics import parse_graph_snapshot


def derive_project_status(graph: dict[str, Any] | None) -> str:
    snapshot = parse_graph_snapshot(graph)

    if not snapshot.nodes:
        return "draft"

    has_running = False
    has_error = False
    has_success = False

    for node in snapshot.nodes:
        if node.run_status == "running":
            has_running = True
        elif node.run_status == "error":
            has_error = True
        elif node.run_status == "success":
            has_success = True

    if has_running:
        return "running"
    if has_error:
        return "failed"
    if has_success:
        return "live"
    return "idle"
