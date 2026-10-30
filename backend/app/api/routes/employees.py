from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_employee, require_manager
from app.database.postgres import get_db
from app.models.user import User
from app.schemas.employee import (
    AvailabilityOut,
    AvailabilityUpdate,
    CapacityDecisionIn,
    CapacityRequestIn,
    CertificationIn,
    CertificationLinkDocument,
    CertificationOut,
    DeliveredProjectOut,
    EmployeeProfileOut,
    EmployeeProfileUpdate,
    EmployeeProjectHistoryOut,
    EmployeeExpertiseOut,
    EmployeeSkillIn,
    EmployeeSkillOut,
    EmployeeSummaryOut,
    ResumeProjectOut,
)
from app.services import employee_service, notification_service, settings_service

router = APIRouter(prefix="/api/v1/employees", tags=["Employees"])


def _serialize_certification(cert) -> CertificationOut:
    out = CertificationOut.model_validate(cert)
    out.document_file_name = cert.document.file_name if cert.document else None
    return out


def _serialize_delivered(ep) -> DeliveredProjectOut:
    return DeliveredProjectOut(
        project_id=ep.project_id,
        project_name=ep.project.name,
        description=ep.project.description,
        department=ep.project.department,
        role_on_project=ep.role_on_project,
        allocation_percentage=ep.allocation_percentage,
        start_date=ep.start_date or ep.project.start_date,
        end_date=ep.end_date or ep.project.end_date,
        technologies=[ps.skill.name for ps in ep.project.project_skills],
    )


def _serialize_profile(employee, db: Session, for_manager: bool = False) -> EmployeeProfileOut:
    availability_snapshot = employee_service.get_current_availability_snapshot(
        db, employee.id
    )
    delivered = employee_service.get_delivered_projects(db, employee)
    # Employees can hide their external links from managers in Settings.
    show_links = not for_manager or settings_service.get_preferences(employee.user)["show_profile_links"]
    return EmployeeProfileOut(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.user.full_name,
        email=employee.user.email,
        department=employee.department,
        job_title=employee.job_title,
        experience_years=employee.experience_years,
        bio=employee.bio,
        linkedin_url=employee.linkedin_url if show_links else None,
        github_url=employee.github_url if show_links else None,
        portfolio_url=employee.portfolio_url if show_links else None,
        location=employee.location,
        avatar_url=employee_service.avatar_url(employee),
        delivered_projects_count=len(delivered),
        delivered_projects=[_serialize_delivered(ep) for ep in delivered],
        active_projects_count=len([
            ep for ep in employee.employee_projects if ep.status in ("PLANNED", "ACTIVE")
        ]),
        member_since=employee.created_at,
        availability_status=availability_snapshot["status"],
        is_active=employee.is_active,
        skills=[EmployeeSkillOut.model_validate(es) for es in employee.employee_skills],
        certifications=[_serialize_certification(c) for c in employee.certifications],
        expertise_areas=[EmployeeExpertiseOut.model_validate(item) for item in employee.expertise_areas],
        resume_projects=[ResumeProjectOut.model_validate(item) for item in employee.resume_projects],
        availability=AvailabilityOut(**availability_snapshot),
    )


def _serialize_history(history) -> list[EmployeeProjectHistoryOut]:
    return [
        EmployeeProjectHistoryOut(
            id=ep.id,
            project_id=ep.project_id,
            project_name=ep.project.name,
            role_on_project=ep.role_on_project,
            status=ep.status,
            allocation_percentage=ep.allocation_percentage,
            start_date=ep.start_date,
            end_date=ep.end_date,
        )
        for ep in history
    ]


def _get_own_employee(db: Session, user: User):
    employee = employee_service.get_employee_by_user_id(db, user.id)
    if not employee:
        # Self-healing: a user with role EMPLOYEE should always have a
        # profile row; create one on first access rather than 404ing.
        employee = employee_service.ensure_employee_profile(db, user)
    return employee


