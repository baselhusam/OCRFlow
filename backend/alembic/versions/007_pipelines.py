"""pipelines table

Revision ID: 007
Revises: 006
Create Date: 2026-06-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007"
down_revision: Union[str, Sequence[str], None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pipelines",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column(
            "graph",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("input_wire_kind", sa.String(length=32), nullable=True),
        sa.Column("output_wire_kind", sa.String(length=32), nullable=True),
        sa.Column("input_type_label", sa.String(length=64), nullable=True),
        sa.Column("output_type_label", sa.String(length=64), nullable=True),
        sa.Column(
            "accent_color",
            sa.String(length=7),
            nullable=False,
            server_default="#5B2EEF",
        ),
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_pipelines_owner_id"), "pipelines", ["owner_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_pipelines_owner_id"), table_name="pipelines")
    op.drop_table("pipelines")
