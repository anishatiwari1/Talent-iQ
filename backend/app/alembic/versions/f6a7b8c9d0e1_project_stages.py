"""Delivery stage tracking on projects: the current stage plus a
history of when each stage was entered and by whom."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("stage", sa.String(length=30), nullable=False, server_default="REQUIREMENTS"),
    )
    op.add_column(
        "projects",
        sa.Column("stage_history", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade() -> None:
    op.drop_column("projects", "stage_history")
    op.drop_column("projects", "stage")
