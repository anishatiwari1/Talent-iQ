from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_manager
from app.database.postgres import get_db
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectOut,
    ProjectSkillOut,
    ProjectStaffingOut,
    ProjectStageUpdate,
    ProjectUpdate,
)
from app.services import employee_service, notification_service, project_service

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


def _serialize(project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        department=project.department,
        status=project.status,
        stage=project.stage,
        stage_history=project.stage_history or [],
        priority=project.priority,
        start_date=project.start_date,
        end_date=project.end_date,
        required_team_size=project.required_team_size,
        required_skills=[
            ProjectSkillOut(
                id=ps.id, skill_id=ps.skill_id, skill_name=ps.skill.name,
                required_proficiency=ps.required_proficiency, importance=ps.importance,
            )
            for ps in project.project_skills
        ],
        staffed_count=len([
            ep for ep in getattr(project, "employee_projects", [])
            if ep.status in ("PLANNED", "ACTIVE")
        ]),
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = project_service.list_projects(
        db, status=status_filter, department=department, priority=priority, search=search
    )
    return [_serialize(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude={"required_skills"})
    required_skills = [rs.model_dump() for rs in payload.required_skills]
    try:
        project = project_service.create_project(db, data, required_skills)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return _serialize(project)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    previous_status = project.status
    try:
        updated = project_service.update_project(db, project, payload.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if updated.status == "COMPLETED" and previous_status != "COMPLETED":
        # Delivery is what feeds each member's "successfully delivered
        # projects" count, and it frees their capacity.
        for employee in employee_service.complete_project_staffing(db, updated):
            notification_service.create_notification(
                db,
                user_id=employee.user_id,
                type="PROJECT_COMPLETED",
                title=f"{updated.name} was delivered",
                message=(
                    f"'{updated.name}' was marked completed by {current_user.full_name}. "
                    "It now counts toward your delivered projects."
                ),
                related_entity_type="project",
                related_entity_id=updated.id,
            )
        db.refresh(updated)
    return _serialize(updated)


@router.patch("/{project_id}/stage", response_model=ProjectOut)
def update_project_stage(
    project_id: int,
    payload: ProjectStageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Managers can move any project; an employee can move only a
    project they are currently staffed on (their own progress updates)."""
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    is_manager = current_user.role.upper() == "MANAGER"
    staffed = project_service.get_project_staffing(db, project)
    if not is_manager and not any(ep.employee.user_id == current_user.id for ep in staffed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only members staffed on this project can update its progress",
        )

    previous_stage = project.stage
    try:
        updated = project_service.set_project_stage(db, project, payload.stage, current_user.full_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if updated.stage != previous_stage:
        stage_label = updated.stage.capitalize()
        title = f"{updated.name} moved to {stage_label}"
        message = f"{current_user.full_name} moved '{updated.name}' from {previous_stage.capitalize()} to {stage_label}."
        # Whoever didn't make the change hears about it: managers when a
        # team member updates progress, the rest of the team either way.
        if not is_manager:
            notification_service.notify_managers(
                db, type="PROJECT_STAGE_CHANGED", title=title, message=message,
                related_entity_type="project", related_entity_id=updated.id,
            )
        for ep in staffed:
            if ep.employee.user_id != current_user.id:
                notification_service.create_notification(
                    db, user_id=ep.employee.user_id, type="PROJECT_STAGE_CHANGED",
                    title=title, message=message,
                    related_entity_type="project", related_entity_id=updated.id,
                )
    return _serialize(updated)


@router.post("/{project_id}/archive", response_model=ProjectOut)
def archive_project(
    project_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return _serialize(project_service.archive_project(db, project))


@router.get("/{project_id}/staffing", response_model=list[ProjectStaffingOut])
def get_project_staffing(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    staffing = project_service.get_project_staffing(db, project)
    return [
        ProjectStaffingOut(
            employee_id=ep.employee_id,
            employee_name=ep.employee.user.full_name,
            role_on_project=ep.role_on_project,
            status=ep.status,
            allocation_percentage=ep.allocation_percentage,
        )
        for ep in staffing
    ]
