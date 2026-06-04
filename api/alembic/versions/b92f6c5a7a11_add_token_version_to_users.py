"""add token version to users

Revision ID: b92f6c5a7a11
Revises: 8d4b6a3c1e2f
Create Date: 2026-04-23 00:00:01.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b92f6c5a7a11"
down_revision = "8d4b6a3c1e2f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = [column["name"] for column in sa.inspect(bind).get_columns("users")]
    if "token_version" not in columns:
        op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
    if bind.dialect.name != "sqlite":
        op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_version")
