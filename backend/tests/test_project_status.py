"""Tests for derive_project_status."""

from app.services.project_status import derive_project_status


def test_derive_draft_when_no_nodes():
    assert derive_project_status({}) == "draft"
    assert derive_project_status({"nodes": []}) == "draft"


def test_derive_idle_when_nodes_without_runs():
    graph = {
        "nodes": [
            {"id": "n1", "modelId": "pdf-loader", "runtime": {}},
        ]
    }
    assert derive_project_status(graph) == "idle"


def test_derive_running():
    graph = {
        "nodes": [
            {"id": "n1", "modelId": "pdf-loader", "runtime": {"runStatus": "running"}},
        ]
    }
    assert derive_project_status(graph) == "running"


def test_derive_failed():
    graph = {
        "nodes": [
            {"id": "n1", "modelId": "pdf-loader", "runtime": {"runStatus": "error"}},
        ]
    }
    assert derive_project_status(graph) == "failed"


def test_derive_live():
    graph = {
        "nodes": [
            {"id": "n1", "modelId": "pdf-loader", "runtime": {"runStatus": "success"}},
        ]
    }
    assert derive_project_status(graph) == "live"


def test_running_takes_precedence_over_error():
    graph = {
        "nodes": [
            {"id": "n1", "modelId": "a", "runtime": {"runStatus": "error"}},
            {"id": "n2", "modelId": "b", "runtime": {"runStatus": "running"}},
        ]
    }
    assert derive_project_status(graph) == "running"
