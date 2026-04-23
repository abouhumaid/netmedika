"""add rejection reason to orders

Revision ID: 8d4b6a3c1e2f
Revises: aeb34cb2e124
Create Date: 2026-04-23 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "8d4b6a3c1e2f"
down_revision = "aeb34cb2e124"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("rejection_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "rejection_reason")
