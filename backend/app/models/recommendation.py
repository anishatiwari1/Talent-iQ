from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Recommendation(Base):
    """A generated employee-to-project match, produced by the
    recommendation engine (Phase 7).

    Stored explicitly rather than computed on the fly so that every
    recommendation shown to a manager is reproducible, auditable, and
    explainable after the fact -- score and reasoning are frozen at
    generation time.
    """

    __tablename__ = "recommendations"

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

    # Overall match score, 0-100. Computed by the scoring service --
    # never hand-set.
    score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Structured breakdown of what fed the score: matched/missing
    # skills, experience match, semantic similarity, workload,
    # availability, etc. Kept as JSON so the explanation shown in the
    # UI is exactly what was computed, not reconstructed after the
    # fact.
    contributing_factors: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )

    # PENDING_REVIEW | REVIEWED | ACCEPTED | REJECTED
    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING_REVIEW",
        nullable=False,
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    employee = relationship("Employee", back_populates="recommendations")
    project = relationship("Project", back_populates="recommendations")
