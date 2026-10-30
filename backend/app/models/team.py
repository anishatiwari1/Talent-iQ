from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Team(Base):
    """A candidate or approved group of employees for a project,
    produced by the team-formation step (Phase 9).

    A project can have multiple Team rows over time (regenerated
    proposals); only one should ever reach status=APPROVED.
    """

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # DRAFT | RECOMMENDED | APPROVED | SUPERSEDED | REJECTED
    status: Mapped[str] = mapped_column(
        String(30),
        default="DRAFT",
        nullable=False,
    )

    # Aggregate skill-coverage percentage across required project
    # skills, computed by the team-formation service.
    skill_coverage_percentage: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    project = relationship("Project", back_populates="teams")

    members = relationship(
        "TeamMember",
        back_populates="team",
        cascade="all, delete-orphan",
    )

    skill_gaps = relationship("SkillGap", back_populates="team")

    assignments = relationship("Assignment", back_populates="team")


class TeamMember(Base):
    """One employee's membership within a proposed/approved Team."""

    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint(
            "team_id", "employee_id",
            name="uq_team_member",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role_on_team: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # This employee's individual match score within this team proposal.
    match_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    team = relationship("Team", back_populates="members")
    employee = relationship("Employee", back_populates="team_memberships")
