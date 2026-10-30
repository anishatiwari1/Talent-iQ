from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Notification(Base):
    """A real, persisted notification for a user (manager or employee).

    Replaces the frontend's static mock notification array. Notifications
    are targeted at a User (not an Employee) since managers -- who have
    no Employee row -- also receive them.
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # PROJECT_ASSIGNMENT | RECOMMENDATION_REVIEW | ASSIGNMENT_APPROVED |
    # ASSIGNMENT_CHANGED | WORKLOAD_WARNING | SKILL_GAP |
    # DOCUMENT_PROCESSED
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Loose polymorphic reference back to whatever triggered this
    # notification (e.g. related_entity_type="assignment",
    # related_entity_id=42), so the frontend can deep-link without
    # needing a table per notification type.
    related_entity_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    related_entity_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", back_populates="notifications")
