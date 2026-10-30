from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="EMPLOYEE"
    )

    oauth_provider: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )

    oauth_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Settings page values (notification toggles, defaults). Read
    # through settings_service so missing keys fall back to defaults.
    preferences: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
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

    employee = relationship(
    "Employee",
    back_populates="user",
    uselist=False
)

    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )