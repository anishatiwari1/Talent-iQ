"""Add curated skill_relations, mirrored to Neo4j as RELATED_TO."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "skill_relations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("related_skill_id", sa.Integer(), nullable=False),
        sa.Column("relation_type", sa.String(length=30), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("skill_id < related_skill_id", name="ck_skill_relation_ordered"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("skill_id", "related_skill_id", name="uq_skill_relation"),
    )
    op.create_index("ix_skill_relations_id", "skill_relations", ["id"])
    op.create_index("ix_skill_relations_skill_id", "skill_relations", ["skill_id"])
    op.create_index("ix_skill_relations_related_skill_id", "skill_relations", ["related_skill_id"])


def downgrade() -> None:
    op.drop_index("ix_skill_relations_related_skill_id", table_name="skill_relations")
    op.drop_index("ix_skill_relations_skill_id", table_name="skill_relations")
    op.drop_index("ix_skill_relations_id", table_name="skill_relations")
    op.drop_table("skill_relations")
