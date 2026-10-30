from datetime import datetime

from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "skill_id",
            name="uq_employee_skill",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id"),
        nullable=False
    )

    proficiency_level: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False
    )

    years_of_experience: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    # MANUAL | RESUME_EXTRACTION | MANAGER_ASSIGNED
    # -- lets the UI/recommendation engine distinguish self-reported
    # skills from ones the NLP pipeline (Phase 4) extracted.
    source: Mapped[str] = mapped_column(
        String(30),
        default="MANUAL",
        nullable=False,
    )

    # 0.0-1.0 confidence score, only meaningful when source is an
    # automated extraction. Null for manually entered skills.
    confidence: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    employee = relationship(
        "Employee",
        back_populates="employee_skills"
    )

    skill = relationship(
        "Skill",
        back_populates="employee_skills"
    )