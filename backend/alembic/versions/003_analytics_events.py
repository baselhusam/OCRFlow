"""analytics_events table

Revision ID: 003
Revises: 002
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, Sequence[str], None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analytics_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("node_id", sa.String(length=128), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("model_id", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_analytics_events_owner_id"), "analytics_events", ["owner_id"], unique=False
    )
    op.create_index(
        op.f("ix_analytics_events_project_id"),
        "analytics_events",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analytics_events_model_id"), "analytics_events", ["model_id"], unique=False
    )
    op.create_index(
        op.f("ix_analytics_events_created_at"),
        "analytics_events",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_analytics_events_owner_created",
        "analytics_events",
        ["owner_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_analytics_events_owner_project_created",
        "analytics_events",
        ["owner_id", "project_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_analytics_events_owner_model",
        "analytics_events",
        ["owner_id", "model_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_analytics_events_owner_model", table_name="analytics_events")
    op.drop_index("ix_analytics_events_owner_project_created", table_name="analytics_events")
    op.drop_index("ix_analytics_events_owner_created", table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_created_at"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_model_id"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_project_id"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_owner_id"), table_name="analytics_events")
    op.drop_table("analytics_events")
