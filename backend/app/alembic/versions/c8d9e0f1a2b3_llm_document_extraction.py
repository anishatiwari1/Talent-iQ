"""Add versioned LLM extraction, employee expertise, and resume projects."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_extractions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=40), nullable=False),
        sa.Column("schema_version", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("validated_data", sa.JSON(), nullable=True),
        sa.Column("rejected_claims", sa.JSON(), nullable=False),
        sa.Column("persisted_data", sa.JSON(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_extractions_id", "document_extractions", ["id"])
    op.create_index("ix_document_extractions_document_id", "document_extractions", ["document_id"])
    op.create_index("ix_document_extractions_employee_id", "document_extractions", ["employee_id"])

    op.create_table(
        "employee_expertise",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_id", "name", name="uq_employee_expertise_name"),
    )
    op.create_index("ix_employee_expertise_id", "employee_expertise", ["id"])
    op.create_index("ix_employee_expertise_employee_id", "employee_expertise", ["employee_id"])
    op.create_index("ix_employee_expertise_document_id", "employee_expertise", ["document_id"])

    op.create_table(
        "resume_projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("technologies", sa.JSON(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "employee_id", "document_id", "name", name="uq_resume_project_document_name"
        ),
    )
    op.create_index("ix_resume_projects_id", "resume_projects", ["id"])
    op.create_index("ix_resume_projects_employee_id", "resume_projects", ["employee_id"])
    op.create_index("ix_resume_projects_document_id", "resume_projects", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_resume_projects_document_id", table_name="resume_projects")
    op.drop_index("ix_resume_projects_employee_id", table_name="resume_projects")
    op.drop_index("ix_resume_projects_id", table_name="resume_projects")
    op.drop_table("resume_projects")

    op.drop_index("ix_employee_expertise_document_id", table_name="employee_expertise")
    op.drop_index("ix_employee_expertise_employee_id", table_name="employee_expertise")
    op.drop_index("ix_employee_expertise_id", table_name="employee_expertise")
    op.drop_table("employee_expertise")

    op.drop_index("ix_document_extractions_employee_id", table_name="document_extractions")
    op.drop_index("ix_document_extractions_document_id", table_name="document_extractions")
    op.drop_index("ix_document_extractions_id", table_name="document_extractions")
    op.drop_table("document_extractions")