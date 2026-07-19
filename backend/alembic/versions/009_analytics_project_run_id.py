"""analytics project run id

Revision ID: 009
Revises: 008
Create Date: 2026-06-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "009"
down_revision: Union[str, Sequence[str], None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "analytics_events",
        sa.Column("project_run_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        op.f("ix_analytics_events_project_run_id"),
        "analytics_events",
        ["project_run_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_analytics_events_project_run_id_project_runs",
        "analytics_events",
        "project_runs",
        ["project_run_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_analytics_events_project_run_id_project_runs",
        "analytics_events",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_analytics_events_project_run_id"), table_name="analytics_events")
    op.drop_column("analytics_events", "project_run_id")
