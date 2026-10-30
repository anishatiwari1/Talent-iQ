from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import require_employee, require_manager, get_current_user
from app.database.postgres import get_db
from app.models.user import User
from app.schemas.document import DocumentOut, ExtractionResultOut
from app.services import document_service, employee_service, extraction_pipeline, notification_service

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])


def _get_own_employee(db: Session, user: User):
    employee = employee_service.get_employee_by_user_id(db, user.id)
    if not employee:
        employee = employee_service.ensure_employee_profile(db, user)
    return employee


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("RESUME"),
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    file_bytes = await file.read()
    try:
        document = document_service.save_document(
            db, employee, file.filename, file.content_type, file_bytes, document_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return DocumentOut.model_validate(document)


@router.get("", response_model=list[DocumentOut])
def list_my_documents(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return [DocumentOut.model_validate(d) for d in document_service.list_documents(db, employee)]


@router.post("/{document_id}/process", response_model=ExtractionResultOut)
def process_document(
    document_id: int,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """Triggers the Phase 4 NLP extraction pipeline on an already-
    uploaded document. Kept as an explicit, separate step (rather than
    running automatically on upload) so processing failures never block
    the upload itself, and so re-processing is always possible."""
    employee = _get_own_employee(db, current_user)
    try:
        document = document_service.get_document_or_404(db, document_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    if document.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your document")

    if document.document_type != "RESUME":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only resumes are processed for skills; certificates are stored as evidence.",
        )

    try:
        result = extraction_pipeline.process_document(db, document, employee)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document processing failed: {e}",
        )
    skills_found = result["skills_added_count"]
    notification_service.create_notification(
        db,
        user_id=current_user.id,
        type="DOCUMENT_PROCESSED",
        title="Resume processed",
        message=(
            f"'{document.file_name}' was processed: {skills_found} skill"
            f"{'' if skills_found == 1 else 's'} added or updated on your profile."
        ),
        related_entity_type="document",
        related_entity_id=document.id,
    )
    return ExtractionResultOut(**result)


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        document = document_service.get_document_or_404(db, document_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    owner_employee = employee_service.get_employee_by_user_id(db, current_user.id)
    is_owner = owner_employee is not None and owner_employee.id == document.employee_id
    is_manager = current_user.role.upper() == "MANAGER"
    if not (is_owner or is_manager):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return FileResponse(
        document.file_path,
        filename=document.file_name,
        media_type=document.mime_type or "application/octet-stream",
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        document = document_service.get_document_or_404(db, document_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    if document.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your document")
    document_service.delete_document(db, document)
