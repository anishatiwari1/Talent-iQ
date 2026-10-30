from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class SkillRelation(Base):
    """A curated, undirected relationship between two skills
    (e.g. FastAPI <-> Python), mirrored into Neo4j as RELATED_TO.

    Used only for explainable "related skill" suggestions -- never as
    evidence that a required skill is covered. Each pair is stored once
    with the lower skill id first, so (A, B) and (B, A) can't both exist.
    """

    __tablename__ = "skill_relations"
    __table_args__ = (
        UniqueConstraint("skill_id", "related_skill_id", name="uq_skill_relation"),
        CheckConstraint("skill_id < related_skill_id", name="ck_skill_relation_ordered"),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    related_skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # FRAMEWORK_OF | SAME_FAMILY | COMPLEMENTARY -- why the two are related,
    # shown to managers alongside every suggestion.
    relation_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    # CURATED is the only source today; kept so automated sources can be
    # told apart later.
    source: Mapped[str] = mapped_column(
        String(30),
        default="CURATED",
        nullable=False,
    )

    note: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    skill = relationship("Skill", foreign_keys=[skill_id])
    related_skill = relationship("Skill", foreign_keys=[related_skill_id])
