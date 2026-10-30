"""Public profile links/avatar on employees, certificate links on
certifications, and per-user settings preferences."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("linkedin_url", sa.String(length=300), nullable=True))
    op.add_column("employees", sa.Column("github_url", sa.String(length=300), nullable=True))
    op.add_column("employees", sa.Column("portfolio_url", sa.String(length=300), nullable=True))
    op.add_column("employees", sa.Column("location", sa.String(length=120), nullable=True))
    op.add_column("employees", sa.Column("avatar_path", sa.String(length=500), nullable=True))

    op.add_column("certifications", sa.Column("credential_url", sa.String(length=500), nullable=True))
    op.add_column("certifications", sa.Column("document_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_certifications_document_id",
        "certifications", "documents",
        ["document_id"], ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "users",
        sa.Column("preferences", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )


def downgrade() -> None:
    op.drop_column("users", "preferences")
    op.drop_constraint("fk_certifications_document_id", "certifications", type_="foreignkey")
    op.drop_column("certifications", "document_id")
    op.drop_column("certifications", "credential_url")
    op.drop_column("employees", "avatar_path")
    op.drop_column("employees", "location")
    op.drop_column("employees", "portfolio_url")
    op.drop_column("employees", "github_url")
    op.drop_column("employees", "linkedin_url")
