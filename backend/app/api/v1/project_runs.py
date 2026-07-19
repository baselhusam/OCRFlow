from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.project_run import ProjectRun
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.project_run import ProjectRunList, ProjectRunRead
from app.services.access_control import get_accessible_project, require_write_access

router = APIRouter()


def enqueue_project_run(run_id: str) -> str:
    from app.tasks.pipeline_runs import execute_project_run

    result = execute_project_run.apply_async(args=[run_id], task_id=run_id)
    return result.id


def revoke_project_run(task_id: str) -> None:
    from app.celery_app import celery_app

    celery_app.control.revoke(task_id, terminate=True)


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
