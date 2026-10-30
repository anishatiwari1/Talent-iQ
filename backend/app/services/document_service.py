"""Document upload + storage handling (Phase 4, step 1 of 2).

Files are written to a non-web-served directory
(`backend/app/storage/documents/<employee_id>/...`) and never exposed
by a public route -- retrieval always goes through
`GET /api/v1/documents/{id}/download`, which checks that the
requesting user owns the document (or is a manager) before streaming
bytes back.
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.employee import Employee

STORAGE_ROOT = Path(__file__).resolve().parent.parent / "storage" / "documents"

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "text/plain",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_upload(filename: str, content_type: Optional[str], size: int) -> None:
    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError("File exceeds the 10 MB upload limit")
    ext = Path(filename).suffix.lower()
    if ext not in {".pdf", ".docx", ".txt"}:
        raise ValueError("Only .pdf, .docx, and .txt files are accepted")


def save_document(
    db: Session,
    employee: Employee,
    filename: str,
    content_type: Optional[str],
    file_bytes: bytes,
    document_type: str = "RESUME",
) -> Document:
    validate_upload(filename, content_type, len(file_bytes))

    employee_dir = STORAGE_ROOT / str(employee.id)
    employee_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(filename).suffix.lower()
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = employee_dir / stored_name

    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    document = Document(
        employee_id=employee.id,
        document_type=document_type,
        file_name=filename,
        file_path=str(stored_path),
        file_size_bytes=len(file_bytes),
        mime_type=content_type,
        processing_status="COMPLETED",
        # Certificates are stored as evidence only -- they never go
        # through skill extraction, so they shouldn't read "not started".
        extraction_status="NOT_STARTED" if document_type == "RESUME" else "NOT_REQUIRED",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def get_document_or_404(db: Session, document_id: int) -> Document:
    document = db.get(Document, document_id)
    if not document:
        raise ValueError("Document not found")
    return document


def list_documents(db: Session, employee: Employee) -> list[Document]:
    return db.scalars(
        select(Document)
        .where(Document.employee_id == employee.id)
        .order_by(Document.uploaded_at.desc())
    ).all()


def delete_document(db: Session, document: Document) -> None:
    try:
        os.remove(document.file_path)
    except FileNotFoundError:
        pass
    db.delete(document)
    db.commit()


def read_document_text(document: Document) -> str:
    """Extracts raw text from the stored file. Uses lightweight,
    dependency-light readers so the pipeline works even before
    optional NLP packages (spaCy, python-docx, pypdf) are installed --
    falls back gracefully if a parser library is missing."""
    path = Path(document.file_path)
    ext = path.suffix.lower()

    if ext == ".txt":
        return path.read_text(errors="ignore")

    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            raise RuntimeError(
                "pypdf is not installed -- run `pip install pypdf` to enable "
                "PDF text extraction."
            )

    if ext == ".docx":
        try:
            import docx
            doc = docx.Document(str(path))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            raise RuntimeError(
                "python-docx is not installed -- run `pip install python-docx` "
                "to enable .docx text extraction."
            )

    raise ValueError(f"Unsupported file type: {ext}")
