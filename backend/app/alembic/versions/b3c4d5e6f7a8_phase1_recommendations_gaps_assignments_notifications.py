"""phase 1: recommendations, skill_gaps, assignments, notifications tables

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-09-25 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # --- recommendations ----------------------------------------------
    op.create_table(
        'recommendations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('contributing_factors', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_recommendations_id'), 'recommendations', ['id'], unique=False)
    op.create_index(op.f('ix_recommendations_employee_id'), 'recommendations', ['employee_id'], unique=False)
    op.create_index(op.f('ix_recommendations_project_id'), 'recommendations', ['project_id'], unique=False)

    # --- skill_gaps -----------------------------------------------------
    op.create_table(
        'skill_gaps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('team_id', sa.Integer(), nullable=True),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('current_level', sa.Integer(), nullable=True),
        sa.Column('required_level', sa.Integer(), nullable=False),
        sa.Column('gap', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            'num_nonnulls(employee_id, project_id, team_id) = 1',
            name='ck_skill_gap_single_scope',
        ),
    )
    op.create_index(op.f('ix_skill_gaps_id'), 'skill_gaps', ['id'], unique=False)
    op.create_index(op.f('ix_skill_gaps_employee_id'), 'skill_gaps', ['employee_id'], unique=False)
    op.create_index(op.f('ix_skill_gaps_project_id'), 'skill_gaps', ['project_id'], unique=False)
    op.create_index(op.f('ix_skill_gaps_team_id'), 'skill_gaps', ['team_id'], unique=False)
    op.create_index(op.f('ix_skill_gaps_skill_id'), 'skill_gaps', ['skill_id'], unique=False)

    # --- assignments ------------------------------------------------
    op.create_table(
        'assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=True),
        sa.Column('team_id', sa.Integer(), nullable=True),
        sa.Column('recommendation_id', sa.Integer(), nullable=True),
        sa.Column('approved_by_user_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recommendation_id'], ['recommendations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            'num_nonnulls(employee_id, team_id) = 1',
            name='ck_assignment_employee_or_team',
        ),
    )
    op.create_index(op.f('ix_assignments_id'), 'assignments', ['id'], unique=False)
    op.create_index(op.f('ix_assignments_project_id'), 'assignments', ['project_id'], unique=False)
    op.create_index(op.f('ix_assignments_employee_id'), 'assignments', ['employee_id'], unique=False)
    op.create_index(op.f('ix_assignments_team_id'), 'assignments', ['team_id'], unique=False)

    # --- notifications --------------------------------------------------
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('related_entity_type', sa.String(length=50), nullable=True),
        sa.Column('related_entity_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')

    op.drop_index(op.f('ix_assignments_team_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_employee_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_project_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_id'), table_name='assignments')
    op.drop_table('assignments')

    op.drop_index(op.f('ix_skill_gaps_skill_id'), table_name='skill_gaps')
    op.drop_index(op.f('ix_skill_gaps_team_id'), table_name='skill_gaps')
    op.drop_index(op.f('ix_skill_gaps_project_id'), table_name='skill_gaps')
    op.drop_index(op.f('ix_skill_gaps_employee_id'), table_name='skill_gaps')
    op.drop_index(op.f('ix_skill_gaps_id'), table_name='skill_gaps')
    op.drop_table('skill_gaps')

    op.drop_index(op.f('ix_recommendations_project_id'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_employee_id'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_id'), table_name='recommendations')
    op.drop_table('recommendations')
