from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Availability(Base):
    """Tracks an employee's working capacity.

    This is separate from Employee.availability_status (a quick-glance
    label) -- this table is the authoritative, backend-computed source
    for how many hours an employee has free, and is what the
    recommendation engine reads from in later phases.
    """

    __tablename__ = "availability"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Total hours per week this employee is contracted/expected to work.
    weekly_capacity_hours: Mapped[int] = mapped_column(
        Integer,
        default=40,
        nullable=False,
    )

    # Hours per week currently allocated across active project assignments.
    # Kept as a cached/denormalized value, recomputed whenever
    # EmployeeProject rows change (Phase 2/3 service logic), so reads
    # stay cheap.
    allocated_hours: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="AVAILABLE",
        nullable=False,
    )

    # If currently unavailable/at capacity, the date they free up.
    available_from: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Capacity is what the recommendation engine plans against, so an
    # employee cannot change it directly: they request a new value and
    # a manager approves (applies) or declines it.
    requested_capacity_hours: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    capacity_request_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    capacity_requested_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    employee = relationship(
        "Employee",
        back_populates="availability",
        uselist=False,
    )
