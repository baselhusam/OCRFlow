"""per-connection enabled model list (OpenRouter OCR models on the canvas)

Revision ID: 015
Revises: 014
Create Date: 2026-11-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "015"
down_revision: Union[str, Sequence[str], None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # NULL means "the recommended default set"; a list is an explicit choice.
    op.add_column(
        "model_connections",
        sa.Column("enabled_models", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("model_connections", "enabled_models")
