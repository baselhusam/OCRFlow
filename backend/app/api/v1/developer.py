"""Public, API-key authenticated OCR pipeline endpoints.

The endpoint deliberately stores uploads only in OCRFlow's pipeline namespace;
it never accepts arbitrary server filesystem paths from API clients.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.pipeline_runs import enqueue_pipeline_run
from app.db.models.api_key import ApiKey
from app.db.models.pipeline import Pipeline
from app.db.models.pipeline_job import PipelineJob
from app.db.models.pipeline_run import PipelineRun
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.api_key import DeveloperPipelineItem, DeveloperPipelineList, DeveloperUploadResponse
from app.schemas.pipeline_run import PipelineRunRead
from app.schemas.pipeline_job import PipelineJobRead
from app.services import api_keys as api_keys_service
from app.services.asset_storage import save_project_asset
from app.services.pipeline_input import resolve_asset_project_id
from app.api.v1.pipeline_jobs import _require_ready_pipeline
from app.services.pipeline_jobs import job_to_read, load_job_runs
from app.core.config import get_settings

router = APIRouter()
_MAX_BATCH_FILES = 50


async def _principal(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> tuple[ApiKey, User]:
    return await api_keys_service.authenticate_key(db, x_api_key)


async def _pipeline_for_key(db: AsyncSession, *, pipeline_id: uuid.UUID, key: ApiKey, owner: User) -> Pipeline:
    query = select(Pipeline).where(Pipeline.id == pipeline_id)
    if owner.user_role.value != "admin":
        query = query.where(Pipeline.owner_id == owner.id)
    pipeline = (await db.execute(query)).scalar_one_or_none()
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    if not api_keys_service.permits_pipeline(key, pipeline_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This API key is not permitted to use this pipeline")
    return pipeline


@router.get("/pipelines", response_model=DeveloperPipelineList)
async def list_developer_pipelines(
    principal: tuple[ApiKey, User] = Depends(_principal), db: AsyncSession = Depends(get_db)
) -> DeveloperPipelineList:
    key, owner = principal
    query = select(Pipeline).where(Pipeline.is_archived.is_(False)).order_by(Pipeline.name.asc())
    if owner.user_role.value != "admin":
        query = query.where(Pipeline.owner_id == owner.id)
    if key.allowed_pipeline_ids:
        query = query.where(Pipeline.id.in_([uuid.UUID(value) for value in key.allowed_pipeline_ids]))
    pipelines = list((await db.execute(query)).scalars().all())
    await api_keys_service.record_usage(db, key=key, endpoint="/developer/pipelines", method="GET", status_code=200)
    return DeveloperPipelineList(items=[DeveloperPipelineItem(
        id=pipeline.id, name=pipeline.name, description=pipeline.description,
        input_type_label=pipeline.input_type_label, output_type_label=pipeline.output_type_label,
    ) for pipeline in pipelines])


@router.post("/pipelines/{pipeline_id}/documents", response_model=DeveloperUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_and_run_pipeline(
    pipeline_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    output_format: str = Form(default="json"),
    principal: tuple[ApiKey, User] = Depends(_principal),
    db: AsyncSession = Depends(get_db),
) -> DeveloperUploadResponse:
    key, owner = principal
    try:
        pipeline = await _pipeline_for_key(db, pipeline_id=pipeline_id, key=key, owner=owner)
        _require_ready_pipeline(pipeline)
        if output_format != "json":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Only output_format=json is currently supported")
        if not files:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one document is required")
        if len(files) > _MAX_BATCH_FILES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Too many files (max {_MAX_BATCH_FILES})")

        asset_namespace = resolve_asset_project_id(pipeline_id=pipeline.id, explicit_project_id=None)
        settings = get_settings()
        assets = [await save_project_asset(upload_dir=settings.upload_dir, project_id=asset_namespace, file=file) for file in files]
        nodes = pipeline.graph.get("nodes") if isinstance(pipeline.graph, dict) else []
        graph_snapshot = dict(pipeline.graph)
        graph_snapshot["_ocrflow"] = {"asset_project_id": asset_namespace, "api_key_id": str(key.id)}
        job = PipelineJob(pipeline_id=pipeline.id, owner_id=pipeline.owner_id, status="queued", document_count=len(assets))
        db.add(job)
        await db.flush()
        runs: list[PipelineRun] = []
        for asset in assets:
            run = PipelineRun(
                pipeline_id=pipeline.id, job_id=job.id, owner_id=pipeline.owner_id, status="queued",
                graph_snapshot=graph_snapshot, input_asset_id=asset.asset_id, input_filename=asset.filename,
                input_wire_kind=pipeline.input_wire_kind, total_count=len(nodes), node_traces=[], logs=[],
            )
            db.add(run)
            runs.append(run)
        await db.commit()
        for run in runs:
            await db.refresh(run)
            run.task_id = enqueue_pipeline_run(str(run.id))
        await db.commit()
        for run in runs:
            await db.refresh(run)
        await api_keys_service.record_usage(
            db, key=key, endpoint=f"/developer/pipelines/{pipeline_id}/documents", method="POST",
            status_code=202, pipeline_id=pipeline_id, document_count=len(runs),
        )
        return DeveloperUploadResponse(
            pipeline_id=pipeline.id, job_id=job.id,
            runs=[PipelineRunRead.model_validate(run).model_dump(mode="json") for run in runs],
            retrieval={"job": f"/api/v1/developer/jobs/{job.id}", "run": f"/api/v1/developer/pipelines/{pipeline.id}/runs/{{run_id}}"},
        )
    except HTTPException as exc:
        await api_keys_service.record_usage(
            db, key=key, endpoint=f"/developer/pipelines/{pipeline_id}/documents", method="POST",
            status_code=exc.status_code, pipeline_id=pipeline_id if exc.status_code != 404 else None,
            document_count=0, error_code="validation_error",
        )
        raise


@router.get("/pipelines/{pipeline_id}/runs/{run_id}", response_model=PipelineRunRead)
async def get_developer_pipeline_run(
    pipeline_id: uuid.UUID, run_id: uuid.UUID,
    principal: tuple[ApiKey, User] = Depends(_principal), db: AsyncSession = Depends(get_db),
) -> PipelineRunRead:
    key, owner = principal
    try:
        await _pipeline_for_key(db, pipeline_id=pipeline_id, key=key, owner=owner)
        run = await db.scalar(select(PipelineRun).where(PipelineRun.id == run_id, PipelineRun.pipeline_id == pipeline_id))
        if run is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
        await api_keys_service.record_usage(db, key=key, endpoint=f"/developer/pipelines/{pipeline_id}/runs/{{run_id}}", method="GET", status_code=200, pipeline_id=pipeline_id)
        return PipelineRunRead.model_validate(run)
    except HTTPException as exc:
        await api_keys_service.record_usage(db, key=key, endpoint=f"/developer/pipelines/{pipeline_id}/runs/{{run_id}}", method="GET", status_code=exc.status_code, pipeline_id=pipeline_id if exc.status_code != 404 else None, error_code="not_found" if exc.status_code == 404 else "forbidden")
        raise


@router.get("/jobs/{job_id}", response_model=PipelineJobRead)
async def get_developer_job(
    job_id: uuid.UUID,
    principal: tuple[ApiKey, User] = Depends(_principal), db: AsyncSession = Depends(get_db),
) -> PipelineJobRead:
    key, owner = principal
    try:
        job = await db.get(PipelineJob, job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        pipeline = await _pipeline_for_key(db, pipeline_id=job.pipeline_id, key=key, owner=owner)
        runs = await load_job_runs(db, job.id)
        await api_keys_service.record_usage(db, key=key, endpoint="/developer/jobs/{job_id}", method="GET", status_code=200, pipeline_id=pipeline.id)
        return job_to_read(job, pipeline_name=pipeline.name, runs=runs)
    except HTTPException as exc:
        await api_keys_service.record_usage(db, key=key, endpoint="/developer/jobs/{job_id}", method="GET", status_code=exc.status_code, error_code="not_found" if exc.status_code == 404 else "forbidden")
        raise
