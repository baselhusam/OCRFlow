import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipelines.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="queued", index=True
    )
    task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    graph_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    input_asset_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    input_wire_kind: Mapped[str | None] = mapped_column(String(32), nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    node_traces: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    logs: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    current_node_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    completed_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    error: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_context: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
