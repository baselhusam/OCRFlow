import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.models.pipeline import Pipeline
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.pipeline import PipelineCreate, PipelineList, PipelineRead, PipelineUpdate
from app.services.access_control import get_accessible_pipeline, require_write_access
from app.services.pipeline_boundary import derive_pipeline_boundary_io
from app.services.pipeline_logo_storage import (
    delete_all_pipeline_data,
    delete_pipeline_logo,
    has_pipeline_logo,
    load_pipeline_logo,
    save_pipeline_logo,
)

router = APIRouter()

DEFAULT_COLOR = "#5B2EEF"


def _pipeline_read(pipeline: Pipeline, upload_dir) -> PipelineRead:
    data = PipelineRead.model_validate(pipeline)
    return data.model_copy(
        update={"has_logo": has_pipeline_logo(upload_dir, str(pipeline.id))}
    )


@router.get("", response_model=PipelineList)
async def list_pipelines(
    include_archived: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineList:
    query = (
        select(Pipeline)
        .where(Pipeline.owner_id == current_user.id)
        .order_by(Pipeline.updated_at.desc())
    )
    if not include_archived:
        query = query.where(Pipeline.is_archived.is_(False))

    result = await db.execute(query)
    pipelines = result.scalars().all()
    settings = get_settings()
    return PipelineList(
        items=[_pipeline_read(p, settings.upload_dir) for p in pipelines]
    )


@router.post("", response_model=PipelineRead, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    payload: PipelineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRead:
    require_write_access(current_user)

    pipeline = Pipeline(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        accent_color=payload.accent_color or DEFAULT_COLOR,
    )
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)
    settings = get_settings()
    return _pipeline_read(pipeline, settings.upload_dir)


@router.get("/{pipeline_id}", response_model=PipelineRead)
async def get_pipeline(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRead:
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )
    settings = get_settings()
    return _pipeline_read(pipeline, settings.upload_dir)


@router.patch("/{pipeline_id}", response_model=PipelineRead)
async def update_pipeline(
    pipeline_id: uuid.UUID,
    payload: PipelineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineRead:
    require_write_access(current_user)

    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    updates = payload.model_dump(exclude_unset=True)
    graph_update = updates.pop("graph", None)

    for field, value in updates.items():
        setattr(pipeline, field, value)

    if graph_update is not None:
        boundary = derive_pipeline_boundary_io(graph_update)
        if not boundary.valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Invalid pipeline graph",
                    "errors": boundary.errors,
                    "boundary": boundary.model_dump(),
                },
            )
        pipeline.graph = graph_update
        pipeline.input_wire_kind = boundary.input_wire_kind
        pipeline.output_wire_kind = boundary.output_wire_kind
        pipeline.input_type_label = boundary.input_type_label
        pipeline.output_type_label = boundary.output_type_label

    await db.commit()
    await db.refresh(pipeline)
    settings = get_settings()
    return _pipeline_read(pipeline, settings.upload_dir)


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    require_write_access(current_user)

    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    settings = get_settings()
    delete_all_pipeline_data(settings.upload_dir, str(pipeline_id))
    await db.delete(pipeline)
    await db.commit()


@router.post("/{pipeline_id}/logo", status_code=status.HTTP_204_NO_CONTENT)
async def upload_pipeline_logo(
    pipeline_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    require_write_access(current_user)

    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    settings = get_settings()
    await save_pipeline_logo(
        upload_dir=settings.upload_dir,
        pipeline_id=str(pipeline_id),
        file=file,
    )


@router.get("/{pipeline_id}/logo")
async def get_pipeline_logo(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    settings = get_settings()
    try:
        data, mime_type = load_pipeline_logo(settings.upload_dir, str(pipeline_id))
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Logo not found"
        ) from None

    return Response(content=data, media_type=mime_type)


@router.delete("/{pipeline_id}/logo", status_code=status.HTTP_204_NO_CONTENT)
async def remove_pipeline_logo(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    require_write_access(current_user)

    pipeline = await get_accessible_pipeline(db, pipeline_id, current_user)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found"
        )

    settings = get_settings()
    delete_pipeline_logo(settings.upload_dir, str(pipeline_id))
