from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ProjectSkill(Base):
    __tablename__ = "project_skills"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "skill_id",
            name="uq_project_skill",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"),
        nullable=False
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id"),
        nullable=False
    )

    required_proficiency: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False
    )

    # MUST_HAVE | IMPORTANT | NICE_TO_HAVE -- feeds directly into the
    # recommendation engine's weighting (Phase 7).
    importance: Mapped[str] = mapped_column(
        String(20),
        default="IMPORTANT",
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    project = relationship(
        "Project",
        back_populates="project_skills"
    )

    skill = relationship(
        "Skill",
        back_populates="project_skills"
    )