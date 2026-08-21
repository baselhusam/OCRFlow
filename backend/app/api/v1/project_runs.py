from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.project_run import ProjectRun
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.project_run import (
    ProjectBatchRunRequest,
    ProjectBatchRunResponse,
    ProjectRunList,
    ProjectRunRead,
)
from app.services.access_control import get_accessible_project, require_write_access
from app.services.asset_storage import load_asset_meta
from app.services.batch_graph import count_file_loaders, graph_with_asset
from app.core.config import get_settings

router = APIRouter()


def enqueue_project_run(run_id: str) -> str:
    """Queue a project run on Celery, or run inline when no worker is available.

    Enterprise deployments should always run a Celery worker. For local hybrid
    development (API + postgres/redis without ``make be-worker``), falling back
    to a **subprocess** keeps ``POST /projects/{id}/runs`` usable.

    Important: do not execute ``asyncio.run(...)`` in a thread inside the API
    process — the shared SQLAlchemy async engine is bound to uvicorn's event
    loop and will corrupt the pool.
    """
    import logging
    import subprocess
    import sys
    from pathlib import Path

    from app.celery_app import celery_app
    from app.tasks.pipeline_runs import execute_project_run

    logger = logging.getLogger(__name__)

    def _run_inline() -> str:
        logger.warning(
            "No Celery worker available; executing project run %s in a subprocess",
            run_id,
        )
        backend_root = Path(__file__).resolve().parents[3]
        subprocess.Popen(
            [
                sys.executable,
                "-c",
                (
                    "from app.tasks.pipeline_runs import execute_project_run; "
                    f"execute_project_run.run({run_id!r})"
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
        result = execute_project_run.apply_async(args=[run_id], task_id=run_id)
        return result.id
    except Exception:
        logger.warning(
            "Celery broker unavailable; executing project run %s in a subprocess",
            run_id,
            exc_info=True,
        )
        return _run_inline()


def revoke_project_run(task_id: str) -> None:
    from app.celery_app import celery_app

    try:
        celery_app.control.revoke(task_id, terminate=True)
    except Exception:
        # Best-effort when running without a live Celery worker.
        pass


async def _get_accessible_run(
    *,
    db: AsyncSession,
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User,
) -> ProjectRun:
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(ProjectRun).where(
            ProjectRun.id == run_id,
            ProjectRun.project_id == project_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


@router.post(
    "/{project_id}/runs",
    response_model=ProjectRunRead,
    status_code=status.HTTP_201_CREATED,
)
async def start_project_run(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRunRead:
    require_write_access(current_user)
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    nodes = project.graph.get("nodes") if isinstance(project.graph, dict) else None
    run = ProjectRun(
        project_id=project.id,
        owner_id=project.owner_id,
        status="queued",
        graph_snapshot=project.graph,
        total_count=len(nodes) if isinstance(nodes, list) else 0,
    )
    db.add(run)
    project.status = "running"
    await db.commit()
    await db.refresh(run)

    task_id = enqueue_project_run(str(run.id))
    run.task_id = task_id
    await db.commit()
    await db.refresh(run)
    return ProjectRunRead.model_validate(run)


@router.post(
    "/{project_id}/batch-runs",
    response_model=ProjectBatchRunResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_project_batch_runs(
    project_id: uuid.UUID,
    payload: ProjectBatchRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectBatchRunResponse:
    """Run the project graph once per uploaded asset (bulk OCR).

    Each asset gets its own queued run with file-loader nodes rewritten to that
    asset. Requires at least one ``loader/pdf`` or ``loader/image`` node.
    """
    require_write_access(current_user)
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    asset_ids = [aid.strip() for aid in payload.asset_ids if aid and aid.strip()]
    if not asset_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No asset ids provided")
    if len(asset_ids) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many assets (max 50)")

    if count_file_loaders(project.graph if isinstance(project.graph, dict) else None) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add a PDF or Image loader node before starting a batch run",
        )

    settings = get_settings()
    created: list[ProjectRun] = []
    for asset_id in asset_ids:
        try:
            meta = load_asset_meta(settings.upload_dir, str(project_id), asset_id)
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset not found: {asset_id}",
            ) from exc

        snapshot = graph_with_asset(
            project.graph if isinstance(project.graph, dict) else None,
            asset_id=meta.asset_id,
            filename=meta.filename,
            doc_format=meta.format,
        )
        nodes = snapshot.get("nodes") if isinstance(snapshot, dict) else None
        run = ProjectRun(
            project_id=project.id,
            owner_id=project.owner_id,
            status="queued",
            graph_snapshot=snapshot,
            total_count=len(nodes) if isinstance(nodes, list) else 0,
        )
        db.add(run)
        created.append(run)

    project.status = "running"
    await db.commit()
    for run in created:
        await db.refresh(run)
        task_id = enqueue_project_run(str(run.id))
        run.task_id = task_id
    await db.commit()
    for run in created:
        await db.refresh(run)

    return ProjectBatchRunResponse(
        items=[ProjectRunRead.model_validate(run) for run in created]
    )


@router.get("/{project_id}/runs", response_model=ProjectRunList)
async def list_project_runs(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRunList:
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(ProjectRun)
        .where(ProjectRun.project_id == project_id)
        .order_by(ProjectRun.created_at.desc())
        .limit(50)
    )
    return ProjectRunList(
        items=[ProjectRunRead.model_validate(run) for run in result.scalars().all()]
    )


@router.get("/{project_id}/runs/{run_id}", response_model=ProjectRunRead)
async def get_project_run(
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRunRead:
    run = await _get_accessible_run(
        db=db,
        project_id=project_id,
        run_id=run_id,
        current_user=current_user,
    )
    return ProjectRunRead.model_validate(run)


@router.post("/{project_id}/runs/{run_id}/cancel", response_model=ProjectRunRead)
async def cancel_project_run(
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRunRead:
    require_write_access(current_user)
    run = await _get_accessible_run(
        db=db,
        project_id=project_id,
        run_id=run_id,
        current_user=current_user,
    )
    if run.status in {"succeeded", "failed", "cancelled"}:
        return ProjectRunRead.model_validate(run)

    run.status = "cancelled"
    if run.task_id:
        revoke_project_run(run.task_id)
    await db.commit()
    await db.refresh(run)
    return ProjectRunRead.model_validate(run)
