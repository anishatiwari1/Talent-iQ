"""phase 1: unique constraints + certifications, availability, employee_projects

Revision ID: f1a2b3c4d5e6
Revises: 5b17466bf5a7
Create Date: 2026-09-25 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '5b17466bf5a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # --- Fix missing uniqueness on existing join tables --------------
    # Prevents the same employee/skill (or project/skill) pair from
    # being inserted twice.
    op.create_unique_constraint(
        'uq_employee_skill', 'employee_skills', ['employee_id', 'skill_id']
    )
    op.create_unique_constraint(
        'uq_project_skill', 'project_skills', ['project_id', 'skill_id']
    )

    # --- New columns on existing tables -------------------------------
    op.add_column(
        'employee_skills',
        sa.Column('source', sa.String(length=30), nullable=False, server_default='MANUAL'),
    )
    op.add_column(
        'employee_skills',
        sa.Column('confidence', sa.Float(), nullable=True),
    )
    op.add_column(
        'project_skills',
        sa.Column('importance', sa.String(length=20), nullable=False, server_default='IMPORTANT'),
    )
    op.add_column(
        'projects',
        sa.Column('required_team_size', sa.Integer(), nullable=True),
    )

    # Drop server defaults now that existing rows are backfilled -- new
    # inserts should rely on the application/model default, not a
    # DB-level default that could mask a missing value going forward.
    op.alter_column('employee_skills', 'source', server_default=None)
    op.alter_column('project_skills', 'importance', server_default=None)

    # --- certifications -------------------------------------------------
    op.create_table(
        'certifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('issuer', sa.String(length=150), nullable=False),
        sa.Column('credential_id', sa.String(length=150), nullable=True),
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_certifications_id'), 'certifications', ['id'], unique=False)
    op.create_index(op.f('ix_certifications_employee_id'), 'certifications', ['employee_id'], unique=False)

    # --- availability -----------------------------------------------
    op.create_table(
        'availability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('weekly_capacity_hours', sa.Integer(), nullable=False),
        sa.Column('allocated_hours', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('available_from', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id', name='uq_availability_employee'),
    )
    op.create_index(op.f('ix_availability_id'), 'availability', ['id'], unique=False)
    op.create_index(op.f('ix_availability_employee_id'), 'availability', ['employee_id'], unique=False)

    # --- employee_projects -------------------------------------------
    op.create_table(
        'employee_projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('role_on_project', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('allocation_percentage', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id', 'project_id', name='uq_employee_project'),
    )
    op.create_index(op.f('ix_employee_projects_id'), 'employee_projects', ['id'], unique=False)
    op.create_index(op.f('ix_employee_projects_employee_id'), 'employee_projects', ['employee_id'], unique=False)
    op.create_index(op.f('ix_employee_projects_project_id'), 'employee_projects', ['project_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(op.f('ix_employee_projects_project_id'), table_name='employee_projects')
    op.drop_index(op.f('ix_employee_projects_employee_id'), table_name='employee_projects')
    op.drop_index(op.f('ix_employee_projects_id'), table_name='employee_projects')
    op.drop_table('employee_projects')

    op.drop_index(op.f('ix_availability_employee_id'), table_name='availability')
    op.drop_index(op.f('ix_availability_id'), table_name='availability')
    op.drop_table('availability')

    op.drop_index(op.f('ix_certifications_employee_id'), table_name='certifications')
    op.drop_index(op.f('ix_certifications_id'), table_name='certifications')
    op.drop_table('certifications')

    op.drop_column('projects', 'required_team_size')
    op.drop_column('project_skills', 'importance')
    op.drop_column('employee_skills', 'confidence')
    op.drop_column('employee_skills', 'source')

    op.drop_constraint('uq_project_skill', 'project_skills', type_='unique')
    op.drop_constraint('uq_employee_skill', 'employee_skills', type_='unique')
