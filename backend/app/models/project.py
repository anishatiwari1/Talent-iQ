from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="PLANNING",
        nullable=False
    )

    # Delivery progress, separate from status: status drives staffing
    # (PLANNING/ACTIVE/COMPLETED...), stage tracks where the work is.
    stage: Mapped[str] = mapped_column(
        String(30),
        default="REQUIREMENTS",
        nullable=False
    )

    # [{"stage", "entered_at", "changed_by"}, ...] oldest first.
    stage_history: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        default="MEDIUM",
        nullable=False
    )

    start_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    end_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Target team size for staffing (spec Section 3/7).
    required_team_size: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    project_skills = relationship(
        "ProjectSkill",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    employee_projects = relationship(
        "EmployeeProject",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    skill_gaps = relationship(
        "SkillGap",
        back_populates="project",
    )

    recommendations = relationship(
        "Recommendation",
        back_populates="project",
    )

    teams = relationship(
        "Team",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    assignments = relationship(
        "Assignment",
        back_populates="project",
    )