"""Add created_at to users.

Revision ID: f6a3d9c2b810
Revises: e5c2a19b7d30
Create Date: 2026-11-12
"""

from alembic import op
import sqlalchemy as sa


revision = "f6a3d9c2b810"
down_revision = "e5c2a19b7d30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "created_at")
