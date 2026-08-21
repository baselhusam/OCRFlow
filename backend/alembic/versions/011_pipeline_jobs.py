"""pipeline jobs and run tracing

Revision ID: 011
Revises: 010
Create Date: 2026-08-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "011"
down_revision: Union[str, Sequence[str], None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pipeline_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pipeline_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="queued", nullable=False),
        sa.Column("document_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("succeeded_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("cancelled_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error", sa.String(length=4096), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pipeline_id"], ["pipelines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pipeline_jobs_created_at"), "pipeline_jobs", ["created_at"], unique=False)
    op.create_index(op.f("ix_pipeline_jobs_owner_id"), "pipeline_jobs", ["owner_id"], unique=False)
    op.create_index(op.f("ix_pipeline_jobs_pipeline_id"), "pipeline_jobs", ["pipeline_id"], unique=False)
    op.create_index(op.f("ix_pipeline_jobs_status"), "pipeline_jobs", ["status"], unique=False)

    op.add_column(
        "pipeline_runs",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "pipeline_runs",
        sa.Column("input_filename", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "pipeline_runs",
        sa.Column("page_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "pipeline_runs",
        sa.Column(
            "node_traces",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "pipeline_runs",
        sa.Column(
            "logs",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.create_foreign_key(
        "fk_pipeline_runs_job_id",
        "pipeline_runs",
        "pipeline_jobs",
        ["job_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(op.f("ix_pipeline_runs_job_id"), "pipeline_runs", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pipeline_runs_job_id"), table_name="pipeline_runs")
    op.drop_constraint("fk_pipeline_runs_job_id", "pipeline_runs", type_="foreignkey")
    op.drop_column("pipeline_runs", "logs")
    op.drop_column("pipeline_runs", "node_traces")
    op.drop_column("pipeline_runs", "page_count")
    op.drop_column("pipeline_runs", "input_filename")
    op.drop_column("pipeline_runs", "job_id")

    op.drop_index(op.f("ix_pipeline_jobs_status"), table_name="pipeline_jobs")
    op.drop_index(op.f("ix_pipeline_jobs_pipeline_id"), table_name="pipeline_jobs")
    op.drop_index(op.f("ix_pipeline_jobs_owner_id"), table_name="pipeline_jobs")
    op.drop_index(op.f("ix_pipeline_jobs_created_at"), table_name="pipeline_jobs")
    op.drop_table("pipeline_jobs")
