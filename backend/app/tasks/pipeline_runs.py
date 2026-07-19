"""Celery tasks for project pipeline runs."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.celery_app import celery_app
from app.db.models.project import Project
from app.db.models.project_run import ProjectRun
from app.db.session import async_session_factory
from app.services.pipeline_execution import (
    PipelineExecutionError,
    PipelineExecutor,
    PipelineProgress,
)
from app.services.pipeline_execution.schemas import serialize_pipeline_graph
from app.services.analytics_recorder import record_project_run_event


class ProjectRunCancelled(Exception):
    pass


@celery_app.task(name="app.tasks.pipeline_runs.execute_project_run")
def execute_project_run(run_id: str) -> dict[str, str]:
    """Execute a persisted project run."""
    return asyncio.run(_execute_project_run(run_id))


async def _execute_project_run(run_id: str) -> dict[str, str]:
    run_uuid = UUID(run_id)
    async with async_session_factory() as db:
        result = await db.execute(select(ProjectRun).where(ProjectRun.id == run_uuid))
        run = result.scalar_one_or_none()
        if run is None:
            return {"run_id": run_id, "status": "missing"}

        project = await db.get(Project, run.project_id)
        if project is None:
            run.status = "failed"
            run.error = "Project not found"
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            return {"run_id": run_id, "status": "failed"}

        async def on_progress(progress: PipelineProgress) -> None:
            await db.refresh(run)
            if run.status == "cancelled":
                raise ProjectRunCancelled("Project run was cancelled")
            run.current_node_id = progress.current_node_id
            run.completed_count = progress.completed_count
            run.total_count = progress.total_count
            await db.commit()

        run.status = "running"
        run.started_at = datetime.now(tz=UTC)
        project.status = "running"
        await db.commit()
        await record_project_run_event(
            db,
            owner_id=run.owner_id,
            project_id=run.project_id,
            project_run_id=run.id,
            status="running",
        )

        executor = PipelineExecutor(
            project_id=run.project_id,
            owner_id=run.owner_id,
            db=db,
            on_progress=on_progress,
        )

        try:
            execution = await executor.execute(run.graph_snapshot)
        except ProjectRunCancelled:
            project.status = "idle"
            run.current_node_id = None
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            await record_project_run_event(
                db,
                owner_id=run.owner_id,
                project_id=run.project_id,
                project_run_id=run.id,
                status="cancelled",
            )
            return {"run_id": run_id, "status": "cancelled"}
        except PipelineExecutionError as exc:
            project.graph = serialize_pipeline_graph(exc.graph)
            project.status = "failed"
            run.status = "failed"
            run.error = str(exc)
            run.error_code = exc.error_code
            run.error_context = exc.error_context
            run.current_node_id = exc.node_id
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            await record_project_run_event(
                db,
                owner_id=run.owner_id,
                project_id=run.project_id,
                project_run_id=run.id,
                status="error",
                error_message=str(exc),
            )
            return {"run_id": run_id, "status": "failed"}
        except Exception as exc:
            project.status = "failed"
            run.status = "failed"
            run.error = str(exc)
            run.error_code = "unknown"
            run.finished_at = datetime.now(tz=UTC)
            await db.commit()
            await record_project_run_event(
                db,
                owner_id=run.owner_id,
                project_id=run.project_id,
                project_run_id=run.id,
                status="error",
                error_message=str(exc),
            )
            return {"run_id": run_id, "status": "failed"}

        project.graph = serialize_pipeline_graph(execution.graph)
        project.status = "live"
        run.status = "succeeded"
        run.current_node_id = None
        run.completed_count = execution.completed_count
        run.total_count = execution.total_count
        run.finished_at = datetime.now(tz=UTC)
        await db.commit()
        duration_ms = None
        if run.started_at is not None:
            duration_ms = (run.finished_at - run.started_at).total_seconds() * 1000
        page_count = execution.final_output.preview.get("pageCount") if execution.final_output and execution.final_output.preview else None
        await record_project_run_event(
            db,
            owner_id=run.owner_id,
            project_id=run.project_id,
            project_run_id=run.id,
            status="success",
            latency_ms=duration_ms,
            page_count=page_count if isinstance(page_count, int) else None,
        )
        return {"run_id": run_id, "status": "succeeded"}
