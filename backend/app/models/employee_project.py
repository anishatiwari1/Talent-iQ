from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class EmployeeProject(Base):
    """Links an employee to a project they are (or were) staffed on.

    This is the record that workload/utilization is computed from, and
    it's separate from Assignment: EmployeeProject is the staffing fact
    (who is on the project and at what allocation), while Assignment is
    the approval/audit trail of how they got there.
    """

    __tablename__ = "employee_projects"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "project_id",
            name="uq_employee_project",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role_on_project: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # PLANNED | ACTIVE | COMPLETED | REMOVED
    status: Mapped[str] = mapped_column(
        String(30),
        default="PLANNED",
        nullable=False,
    )

    # % of this employee's total capacity dedicated to this project.
    allocation_percentage: Mapped[int] = mapped_column(
        Integer,
        default=100,
        nullable=False,
    )

    start_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    end_date: Mapped[Optional[date]] = mapped_column(
        Date,
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

    employee = relationship(
        "Employee",
        back_populates="employee_projects",
    )

    project = relationship(
        "Project",
        back_populates="employee_projects",
    )
