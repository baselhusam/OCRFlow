"""pipeline runs table

Revision ID: 010
Revises: 009
Create Date: 2026-08-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010"
down_revision: Union[str, Sequence[str], None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pipeline_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pipeline_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="queued", nullable=False),
        sa.Column("task_id", sa.String(length=255), nullable=True),
        sa.Column(
            "graph_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("input_asset_id", sa.String(length=64), nullable=True),
        sa.Column("input_wire_kind", sa.String(length=32), nullable=True),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("current_node_id", sa.String(length=128), nullable=True),
        sa.Column("completed_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error", sa.String(length=4096), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_context", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
    op.create_index(op.f("ix_pipeline_runs_created_at"), "pipeline_runs", ["created_at"], unique=False)
    op.create_index(op.f("ix_pipeline_runs_owner_id"), "pipeline_runs", ["owner_id"], unique=False)
    op.create_index(op.f("ix_pipeline_runs_pipeline_id"), "pipeline_runs", ["pipeline_id"], unique=False)
    op.create_index(op.f("ix_pipeline_runs_status"), "pipeline_runs", ["status"], unique=False)
    op.create_index(op.f("ix_pipeline_runs_task_id"), "pipeline_runs", ["task_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pipeline_runs_task_id"), table_name="pipeline_runs")
    op.drop_index(op.f("ix_pipeline_runs_status"), table_name="pipeline_runs")
    op.drop_index(op.f("ix_pipeline_runs_pipeline_id"), table_name="pipeline_runs")
    op.drop_index(op.f("ix_pipeline_runs_owner_id"), table_name="pipeline_runs")
    op.drop_index(op.f("ix_pipeline_runs_created_at"), table_name="pipeline_runs")
    op.drop_table("pipeline_runs")
