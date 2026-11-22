"""remove strength and frequency from orders

Revision ID: c3e9a7f4d2b1
Revises: 8d4b6a3c1e2f
Create Date: 2026-05-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c3e9a7f4d2b1"
down_revision = "8d4b6a3c1e2f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("orders", "strength")
    op.drop_column("orders", "frequency")


def downgrade() -> None:
    op.add_column("orders", sa.Column("frequency", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("strength", sa.String(), nullable=True))
