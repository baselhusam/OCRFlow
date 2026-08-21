"""Backend pipeline executor shared by API tests and Celery workers."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models.pipeline import Pipeline
from app.models.runner_factory import get_cached_runner
from app.services.pipeline_execution.readiness import get_pipeline_readiness
from app.services.pipeline_execution.registry import build_model_input, extract_model_output
from app.services.pipeline_execution.schemas import (
    NodeCachedOutput,
    NodeRunResult,
    PipelineGraph,
    PipelineNodeRecord,
    PipelineNodeRuntime,
    parse_pipeline_graph,
)
from app.services.pipeline_execution.upstream import UpstreamContext, get_upstream_context

ProgressCallback = Callable[["PipelineProgress"], Awaitable[None] | None]


@dataclass(frozen=True)
class PipelineProgress:
    current_node_id: str | None
    completed_count: int
    total_count: int
    event: str = "progress"
    model_id: str | None = None
    message: str | None = None
    page_count: int | None = None
    output_kind: str | None = None


@dataclass(frozen=True)
class PipelineExecutionResult:
    graph: PipelineGraph
    final_output: NodeCachedOutput | None
    completed_count: int
    total_count: int


class PipelineExecutionError(Exception):
    def __init__(
        self,
        message: str,
        *,
        graph: PipelineGraph,
        node_id: str | None = None,
        error_code: str = "unknown",
        error_context: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.graph = graph
        self.node_id = node_id
        self.error_code = error_code
        self.error_context = error_context


class PipelineExecutor:
    def __init__(
        self,
        *,
        project_id: UUID,
        owner_id: UUID,
        db: AsyncSession,
        on_progress: ProgressCallback | None = None,
    ) -> None:
        self.project_id = project_id
        self.owner_id = owner_id
        self.db = db
        self.on_progress = on_progress
        self.config = get_settings().build_model_config()

    async def execute(self, graph_raw: dict[str, Any]) -> PipelineExecutionResult:
        graph = parse_pipeline_graph(graph_raw)
        return await self._execute_graph(graph, initial_output=None)

    async def execute_with_input(
        self,
        graph_raw: dict[str, Any],
        initial_output: NodeCachedOutput,
    ) -> PipelineExecutionResult:
        """Execute a reusable pipeline graph with an API-adapted entry input."""
        graph = parse_pipeline_graph(graph_raw)
        return await self._execute_graph(graph, initial_output=initial_output)

    async def _execute_graph(
        self,
        graph: PipelineGraph,
        *,
        initial_output: NodeCachedOutput | None,
    ) -> PipelineExecutionResult:
        readiness = get_pipeline_readiness(graph)
        if not readiness.ready:
            raise PipelineExecutionError(
                readiness.issues[0] if readiness.issues else "Pipeline is not ready",
                graph=graph,
                error_code="readiness",
                error_context={"issues": readiness.issues},
            )

        node_by_id = {node.id: node for node in graph.nodes}
        outputs: dict[str, NodeCachedOutput] = {}
        completed = 0
        total = len(readiness.ordered_node_ids)

        for node_id in readiness.ordered_node_ids:
            node = node_by_id[node_id]
            await self._emit_progress(
                node_id,
                completed,
                total,
                event="node_started",
                model_id=node.modelId,
                message=f"Running {node.modelId}",
            )
            self._mark_node_running(node)

            upstream = get_upstream_context(graph, node_id, outputs)
            if upstream.output is None and upstream.node_id is None and initial_output is not None:
                upstream = UpstreamContext(
                    node_id=None,
                    output=initial_output,
                    source_handle=None,
                    edge=None,
                    node=None,
                )

            try:
                output = await self._execute_node(node, upstream)
            except Exception as exc:
                self._mark_node_error(node, exc)
                await self._emit_progress(
                    node_id,
                    completed,
                    total,
                    event="node_failed",
                    model_id=node.modelId,
                    message=str(exc),
                )
                raise PipelineExecutionError(
                    str(exc),
                    graph=graph,
                    node_id=node.id,
                    error_code=getattr(exc, "error_code", "model_inference"),
                    error_context={"modelId": node.modelId, "nodeId": node.id},
                ) from exc

            outputs[node.id] = output
            self._mark_node_success(node, output)
            completed += 1
            preview = output.preview or {}
            page_count = preview.get("pageCount") or preview.get("itemCount")
            await self._emit_progress(
                node_id,
                completed,
                total,
                event="node_succeeded",
                model_id=node.modelId,
                message=f"Finished {node.modelId}",
                page_count=page_count if isinstance(page_count, int) else None,
                output_kind=output.kind,
            )

        final_output = outputs.get(readiness.ordered_node_ids[-1]) if readiness.ordered_node_ids else None
        return PipelineExecutionResult(
            graph=graph,
            final_output=final_output,
            completed_count=completed,
            total_count=total,
        )

    async def _execute_node(
        self,
        node: PipelineNodeRecord,
        upstream: UpstreamContext,
    ) -> NodeCachedOutput:
        if node.modelId.startswith("custom-pipeline/"):
            return await self._execute_custom_pipeline_node(node, upstream)

        model_input = build_model_input(
            project_id=str(self.project_id),
            node=node,
            upstream=upstream,
        )
        runner = await get_cached_runner(node.modelId, self.config)
        result = await runner.run(model_input)
        return extract_model_output(node.modelId, result)

    async def _execute_custom_pipeline_node(
        self,
        node: PipelineNodeRecord,
        upstream: UpstreamContext,
    ) -> NodeCachedOutput:
        pipeline_id = node.config.get("pipelineId")
        if not isinstance(pipeline_id, str) or not pipeline_id:
            pipeline_id = node.modelId.removeprefix("custom-pipeline/")
        try:
            pipeline_uuid = UUID(pipeline_id)
        except ValueError as exc:
            raise ValueError("Custom pipeline node has an invalid pipeline id") from exc

        result = await self.db.execute(
            select(Pipeline).where(
                Pipeline.id == pipeline_uuid,
                Pipeline.owner_id == self.owner_id,
                Pipeline.is_archived.is_(False),
            )
        )
        pipeline = result.scalar_one_or_none()
        if pipeline is None:
            raise ValueError("Custom pipeline definition was not found")

        nested_graph = parse_pipeline_graph(pipeline.graph)
        nested_result = await self._execute_graph(
            nested_graph,
            initial_output=upstream.output,
        )
        if nested_result.final_output is None:
            raise ValueError("Custom pipeline produced no output")
        return nested_result.final_output

    async def _emit_progress(
        self,
        current_node_id: str | None,
        completed_count: int,
        total_count: int,
        *,
        event: str = "progress",
        model_id: str | None = None,
        message: str | None = None,
        page_count: int | None = None,
        output_kind: str | None = None,
    ) -> None:
        if self.on_progress is None:
            return
        maybe_awaitable = self.on_progress(
            PipelineProgress(
                current_node_id=current_node_id,
                completed_count=completed_count,
                total_count=total_count,
                event=event,
                model_id=model_id,
                message=message,
                page_count=page_count,
                output_kind=output_kind,
            )
        )
        if maybe_awaitable is not None:
            await maybe_awaitable

    def _mark_node_running(self, node: PipelineNodeRecord) -> None:
        current = node.runtime.model_dump() if node.runtime else {}
        current.update({"runStatus": "running", "runResult": None})
        node.runtime = PipelineNodeRuntime(
            **current,
        )

    def _mark_node_success(self, node: PipelineNodeRecord, output: NodeCachedOutput) -> None:
        preview = output.preview or {}
        page_count = preview.get("pageCount") or preview.get("itemCount")
        current = node.runtime.model_dump() if node.runtime else {}
        current.update(
            {
                "runStatus": "success",
                "lastRunAt": datetime.now(tz=UTC).isoformat(),
                "cachedOutput": output,
                "runResult": NodeRunResult(
                    pageCount=page_count if isinstance(page_count, int) else None,
                    previewBase64=preview.get("thumbnailBase64")
                    if isinstance(preview.get("thumbnailBase64"), str)
                    else None,
                ),
            }
        )
        node.runtime = PipelineNodeRuntime(
            **current,
        )

    def _mark_node_error(self, node: PipelineNodeRecord, error: Exception) -> None:
        current = node.runtime.model_dump() if node.runtime else {}
        current.update(
            {
                "runStatus": "error",
                "lastRunAt": datetime.now(tz=UTC).isoformat(),
                "runResult": NodeRunResult(
                    error=str(error),
                    errorCode=getattr(error, "error_code", "model_inference"),
                    errorContext={"modelId": node.modelId, "nodeId": node.id},
                ),
            }
        )
        node.runtime = PipelineNodeRuntime(
            **current,
        )
