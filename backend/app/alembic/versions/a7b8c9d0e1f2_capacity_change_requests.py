"""Capacity change requests: an employee's requested weekly capacity
waits on availability until a manager approves or declines it."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("availability", sa.Column("requested_capacity_hours", sa.Integer(), nullable=True))
    op.add_column("availability", sa.Column("capacity_request_reason", sa.Text(), nullable=True))
    op.add_column("availability", sa.Column("capacity_requested_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("availability", "capacity_requested_at")
    op.drop_column("availability", "capacity_request_reason")
    op.drop_column("availability", "requested_capacity_hours")
