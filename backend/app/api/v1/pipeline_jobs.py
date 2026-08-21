"""HTTP API for applying a reusable pipeline to many documents (jobs)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.pipeline_runs import enqueue_pipeline_run, revoke_pipeline_run
from app.core.config import get_settings
from app.db.models.pipeline_job import PipelineJob
from app.db.models.pipeline_run import PipelineRun
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.pipeline_job import (
    PipelineJobCreate,
    PipelineJobRead,
    PipelineJobSummaryList,
)
from app.services.access_control import (
    get_accessible_job,
    get_accessible_pipeline,
    require_write_access,
    resolve_owner_scope,
)
from app.services.asset_storage import load_asset_meta
from app.services.pipeline_input import resolve_asset_project_id
from app.services.pipeline_jobs import (
    job_to_read,
    job_to_summary,
    load_job_runs,
    pipeline_name_for,
    refresh_job_status,
)

pipeline_jobs_router = APIRouter()
jobs_router = APIRouter()


def _require_ready_pipeline(pipeline) -> None:
    if pipeline.is_archived:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pipeline is archived")
    if not isinstance(pipeline.graph, dict) or not pipeline.graph.get("nodes"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pipeline graph is empty — open the pipeline canvas and save a graph first",
        )
    if not pipeline.input_wire_kind:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pipeline has no valid I/O boundary — fix the graph and save again",
        )


@pipeline_jobs_router.post(
    "/{pipeline_id}/jobs",
    response_model=PipelineJobRead,
    status_code=status.HTTP_201_CREATED,
)
async def start_pipeline_job(
    pipeline_id: uuid.UUID,
    payload: PipelineJobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineJobRead:
    """Apply a reusable pipeline to many uploaded documents."""
    require_write_access(current_user)
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    _require_ready_pipeline(pipeline)

    asset_ids = [aid.strip() for aid in payload.asset_ids if aid and aid.strip()]
    if not asset_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No asset ids provided")
    if len(asset_ids) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many assets (max 50)")

    asset_project_id = resolve_asset_project_id(
        pipeline_id=pipeline.id,
        explicit_project_id=None,
    )
    settings = get_settings()
    metas = []
    for asset_id in asset_ids:
        try:
            metas.append(load_asset_meta(settings.upload_dir, asset_project_id, asset_id))
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset not found: {asset_id}",
            ) from exc

    nodes = pipeline.graph.get("nodes") if isinstance(pipeline.graph, dict) else None
    graph_snapshot = dict(pipeline.graph) if isinstance(pipeline.graph, dict) else {}
    graph_snapshot["_ocrflow"] = {"asset_project_id": asset_project_id}

    job = PipelineJob(
        pipeline_id=pipeline.id,
        owner_id=pipeline.owner_id,
        status="queued",
        document_count=len(metas),
    )
    db.add(job)
    await db.flush()

    created: list[PipelineRun] = []
    for meta in metas:
        run = PipelineRun(
            pipeline_id=pipeline.id,
            job_id=job.id,
            owner_id=pipeline.owner_id,
            status="queued",
            graph_snapshot=graph_snapshot,
            input_asset_id=meta.asset_id,
            input_filename=meta.filename,
            input_wire_kind=pipeline.input_wire_kind,
            total_count=len(nodes) if isinstance(nodes, list) else 0,
            node_traces=[],
            logs=[],
        )
        db.add(run)
        created.append(run)

    await db.commit()
    await db.refresh(job)
    for run in created:
        await db.refresh(run)
        task_id = enqueue_pipeline_run(str(run.id))
        run.task_id = task_id
    await db.commit()
    await db.refresh(job)
    runs = await load_job_runs(db, job.id)
    return job_to_read(job, pipeline_name=pipeline.name, runs=runs)


@pipeline_jobs_router.get("/{pipeline_id}/jobs", response_model=PipelineJobSummaryList)
async def list_pipeline_jobs(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineJobSummaryList:
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")

    result = await db.execute(
        select(PipelineJob)
        .where(PipelineJob.pipeline_id == pipeline_id)
        .order_by(PipelineJob.created_at.desc())
        .limit(50)
    )
    return PipelineJobSummaryList(
        items=[job_to_summary(job, pipeline.name) for job in result.scalars().all()]
    )


@jobs_router.get("", response_model=PipelineJobSummaryList)
@jobs_router.get("/", response_model=PipelineJobSummaryList, include_in_schema=False)
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineJobSummaryList:
    query = select(PipelineJob).order_by(PipelineJob.created_at.desc()).limit(50)
    owner_scope = resolve_owner_scope(current_user)
    if owner_scope is not None:
        query = query.where(PipelineJob.owner_id == owner_scope)
    result = await db.execute(query)
    jobs = list(result.scalars().all())
    names: dict[uuid.UUID, str | None] = {}
    items = []
    for job in jobs:
        if job.pipeline_id not in names:
            names[job.pipeline_id] = await pipeline_name_for(db, job.pipeline_id)
        items.append(job_to_summary(job, names[job.pipeline_id]))
    return PipelineJobSummaryList(items=items)


@jobs_router.get("/{job_id}", response_model=PipelineJobRead)
async def get_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineJobRead:
    job = await get_accessible_job(db, job_id, current_user)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    name = await pipeline_name_for(db, job.pipeline_id)
    runs = await load_job_runs(db, job.id)
    return job_to_read(job, pipeline_name=name, runs=runs)


@jobs_router.post("/{job_id}/cancel", response_model=PipelineJobRead)
async def cancel_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineJobRead:
    require_write_access(current_user)
    job = await get_accessible_job(db, job_id, current_user)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    runs = await load_job_runs(db, job.id)
    for run in runs:
        if run.status in {"succeeded", "failed", "cancelled"}:
            continue
        run.status = "cancelled"
        if run.task_id:
            revoke_pipeline_run(run.task_id)
    await db.commit()
    job = await refresh_job_status(db, job.id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    name = await pipeline_name_for(db, job.pipeline_id)
    runs = await load_job_runs(db, job.id)
    return job_to_read(job, pipeline_name=name, runs=runs)
