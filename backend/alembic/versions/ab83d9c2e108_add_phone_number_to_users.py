"""Add optional user phone number."""

from alembic import op
import sqlalchemy as sa

revision = "ab83d9c2e108"
down_revision = "f6a3d9c2b810"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone_number")
