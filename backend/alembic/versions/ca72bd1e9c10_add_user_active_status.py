"""add user active status

Revision ID: ca72bd1e9c10
Revises: ab83d9c2e108
Create Date: 2026-11-22
"""

from alembic import op
import sqlalchemy as sa


revision = "ca72bd1e9c10"
down_revision = "ab83d9c2e108"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("is_active", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_active")
