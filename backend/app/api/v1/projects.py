import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.models.project import Project
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectList, ProjectRead, ProjectUpdate
from app.services.access_control import get_accessible_project, require_write_access
from app.services.asset_storage import delete_all_project_assets
from app.services.project_status import derive_project_status

router = APIRouter()

DEFAULT_ICON = "file-text"
DEFAULT_COLOR = "#5B2EEF"


@router.get("", response_model=ProjectList)
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectList:
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    return ProjectList(items=[ProjectRead.model_validate(p) for p in projects])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    require_write_access(current_user)

    project = Project(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        icon=payload.icon or DEFAULT_ICON,
        color=payload.color or DEFAULT_COLOR,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return ProjectRead.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    require_write_access(current_user)

    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    updates = payload.model_dump(exclude_unset=True)
    explicit_status = updates.pop("status", None)

    for field, value in updates.items():
        setattr(project, field, value)

    if explicit_status is not None:
        project.status = explicit_status
    elif "graph" in updates:
        project.status = derive_project_status(project.graph)

    await db.commit()
    await db.refresh(project)
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    require_write_access(current_user)

    project = await get_accessible_project(db, project_id, current_user)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    settings = get_settings()
    delete_all_project_assets(settings.upload_dir, str(project_id))

    await db.delete(project)
    await db.commit()
