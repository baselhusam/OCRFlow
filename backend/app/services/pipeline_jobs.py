"""Create and refresh pipeline jobs (batch document runs)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.pipeline import Pipeline
from app.db.models.pipeline_job import PipelineJob
from app.db.models.pipeline_run import PipelineRun
from app.schemas.pipeline_job import PipelineJobRead, PipelineJobSummary
from app.schemas.pipeline_run import PipelineRunRead


def _now() -> datetime:
    return datetime.now(tz=UTC)


def compact_run(run: PipelineRun) -> PipelineRunRead:
    """Drop bulky final result blobs for job/list payloads."""
    data = PipelineRunRead.model_validate(run)
    return data.model_copy(update={"result": None})


def job_to_read(
    job: PipelineJob,
    *,
    pipeline_name: str | None,
    runs: list[PipelineRun] | None = None,
    include_run_results: bool = False,
) -> PipelineJobRead:
    items: list[PipelineRunRead] = []
    if runs is not None:
        items = [
            PipelineRunRead.model_validate(run)
            if include_run_results
            else compact_run(run)
            for run in runs
        ]
    return PipelineJobRead(
        id=job.id,
        pipeline_id=job.pipeline_id,
        pipeline_name=pipeline_name,
        owner_id=job.owner_id,
        status=job.status,  # type: ignore[arg-type]
        document_count=job.document_count,
        succeeded_count=job.succeeded_count,
        failed_count=job.failed_count,
        cancelled_count=job.cancelled_count,
        error=job.error,
        started_at=job.started_at,
        finished_at=job.finished_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        items=items,
    )


def job_to_summary(job: PipelineJob, pipeline_name: str | None) -> PipelineJobSummary:
    return PipelineJobSummary(
        id=job.id,
        pipeline_id=job.pipeline_id,
        pipeline_name=pipeline_name,
        owner_id=job.owner_id,
        status=job.status,  # type: ignore[arg-type]
        document_count=job.document_count,
        succeeded_count=job.succeeded_count,
        failed_count=job.failed_count,
        cancelled_count=job.cancelled_count,
        error=job.error,
        started_at=job.started_at,
        finished_at=job.finished_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def append_run_log(
    run: PipelineRun,
    message: str,
    *,
    level: str = "info",
    node_id: str | None = None,
    page: int | None = None,
) -> None:
    entry: dict[str, Any] = {
        "ts": _now().isoformat(),
        "level": level,
        "message": message,
    }
    if node_id:
        entry["node_id"] = node_id
    if page is not None:
        entry["page"] = page
    logs = list(run.logs or [])
    logs.append(entry)
    run.logs = logs


def upsert_node_trace(
    run: PipelineRun,
    *,
    node_id: str,
    model_id: str,
    status: str,
    page_count: int | None = None,
    output_kind: str | None = None,
    error: str | None = None,
    message: str | None = None,
) -> None:
    traces = [dict(item) for item in (run.node_traces or []) if isinstance(item, dict)]
    existing = next((item for item in traces if item.get("node_id") == node_id), None)
    stamp = _now().isoformat()
    if existing is None:
        existing = {
            "node_id": node_id,
            "model_id": model_id,
            "status": status,
            "started_at": stamp,
            "finished_at": None,
        }
        traces.append(existing)
    existing["status"] = status
    existing["model_id"] = model_id
    if page_count is not None:
        existing["page_count"] = page_count
    if output_kind:
        existing["output_kind"] = output_kind
    if error:
        existing["error"] = error
    if message:
        existing["message"] = message
    if status in {"succeeded", "failed"}:
        existing["finished_at"] = stamp
        if existing.get("started_at") is None:
            existing["started_at"] = stamp
    run.node_traces = traces


def derive_job_status(runs: list[PipelineRun]) -> str:
    if not runs:
        return "queued"
    statuses = [run.status for run in runs]
    active = {"queued", "running"}
    if all(status == "cancelled" for status in statuses):
        return "cancelled"
    if any(status in active for status in statuses):
        return "running"
    if all(status == "succeeded" for status in statuses):
        return "succeeded"
    if all(status == "failed" for status in statuses):
        return "failed"
    if any(status == "cancelled" for status in statuses) and not any(
        status == "failed" for status in statuses
    ):
        return "cancelled"
    return "partial"


async def refresh_job_status(db: AsyncSession, job_id: UUID) -> PipelineJob | None:
    job = await db.get(PipelineJob, job_id)
    if job is None:
        return None
    result = await db.execute(select(PipelineRun).where(PipelineRun.job_id == job_id))
    runs = list(result.scalars().all())
    job.succeeded_count = sum(1 for run in runs if run.status == "succeeded")
    job.failed_count = sum(1 for run in runs if run.status == "failed")
    job.cancelled_count = sum(1 for run in runs if run.status == "cancelled")
    job.document_count = len(runs)
    previous = job.status
    job.status = derive_job_status(runs)
    if job.status == "running" and job.started_at is None:
        job.started_at = _now()
    if job.status in {"succeeded", "failed", "partial", "cancelled"}:
        if job.finished_at is None or previous not in {
            "succeeded",
            "failed",
            "partial",
            "cancelled",
        }:
            job.finished_at = _now()
        first_error = next((run.error for run in runs if run.error), None)
        job.error = first_error if job.status in {"failed", "partial"} else None
    else:
        job.finished_at = None
        job.error = None
    await db.commit()
    await db.refresh(job)
    return job


async def load_job_runs(db: AsyncSession, job_id: UUID) -> list[PipelineRun]:
    result = await db.execute(
        select(PipelineRun)
        .where(PipelineRun.job_id == job_id)
        .order_by(PipelineRun.created_at.asc())
    )
    return list(result.scalars().all())


async def pipeline_name_for(db: AsyncSession, pipeline_id: UUID) -> str | None:
    pipeline = await db.get(Pipeline, pipeline_id)
    return pipeline.name if pipeline is not None else None
