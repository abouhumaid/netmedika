"""add lifecycle order statuses

Revision ID: d4f7a9c2b8e1
Revises: c3e9a7f4d2b1, b92f6c5a7a11
Create Date: 2026-06-04 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d4f7a9c2b8e1"
down_revision: Union[str, Sequence[str], None] = ("c3e9a7f4d2b1", "b92f6c5a7a11")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for status in ("PROCESSING", "CANCELLED", "COMPLETED"):
            op.execute(f"ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS '{status}'")


def downgrade() -> None:
    # PostgreSQL enum labels cannot be removed without rebuilding the type.
    pass
