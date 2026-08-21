import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PipelineJob(Base):
    """A batch application of a reusable pipeline to many documents."""

    __tablename__ = "pipeline_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipelines.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
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
    document_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    succeeded_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    failed_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    cancelled_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    error: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