@router.get("/me", response_model=EmployeeProfileOut)
def get_my_profile(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return _serialize_profile(employee, db)


@router.patch("/me", response_model=EmployeeProfileOut)
def update_my_profile(
    payload: EmployeeProfileUpdate,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        updated = employee_service.update_profile(
            db, employee, payload.model_dump(exclude_unset=True)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize_profile(updated, db)


@router.post("/me/avatar", response_model=EmployeeProfileOut)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    file_bytes = await file.read()
    try:
        updated = employee_service.save_avatar(db, employee, file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize_profile(updated, db)


@router.post("/me/skills", response_model=EmployeeSkillOut, status_code=status.HTTP_201_CREATED)
def add_my_skill(
    payload: EmployeeSkillIn,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        row = employee_service.add_or_update_skill(
            db, employee, payload.skill_id, payload.proficiency_level,
            payload.years_of_experience, source="MANUAL",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return EmployeeSkillOut.model_validate(row)


@router.delete("/me/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_skill(
    skill_id: int,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        employee_service.remove_skill(db, employee, skill_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/me/certifications", response_model=CertificationOut, status_code=status.HTTP_201_CREATED)
def add_my_certification(
    payload: CertificationIn,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        cert = employee_service.add_certification(db, employee, payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    notification_service.notify_managers(
        db,
        type="CERTIFICATION_ADDED",
        title=f"{current_user.full_name} added a certification",
        message=f"{cert.name} ({cert.issuer}) was added to {current_user.full_name}'s profile.",
        related_entity_type="employee",
        related_entity_id=employee.id,
    )
    return _serialize_certification(cert)


@router.patch("/me/certifications/{certification_id}/document", response_model=CertificationOut)
def link_my_certification_document(
    certification_id: int,
    payload: CertificationLinkDocument,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        cert = employee_service.link_certification_document(
            db, employee, certification_id, payload.document_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return _serialize_certification(cert)


@router.delete("/me/certifications/{certification_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_certification(
    certification_id: int,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    try:
        employee_service.remove_certification(db, employee, certification_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/me/availability", response_model=AvailabilityOut)
def get_my_availability(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return AvailabilityOut(**employee_service.get_current_availability_snapshot(db, employee.id))


@router.patch("/me/availability", response_model=AvailabilityOut)
def update_my_availability(
    payload: AvailabilityUpdate,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """Date and note only -- weekly capacity goes through a manager-
    approved capacity request (see /me/availability/capacity-request)."""
    employee = _get_own_employee(db, current_user)
    availability = employee_service.get_or_create_availability(db, employee)
    previous = (availability.notes, availability.available_from)
    updates = payload.model_dump(exclude_unset=True)
    # Date and notes may be cleared, so None is applied as-is.
    if "available_from" in updates:
        availability.available_from = updates["available_from"]
    if "notes" in updates:
        availability.notes = (updates["notes"] or "").strip() or None
    db.commit()
    employee_service.recompute_allocated_hours(db, employee)

    # Managers see the note on the employee's profile; tell them it changed.
    if (availability.notes, availability.available_from) != previous:
        details = [f"Weekly capacity: {availability.weekly_capacity_hours} h"]
        if availability.available_from:
            details.append(f"available from {availability.available_from:%d %b %Y}")
        if availability.notes:
            details.append(f'note: "{availability.notes}"')
        notification_service.notify_managers(
            db,
            type="AVAILABILITY_UPDATED",
            title=f"{current_user.full_name} updated their availability",
            message="; ".join(details) + ".",
            related_entity_type="employee",
            related_entity_id=employee.id,
        )
    return AvailabilityOut(**employee_service.get_current_availability_snapshot(db, employee.id))


@router.post("/me/availability/capacity-request", response_model=AvailabilityOut)
def request_capacity_change(
    payload: CapacityRequestIn,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    availability = employee_service.get_or_create_availability(db, employee)
    if payload.requested_capacity_hours == availability.weekly_capacity_hours:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Your weekly capacity is already {availability.weekly_capacity_hours} h",
        )
    availability.requested_capacity_hours = payload.requested_capacity_hours
    availability.capacity_request_reason = payload.reason.strip()
    availability.capacity_requested_at = datetime.utcnow()
    db.commit()
    notification_service.notify_managers(
        db,
        type="CAPACITY_REQUEST",
        title=f"{current_user.full_name} requested a capacity change",
        message=(
            f"{availability.weekly_capacity_hours} h -> {payload.requested_capacity_hours} h per week. "
            f'Reason: "{availability.capacity_request_reason}". Review it on their profile.'
        ),
        related_entity_type="employee",
        related_entity_id=employee.id,
    )
    return AvailabilityOut(**employee_service.get_current_availability_snapshot(db, employee.id))


@router.delete("/me/availability/capacity-request", response_model=AvailabilityOut)
def withdraw_capacity_request(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    availability = employee_service.get_or_create_availability(db, employee)
    _clear_capacity_request(availability)
    db.commit()
    return AvailabilityOut(**employee_service.get_current_availability_snapshot(db, employee.id))


def _clear_capacity_request(availability) -> None:
    availability.requested_capacity_hours = None
    availability.capacity_request_reason = None
    availability.capacity_requested_at = None


@router.post("/{employee_id}/capacity-request/decision", response_model=AvailabilityOut)
def decide_capacity_request(
    employee_id: int,
    payload: CapacityDecisionIn,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        employee = employee_service.get_employee_or_404(db, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    availability = employee_service.get_or_create_availability(db, employee)
    requested = availability.requested_capacity_hours
    if requested is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="There is no pending capacity request")

    action = payload.action.upper()
    if action not in ("APPROVE", "REJECT"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="action must be APPROVE or REJECT")
    previous_hours = availability.weekly_capacity_hours
    if action == "APPROVE":
        availability.weekly_capacity_hours = requested
    _clear_capacity_request(availability)
    db.commit()
    employee_service.recompute_allocated_hours(db, employee)

    note = (payload.note or "").strip()
    if action == "APPROVE":
        title = f"Capacity change approved: {requested} h per week"
        message = f"{current_user.full_name} approved your change from {previous_hours} h to {requested} h per week."
    else:
        title = "Capacity change declined"
        message = f"{current_user.full_name} declined your request for {requested} h per week; it stays at {previous_hours} h."
    if note:
        message += f' Note: "{note}"'
    notification_service.create_notification(
        db,
        user_id=employee.user_id,
        type="CAPACITY_DECISION",
        title=title,
        message=message,
        related_entity_type="employee",
        related_entity_id=employee.id,
    )
    return AvailabilityOut(**employee_service.get_current_availability_snapshot(db, employee.id))


@router.get("/me/workload")
def get_my_workload(
    weeks: int = 12,
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return employee_service.get_workload(db, employee, weeks=max(1, min(weeks, 26)))


@router.get("/me/development")
def get_my_development_roadmap(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return employee_service.get_development_roadmap(db, employee)


@router.get("/me/projects", response_model=list[EmployeeProjectHistoryOut])
def get_my_project_history(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return _serialize_history(employee_service.get_project_history(db, employee))


@router.get("/me/delivered-projects", response_model=list[DeliveredProjectOut])
def get_my_delivered_projects(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = _get_own_employee(db, current_user)
    return [_serialize_delivered(ep) for ep in employee_service.get_delivered_projects(db, employee)]


# ---------------- Manager-facing directory (Phase 3) ----------------

@router.get("", response_model=list[EmployeeSummaryOut])
def list_employees(
    department: Optional[str] = None,
    skill_id: Optional[int] = None,
    min_proficiency: Optional[int] = None,
    max_utilization: Optional[float] = None,
    availability_status: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    employee_summaries = employee_service.list_employees(
        db,
        department=department,
        skill_id=skill_id,
        min_proficiency=min_proficiency,
        max_utilization=max_utilization,
        availability_status=availability_status,
        search=search,
        sort=None if sort == "delivered" else sort,
    )
    delivered_counts = employee_service.delivered_project_counts(
        db, [e.id for e, _, _ in employee_summaries]
    )
    if sort == "delivered":
        employee_summaries.sort(
            key=lambda row: (-delivered_counts.get(row[0].id, 0), row[0].user.full_name.casefold())
        )
    return [
        EmployeeSummaryOut(
            id=e.id,
            employee_code=e.employee_code,
            full_name=e.user.full_name,
            department=e.department,
            job_title=e.job_title,
            experience_years=e.experience_years,
            availability_status=availability_status,
            utilization_percentage=utilization_percentage,
            skill_names=[es.skill.name for es in e.employee_skills],
            avatar_url=employee_service.avatar_url(e),
            delivered_projects_count=delivered_counts.get(e.id, 0),
            availability_note=e.availability.notes if e.availability else None,
            available_from=e.availability.available_from if e.availability else None,
        )
        for e, availability_status, utilization_percentage in employee_summaries
    ]


@router.get("/departments", response_model=list[str])
def list_departments(
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return employee_service.list_departments(db)


@router.get("/{employee_id}/avatar")
def get_employee_avatar(
    employee_id: int,
    db: Session = Depends(get_db),
):
    # Public on purpose: <img> tags can't send the bearer token, and a
    # profile photo is not sensitive. The stored path is never exposed.
    try:
        employee = employee_service.get_employee_or_404(db, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    if not employee.avatar_path or not Path(employee.avatar_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile photo")
    return FileResponse(employee.avatar_path)


@router.get("/{employee_id}", response_model=EmployeeProfileOut)
def get_employee_profile(
    employee_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        employee = employee_service.get_employee_or_404(db, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return _serialize_profile(employee, db, for_manager=True)


@router.get("/{employee_id}/projects", response_model=list[EmployeeProjectHistoryOut])
def get_employee_project_history(
    employee_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        employee = employee_service.get_employee_or_404(db, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return _serialize_history(employee_service.get_project_history(db, employee))
