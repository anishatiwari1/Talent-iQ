from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Certification(Base):
    """A certification/credential earned by an employee.

    Distinct from Skill/EmployeeSkill: a certification is a verifiable,
    time-bound credential (e.g. 'AWS Certified Solutions Architect'),
    not a proficiency claim.
    """

    __tablename__ = "certifications"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    issuer: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    credential_id: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )

    issue_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    expiry_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    # Public verification link from the issuer (Credly, Coursera, ...).
    credential_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    # Uploaded certificate file backing this credential, if any.
    document_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    employee = relationship(
        "Employee",
        back_populates="certifications",
    )

    document = relationship("Document")
