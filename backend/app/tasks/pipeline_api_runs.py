"""Celery / inline execution for reusable pipeline API runs."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.celery_app import celery_app
from app.db.models.pipeline import Pipeline
from app.db.models.pipeline_run import PipelineRun
from app.db.session import async_session_factory
from app.services.pipeline_execution import (
    PipelineExecutionError,
    PipelineExecutor,
    PipelineProgress,
)
from app.services.pipeline_input import materialize_pipeline_input


class PipelineRunCancelled(Exception):
    pass


@celery_app.task(name="app.tasks.pipeline_api_runs.execute_pipeline_run")
def execute_pipeline_run(run_id: str) -> dict[str, str]:
    return asyncio.run(_execute_pipeline_run(run_id))


async def _execute_pipeline_run(run_id: str) -> dict[str, str]:
    run_uuid = UUID(run_id)
    async with async_session_factory() as db:
        result = await db.execute(select(PipelineRun).where(PipelineRun.id == run_uuid))
        run = result.scalar_one_or_none()
        if run is None:
            return {"run_id": run_id, "status": "missing"}

        pipeline = await db.get(Pipeline, run.pipeline_id)
        if pipeline is None:
            run.status = "failed"
            run.error = "Pipeline not found"
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            return {"run_id": run_id, "status": "failed"}

        if not run.input_asset_id:
            run.status = "failed"
            run.error = "Pipeline run is missing input_asset_id"
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            return {"run_id": run_id, "status": "failed"}

        graph_raw = dict(run.graph_snapshot) if isinstance(run.graph_snapshot, dict) else {}
        meta = graph_raw.pop("_ocrflow", None)
        asset_project_id = (
            meta.get("asset_project_id")
            if isinstance(meta, dict) and isinstance(meta.get("asset_project_id"), str)
            else f"pipeline-{run.pipeline_id}"
        )

        async def on_progress(progress: PipelineProgress) -> None:
            await db.refresh(run)
            if run.status == "cancelled":
                raise PipelineRunCancelled("Pipeline run was cancelled")
            run.current_node_id = progress.current_node_id
            run.completed_count = progress.completed_count
            run.total_count = progress.total_count
            await db.commit()

        run.status = "running"
        run.started_at = datetime.now(tz=UTC)
        await db.commit()

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
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            return {"run_id": run_id, "status": "failed"}

        # Strip internal metadata before execution
        executor = PipelineExecutor(
            project_id=run.pipeline_id,  # synthetic; used for asset: resolution context
            owner_id=run.owner_id,
            db=db,
            on_progress=on_progress,
        )

        try:
            execution = await executor.execute_with_input(graph_raw, initial)
        except PipelineRunCancelled:
            run.current_node_id = None
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            return {"run_id": run_id, "status": "cancelled"}
        except PipelineExecutionError as exc:
            run.status = "failed"
            run.error = str(exc)
            run.error_code = exc.error_code
            run.error_context = exc.error_context
            run.current_node_id = exc.node_id
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            return {"run_id": run_id, "status": "failed"}
        except Exception as exc:
            run.status = "failed"
            run.error = str(exc)
            run.error_code = "unknown"
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
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
        run.finished_at = datetime.now(tz=UTC)
        await db.commit()
        return {"run_id": run_id, "status": "succeeded"}
