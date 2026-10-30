from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    employee_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    job_title: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    experience_years: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    bio: Mapped[Optional[str]] = mapped_column(
            Text,
            nullable=True
        )
    
    # Public profile links shown to managers wherever this employee
    # appears (directory, recommendations, teams).
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    github_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # Storage path of the uploaded profile photo -- served through
    # GET /api/v1/employees/{id}/avatar, never directly.
    avatar_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    availability_status: Mapped[str] = mapped_column(
        String(30),
        default="AVAILABLE",
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
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

    user = relationship(
        "User",
        back_populates="employee"
    )

    employee_skills = relationship(
    "EmployeeSkill",
    back_populates="employee",
    cascade="all, delete-orphan"
    )

    certifications = relationship(
        "Certification",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    availability = relationship(
        "Availability",
        back_populates="employee",
        uselist=False,
        cascade="all, delete-orphan",
    )

    employee_projects = relationship(
        "EmployeeProject",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    documents = relationship(
        "Document",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    skill_gaps = relationship(
        "SkillGap",
        back_populates="employee",
    )

    recommendations = relationship(
        "Recommendation",
        back_populates="employee",
    )

    team_memberships = relationship(
        "TeamMember",
        back_populates="employee",
    )

    assignments = relationship(
        "Assignment",
        back_populates="employee",
    )

    document_extractions = relationship(
        "DocumentExtraction",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    expertise_areas = relationship(
        "EmployeeExpertise",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    resume_projects = relationship(
        "ResumeProject",
        back_populates="employee",
        cascade="all, delete-orphan",
    )