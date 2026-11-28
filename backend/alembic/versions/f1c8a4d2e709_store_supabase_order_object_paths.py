"""Store only the Supabase object path for order prescriptions.

Revision ID: f1c8a4d2e709
Revises: 885994e2b305
Create Date: 2026-11-28

"""

from typing import Sequence, Union
import os

from alembic import op
import sqlalchemy as sa

revision: str = "f1c8a4d2e709"
down_revision: Union[str, Sequence[str], None] = "885994e2b305"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove the legacy Supabase bucket wrapper from order image references."""
    connection = op.get_bind()
    orders = sa.table(
        "orders",
        sa.column("prescription_image", sa.String()),
    )
    references = connection.execute(
        sa.select(orders.c.prescription_image).where(
            orders.c.prescription_image.like("supabase://%")
        )
    ).scalars().all()

    for reference in references:
        bucket_and_path = reference.removeprefix("supabase://")
        bucket, separator, object_path = bucket_and_path.partition("/")
        if not separator or not bucket or not object_path:
            continue
        connection.execute(
            sa.update(orders)
            .where(orders.c.prescription_image == reference)
            .values(prescription_image=object_path)
        )


def downgrade() -> None:
    """Restore the legacy wrapper using the configured storage bucket."""
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "uploads").strip() or "uploads"
    connection = op.get_bind()
    orders = sa.table(
        "orders",
        sa.column("prescription_image", sa.String()),
    )
    object_paths = connection.execute(
        sa.select(orders.c.prescription_image).where(
            orders.c.prescription_image.is_not(None),
            ~orders.c.prescription_image.like("supabase://%"),
            ~orders.c.prescription_image.like("uploads/%"),
            ~orders.c.prescription_image.like("http://%"),
            ~orders.c.prescription_image.like("https://%"),
        )
    ).scalars().all()

    for object_path in object_paths:
        connection.execute(
            sa.update(orders)
            .where(orders.c.prescription_image == object_path)
            .values(
                prescription_image=(
                    f"supabase://{bucket}/{object_path}"
                )
            )
        )
