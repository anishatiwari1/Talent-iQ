from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Assignment(Base):
    """The approval/audit record for staffing an employee (or an
    entire team) onto a project.

    This is deliberately separate from EmployeeProject: EmployeeProject
    is "who is actually on the project right now" (read by workload
    calculations), while Assignment is "who approved this and when"
    (the audit trail required before EmployeeProject rows are created
    or changed). A Recommendation never becomes an EmployeeProject
    directly -- it always passes through an Assignment approval first.
    """

    __tablename__ = "assignments"
    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(employee_id, team_id) = 1",
            name="ck_assignment_employee_or_team",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Set for an individual assignment.
    employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Set for a whole-team assignment (Phase 9 approval flow).
    team_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Recommendation this assignment originated from, if any --
    # nullable because a manager can assign someone manually without
    # going through a recommendation.
    recommendation_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recommendations.id", ondelete="SET NULL"),
        nullable=True,
    )

    approved_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # PENDING | APPROVED | REJECTED | ACTIVE | COMPLETED
    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
    )

    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    project = relationship("Project", back_populates="assignments")
    employee = relationship("Employee", back_populates="assignments")
    team = relationship("Team", back_populates="assignments")
    approved_by = relationship("User")
    recommendation = relationship("Recommendation")
