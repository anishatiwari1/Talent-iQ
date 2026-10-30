from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class SkillGap(Base):
    """A computed gap between required and available skill level.

    Exactly one of employee_id / project_id / team_id should be set,
    depending on whether this row represents an individual gap, a
    project-level gap, or a team-level gap (Phase 9/10 fill this).
    """

    __tablename__ = "skill_gaps"
    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(employee_id, project_id, team_id) = 1",
            name="ck_skill_gap_single_scope",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    team_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    current_level: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    required_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    gap: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # LOW | MEDIUM | HIGH
    severity: Mapped[str] = mapped_column(
        String(20),
        default="MEDIUM",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    employee = relationship("Employee", back_populates="skill_gaps")
    project = relationship("Project", back_populates="skill_gaps")
    team = relationship("Team", back_populates="skill_gaps")
    skill = relationship("Skill")
