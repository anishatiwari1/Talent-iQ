from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Document(Base):
    """An uploaded employee document (resume, certificate, etc.).

    Tracks file metadata plus two independent status fields:
    - processing_status: did we successfully store/parse the raw file
    - extraction_status: did the NLP pipeline (Phase 4) finish pulling
      structured information (skills/experience) out of it

    Separating the two means a resume can be safely stored (processing
    complete) even if the NLP extraction step later fails or hasn't
    run yet.
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # RESUME | CERTIFICATE | OTHER
    document_type: Mapped[str] = mapped_column(
        String(30),
        default="RESUME",
        nullable=False,
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Storage path/key -- never a publicly reachable URL.
    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    mime_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # PENDING | PROCESSING | COMPLETED | FAILED
    processing_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
    )

    # NOT_STARTED | IN_PROGRESS | COMPLETED | FAILED
    extraction_status: Mapped[str] = mapped_column(
        String(30),
        default="NOT_STARTED",
        nullable=False,
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

    employee = relationship(
        "Employee",
        back_populates="documents",
    )

    extractions = relationship(
        "DocumentExtraction",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    expertise_areas = relationship(
        "EmployeeExpertise",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    resume_projects = relationship(
        "ResumeProject",
        back_populates="document",
        cascade="all, delete-orphan",
    )
