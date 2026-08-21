"""HTTP API for running reusable pipelines headlessly."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.models.pipeline_run import PipelineRun
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.pipeline_run import (
    PipelineRunCreate,
    PipelineRunList,
    PipelineRunRead,
)
from app.services.access_control import get_accessible_pipeline, require_write_access
from app.services.asset_storage import load_asset_meta
from app.services.pipeline_input import resolve_asset_project_id

router = APIRouter()
logger = logging.getLogger(__name__)


def enqueue_pipeline_run(run_id: str) -> str:
    import subprocess
    import sys
    from pathlib import Path

    from app.celery_app import celery_app
    from app.tasks.pipeline_api_runs import execute_pipeline_run

    def _run_inline() -> str:
        logger.warning(
            "No Celery worker available; executing pipeline run %s in a subprocess",
            run_id,
        )
        backend_root = Path(__file__).resolve().parents[3]
        subprocess.Popen(
            [
                sys.executable,
                "-c",
                (
                    "from app.tasks.pipeline_api_runs import execute_pipeline_run; "
                    f"execute_pipeline_run.run({run_id!r})"
                ),
            ],
            cwd=str(backend_root),
            start_new_session=True,
        )
        return run_id

    try:
        inspector = celery_app.control.inspect(timeout=0.5)
        ping = inspector.ping() if inspector is not None else None
        if not ping:
            return _run_inline()
        result = execute_pipeline_run.apply_async(args=[run_id], task_id=run_id)
        return result.id
    except Exception:
        logger.warning(
            "Celery broker unavailable; executing pipeline run %s in a subprocess",
            run_id,
            exc_info=True,
        )
        return _run_inline()


def revoke_pipeline_run(task_id: str) -> None:
    from app.celery_app import celery_app

    try:
        celery_app.control.revoke(task_id, terminate=True)
    except Exception:
        pass


async def _get_accessible_pipeline_run(
    *,
    db: AsyncSession,
    pipeline_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User,
) -> PipelineRun:
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")

    result = await db.execute(
        select(PipelineRun).where(
            PipelineRun.id == run_id,
            PipelineRun.pipeline_id == pipeline_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


@router.post(
    "/{pipeline_id}/runs",
    response_model=PipelineRunRead,
    status_code=status.HTTP_201_CREATED,
)
async def start_pipeline_run(
    pipeline_id: uuid.UUID,
    payload: PipelineRunCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRunRead:
    """Execute a reusable pipeline against an uploaded asset (headless API)."""
    require_write_access(current_user)
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
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

    asset_project_id = resolve_asset_project_id(
        pipeline_id=pipeline.id,
        explicit_project_id=payload.project_id,
    )
    settings = get_settings()
    try:
        load_asset_meta(settings.upload_dir, asset_project_id, payload.asset_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Asset not found under project namespace '{asset_project_id}'. "
                "Upload via POST /api/v1/projects/{project_id}/assets "
                "(or pass project_id matching that upload)."
            ),
        ) from exc

    nodes = pipeline.graph.get("nodes") if isinstance(pipeline.graph, dict) else None
    graph_snapshot = dict(pipeline.graph) if isinstance(pipeline.graph, dict) else {}
    graph_snapshot["_ocrflow"] = {"asset_project_id": asset_project_id}

    run = PipelineRun(
        pipeline_id=pipeline.id,
        owner_id=pipeline.owner_id,
        status="queued",
        graph_snapshot=graph_snapshot,
        input_asset_id=payload.asset_id,
        input_wire_kind=pipeline.input_wire_kind,
        total_count=len(nodes) if isinstance(nodes, list) else 0,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    task_id = enqueue_pipeline_run(str(run.id))
    run.task_id = task_id
    await db.commit()
    await db.refresh(run)
    return PipelineRunRead.model_validate(run)


@router.get("/{pipeline_id}/runs", response_model=PipelineRunList)
async def list_pipeline_runs(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRunList:
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")

    result = await db.execute(
        select(PipelineRun)
        .where(PipelineRun.pipeline_id == pipeline_id)
        .order_by(PipelineRun.created_at.desc())
        .limit(50)
    )
    return PipelineRunList(
        items=[PipelineRunRead.model_validate(run) for run in result.scalars().all()]
    )


@router.get("/{pipeline_id}/runs/{run_id}", response_model=PipelineRunRead)
async def get_pipeline_run(
    pipeline_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRunRead:
    run = await _get_accessible_pipeline_run(
        db=db,
        pipeline_id=pipeline_id,
        run_id=run_id,
        current_user=current_user,
    )
    return PipelineRunRead.model_validate(run)


@router.post("/{pipeline_id}/runs/{run_id}/cancel", response_model=PipelineRunRead)
async def cancel_pipeline_run(
    pipeline_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRunRead:
    require_write_access(current_user)
    run = await _get_accessible_pipeline_run(
        db=db,
        pipeline_id=pipeline_id,
        run_id=run_id,
        current_user=current_user,
    )
    if run.status in {"succeeded", "failed", "cancelled"}:
        return PipelineRunRead.model_validate(run)

    run.status = "cancelled"
    if run.task_id:
        revoke_pipeline_run(run.task_id)
    await db.commit()
    await db.refresh(run)
    return PipelineRunRead.model_validate(run)
