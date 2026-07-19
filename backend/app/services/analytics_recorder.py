"""Record analytics events from inference and other sources."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.analytics_event import AnalyticsEvent
from app.db.models.project import Project
from app.db.models.user import User

HEADER_PROJECT_ID = "x-ocrflow-project-id"
HEADER_NODE_ID = "x-ocrflow-node-id"
HEADER_RUN_KIND = "x-ocrflow-run-kind"


def parse_inference_context(request: Request) -> dict[str, str | None]:
    return {
        "project_id": request.headers.get(HEADER_PROJECT_ID),
        "node_id": request.headers.get(HEADER_NODE_ID),
        "run_kind": request.headers.get(HEADER_RUN_KIND),
    }


async def _resolve_owned_project_id(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID,
    project_id_raw: str | None,
) -> uuid.UUID | None:
    if not project_id_raw:
        return None
    try:
        project_id = uuid.UUID(project_id_raw)
    except ValueError:
        return None

    result = await db.execute(
        select(Project.id).where(
            Project.id == project_id,
            Project.owner_id == owner_id,
        )
    )
    if result.scalar_one_or_none() is None:
        return None
    return project_id


def extract_inference_metrics(result: BaseModel | dict[str, Any]) -> tuple[float | None, int | None]:
    if isinstance(result, BaseModel):
        data = result.model_dump()
    else:
        data = result

    meta = data.get("meta") or {}
    latency_ms = meta.get("latency_ms")
    if latency_ms is not None:
        latency_ms = float(latency_ms)

    page_count: int | None = None
    if isinstance(data.get("pages"), list):
        page_count = len(data["pages"])
    elif data.get("page") is not None:
        page_count = 1
    elif isinstance(data.get("document"), dict):
        doc_pages = data["document"].get("pages")
        if isinstance(doc_pages, list):
            page_count = len(doc_pages)

    return latency_ms, page_count


async def record_inference_event(
    db: AsyncSession,
    *,
    user: User,
    model_id: str,
    request: Request,
    status: str,
    result: BaseModel | None = None,
    error_message: str | None = None,
    project_run_id: uuid.UUID | None = None,
) -> None:
    context = parse_inference_context(request)
    project_id = await _resolve_owned_project_id(
        db,
        owner_id=user.id,
        project_id_raw=context.get("project_id"),
    )

    run_kind = context.get("run_kind") or "test_run"
    event_type = "pipeline_run" if run_kind == "pipeline_run" else "inference_run"

    latency_ms: float | None = None
    page_count: int | None = None
    if result is not None and status == "success":
        latency_ms, page_count = extract_inference_metrics(result)

    metadata: dict[str, Any] = {"run_kind": run_kind}
    if error_message:
        metadata["error"] = error_message

    event = AnalyticsEvent(
        owner_id=user.id,
        project_id=project_id,
        project_run_id=project_run_id,
        node_id=context.get("node_id"),
        event_type=event_type,
        model_id=model_id,
        status=status,
        latency_ms=latency_ms,
        page_count=page_count,
        metadata_=metadata,
    )
    db.add(event)
    await db.commit()


async def record_project_run_event(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID,
    project_id: uuid.UUID,
    project_run_id: uuid.UUID,
    status: str,
    latency_ms: float | None = None,
    page_count: int | None = None,
    error_message: str | None = None,
) -> None:
    metadata: dict[str, Any] = {"run_kind": "pipeline_run"}
    if error_message:
        metadata["error"] = error_message

    event = AnalyticsEvent(
        owner_id=owner_id,
        project_id=project_id,
        project_run_id=project_run_id,
        node_id=None,
        event_type="project_run",
        model_id="project-run",
        status=status,
        latency_ms=latency_ms,
        page_count=page_count,
        metadata_=metadata,
    )
    db.add(event)
    await db.commit()
