"""Celery / inline execution for reusable pipeline API runs."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.celery_app import celery_app
from app.db.models.pipeline import Pipeline
from app.db.models.pipeline_run import PipelineRun
from app.db.session import task_session
from app.services.pipeline_execution import (
    PipelineExecutionError,
    PipelineExecutor,
    PipelineProgress,
)
from app.services.pipeline_input import materialize_pipeline_input
from app.services.pipeline_jobs import (
    append_run_log,
    refresh_job_status,
    upsert_node_trace,
)


logger = logging.getLogger(__name__)


class PipelineRunCancelled(Exception):
    pass


@celery_app.task(name="app.tasks.pipeline_api_runs.execute_pipeline_run")
def execute_pipeline_run(run_id: str) -> dict[str, str]:
    try:
        return asyncio.run(_execute_pipeline_run(run_id))
    except Exception as exc:
        try:
            asyncio.run(_mark_run_failed(run_id, str(exc)))
        except Exception:
            logger.exception("Could not persist failure for pipeline run %s", run_id)
        raise


async def _mark_run_failed(run_id: str, message: str) -> None:
    async with task_session() as db:
        result = await db.execute(select(PipelineRun).where(PipelineRun.id == UUID(run_id)))
        run = result.scalar_one_or_none()
        if run is None or run.status in {"succeeded", "cancelled"}:
            return
        run.status = "failed"
        run.error = message
        run.error_code = run.error_code or "worker"
        run.finished_at = _stamp()
        append_run_log(run, message, level="error")
        await db.commit()
        await _sync_job(db, run)


def _stamp() -> datetime:
    return datetime.now(tz=UTC)


async def _sync_job(db, run: PipelineRun) -> None:
    if run.job_id is not None:
        await refresh_job_status(db, run.job_id)


async def _execute_pipeline_run(run_id: str) -> dict[str, str]:
    run_uuid = UUID(run_id)
    async with task_session() as db:
        result = await db.execute(select(PipelineRun).where(PipelineRun.id == run_uuid))
        run = result.scalar_one_or_none()
        if run is None:
            return {"run_id": run_id, "status": "missing"}

        pipeline = await db.get(Pipeline, run.pipeline_id)
        if pipeline is None:
            run.status = "failed"
            run.error = "Pipeline not found"
            run.finished_at = _stamp()
            append_run_log(run, "Pipeline not found", level="error")
            await db.commit()
            await _sync_job(db, run)
            return {"run_id": run_id, "status": "failed"}

        if not run.input_asset_id:
            run.status = "failed"
            run.error = "Pipeline run is missing input_asset_id"
            run.finished_at = _stamp()
            append_run_log(run, "Missing input_asset_id", level="error")
            await db.commit()
            await _sync_job(db, run)
            return {"run_id": run_id, "status": "failed"}

        graph_raw = dict(run.graph_snapshot) if isinstance(run.graph_snapshot, dict) else {}
        meta = graph_raw.pop("_ocrflow", None)
        asset_project_id = (
            meta.get("asset_project_id")
            if isinstance(meta, dict) and isinstance(meta.get("asset_project_id"), str)
            else f"pipeline-{run.pipeline_id}"
        )
        label = run.input_filename or run.input_asset_id

        async def on_progress(progress: PipelineProgress) -> None:
            await db.refresh(run)
            if run.status == "cancelled":
                raise PipelineRunCancelled("Pipeline run was cancelled")
            run.current_node_id = progress.current_node_id
            run.completed_count = progress.completed_count
            run.total_count = progress.total_count
            if progress.current_node_id:
                event_status = {
                    "node_started": "running",
                    "node_succeeded": "succeeded",
                    "node_failed": "failed",
                }.get(progress.event, "running")
                upsert_node_trace(
                    run,
                    node_id=progress.current_node_id,
                    model_id=progress.model_id or progress.current_node_id,
                    status=event_status,
                    page_count=progress.page_count,
                    output_kind=progress.output_kind,
                    error=progress.message if event_status == "failed" else None,
                    message=progress.message,
                )
                if progress.message:
                    append_run_log(
                        run,
                        progress.message,
                        level="error" if event_status == "failed" else "info",
                        node_id=progress.current_node_id,
                    )
            await db.commit()

        run.status = "running"
        run.started_at = _stamp()
        append_run_log(run, f"Started {label}")
        await db.commit()
        await _sync_job(db, run)

        try:
            initial = await materialize_pipeline_input(
                asset_id=run.input_asset_id,
                asset_project_id=asset_project_id,
                input_wire_kind=run.input_wire_kind or pipeline.input_wire_kind,
            )
        except Exception as exc:
            run.status = "failed"
            run.error = str(exc)
            run.error_code = "input_adapt"
            run.finished_at = _stamp()
            append_run_log(run, f"Failed to adapt input: {exc}", level="error")
            await db.commit()
            await _sync_job(db, run)
            return {"run_id": run_id, "status": "failed"}

        preview = initial.preview or {}
        page_count = preview.get("pageCount") or preview.get("itemCount")
        if isinstance(page_count, int):
            run.page_count = page_count
        append_run_log(
            run,
            (
                f"Adapted document into {run.input_wire_kind or pipeline.input_wire_kind}"
                + (f" ({run.page_count} pages)" if run.page_count else "")
            ),
        )
        await db.commit()

        executor = PipelineExecutor(
            project_id=run.pipeline_id,
            owner_id=run.owner_id,
            db=db,
            on_progress=on_progress,
        )

        try:
            execution = await executor.execute_with_input(graph_raw, initial)
        except PipelineRunCancelled:
            run.current_node_id = None
            run.finished_at = _stamp()
            append_run_log(run, "Cancelled", level="warn")
            await db.commit()
            await _sync_job(db, run)
            return {"run_id": run_id, "status": "cancelled"}
        except PipelineExecutionError as exc:
            run.status = "failed"
            run.error = str(exc)
            run.error_code = exc.error_code
            run.error_context = exc.error_context
            run.current_node_id = exc.node_id
            run.finished_at = _stamp()
            if exc.node_id:
                upsert_node_trace(
                    run,
                    node_id=exc.node_id,
                    model_id=(exc.error_context or {}).get("modelId") or exc.node_id,
                    status="failed",
                    error=str(exc),
                    message=str(exc),
                )
            append_run_log(
                run,
                str(exc),
                level="error",
                node_id=exc.node_id,
            )
            await db.commit()
            await _sync_job(db, run)
            return {"run_id": run_id, "status": "failed"}
        except Exception as exc:
            run.status = "failed"
            run.error = str(exc)
            run.error_code = "unknown"
            run.finished_at = _stamp()
            append_run_log(run, str(exc), level="error")
            await db.commit()
            await _sync_job(db, run)
            return {"run_id": run_id, "status": "failed"}

        run.status = "succeeded"
        run.current_node_id = None
        run.completed_count = execution.completed_count
        run.total_count = execution.total_count
        run.result = (
            execution.final_output.model_dump(mode="json")
            if execution.final_output is not None
            else None
        )
        run.finished_at = _stamp()
        append_run_log(run, f"Finished {label}")
        await db.commit()
        await _sync_job(db, run)
        return {"run_id": run_id, "status": "succeeded"}
