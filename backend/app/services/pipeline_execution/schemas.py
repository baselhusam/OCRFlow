"""Pydantic graph schemas used by the backend run engine."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


NodeRunStatus = Literal["idle", "running", "success", "error"]


class PipelinePosition(BaseModel):
    x: float = 0
    y: float = 0


class PipelineViewport(BaseModel):
    x: float = 0
    y: float = 0
    zoom: float = 1


class NodeRunResult(BaseModel):
    pageCount: int | None = None
    previewBase64: str | None = None
    error: str | None = None
    errorCode: str | None = None
    errorContext: dict[str, Any] | None = None


class NodeCachedOutput(BaseModel):
    kind: str
    raw: Any
    preview: dict[str, Any] | None = None


class PipelineNodeRuntime(BaseModel):
    runStatus: NodeRunStatus | None = None
    lastRunAt: str | None = None
    runResult: NodeRunResult | None = None
    outputPanelOpen: bool | None = None
    cachedOutput: NodeCachedOutput | None = None
    pageBranchNodeId: str | None = None
    branchPanelWidth: int | None = None
    branchPanelHeight: int | None = None


class PipelineNodeRecord(BaseModel):
    id: str
    modelId: str
    position: PipelinePosition = Field(default_factory=PipelinePosition)
    config: dict[str, str | bool | int | float] = Field(default_factory=dict)
    runtime: PipelineNodeRuntime | None = None


class PipelineEdgeRecord(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: str | None = None
    targetHandle: str | None = None
    valid: bool | None = None
    companion: bool | None = None


class PipelineGraph(BaseModel):
    nodes: list[PipelineNodeRecord] = Field(default_factory=list)
    edges: list[PipelineEdgeRecord] = Field(default_factory=list)
    viewport: PipelineViewport | None = None


def parse_pipeline_graph(raw: dict[str, Any]) -> PipelineGraph:
    return PipelineGraph.model_validate(raw or {})


def serialize_pipeline_graph(graph: PipelineGraph) -> dict[str, Any]:
    return graph.model_dump(mode="json", exclude_none=True)
