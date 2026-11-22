"""Add optional profile details and allow passwordless social accounts.

Revision ID: e5c2a19b7d30
Revises: d4f7a9c2b8e1
Create Date: 2026-11-11
"""

from alembic import op
import sqlalchemy as sa


revision = "e5c2a19b7d30"
down_revision = "d4f7a9c2b8e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_picture", sa.String(length=2048), nullable=True))
    op.add_column("users", sa.Column("address", sa.String(length=500), nullable=True))
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("password_hash", existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("password_hash", existing_type=sa.String(length=255), nullable=False)
    op.drop_column("users", "address")
    op.drop_column("users", "profile_picture")
