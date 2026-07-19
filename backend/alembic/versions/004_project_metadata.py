"""project metadata columns

Revision ID: 004
Revises: 003
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, Sequence[str], None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("icon", sa.String(length=64), nullable=False, server_default="file-text"),
    )
    op.add_column(
        "projects",
        sa.Column("color", sa.String(length=7), nullable=False, server_default="#5B2EEF"),
    )
    op.add_column(
        "projects",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "projects",
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
    )


def downgrade() -> None:
    op.drop_column("projects", "status")
    op.drop_column("projects", "is_archived")
    op.drop_column("projects", "color")
    op.drop_column("projects", "icon")
