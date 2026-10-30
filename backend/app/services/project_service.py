"""Project CRUD + staffing (Phase 3)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.employee_project import EmployeeProject
from app.models.employee import Employee
from app.models.skill import Skill
from app.services.skill_service import get_or_create_skill


def create_project(db: Session, data: dict, required_skills: list[dict]) -> Project:
    project = Project(**data)
    project.stage = PROJECT_STAGES[0]
    project.stage_history = [{"stage": PROJECT_STAGES[0], "entered_at": datetime.utcnow().isoformat(), "changed_by": None}]
    db.add(project)
    db.flush()  # get project.id without committing yet

    for req in required_skills:
        skill = db.get(Skill, req["skill_id"])
        if not skill:
            raise ValueError(f"Skill id {req['skill_id']} does not exist")
        db.add(ProjectSkill(
            project_id=project.id,
            skill_id=req["skill_id"],
            required_proficiency=req.get("required_proficiency", 1),
            importance=req.get("importance", "IMPORTANT"),
        ))

    db.commit()
    db.refresh(project)
    return project


def get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    return project


def update_project(db: Session, project: Project, updates: dict) -> Project:
    if "required_skills" in updates:
        required_skills = updates.pop("required_skills")
        if required_skills is None:
            required_skills = []
        skill_ids = [req["skill_id"] for req in required_skills]
        if len(skill_ids) != len(set(skill_ids)):
            raise ValueError("A project cannot require the same skill more than once")

        for skill_id in skill_ids:
            if not db.get(Skill, skill_id):
                raise ValueError(f"Skill id {skill_id} does not exist")

        existing_by_skill = {row.skill_id: row for row in project.project_skills}
        requested_skill_ids = set(skill_ids)

        project.project_skills = [
            row for row in project.project_skills
            if row.skill_id in requested_skill_ids
        ]
        for req in required_skills:
            existing = existing_by_skill.get(req["skill_id"])
            if existing:
                existing.required_proficiency = req.get("required_proficiency", 1)
                existing.importance = req.get("importance", "IMPORTANT")
            else:
                project.project_skills.append(ProjectSkill(
                    skill_id=req["skill_id"],
                    required_proficiency=req.get("required_proficiency", 1),
                    importance=req.get("importance", "IMPORTANT"),
                ))

    for field, value in updates.items():
        if value is not None:
            setattr(project, field, value)
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


PROJECT_STAGES = ["REQUIREMENTS", "DESIGN", "DEVELOPMENT", "TESTING", "DEPLOYMENT"]


def set_project_stage(db: Session, project: Project, stage: str, changed_by: str) -> Project:
    """Moves a project to a delivery stage and records the move.
    Moving back is allowed (e.g. testing sends work back to development);
    every move is appended to the history, never rewritten."""
    stage = stage.upper()
    if stage not in PROJECT_STAGES:
        raise ValueError(f"Unknown stage '{stage}'. Expected one of: {', '.join(PROJECT_STAGES)}")
    if project.status in ("COMPLETED", "ARCHIVED"):
        raise ValueError(f"A {project.status.lower()} project's stage can no longer be changed")
    if stage == project.stage:
        return project

    project.stage = stage
    # Reassign (not append in place) so SQLAlchemy sees the JSON change.
    project.stage_history = [
        *(project.stage_history or []),
        {"stage": stage, "entered_at": datetime.utcnow().isoformat(), "changed_by": changed_by},
    ]
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


def archive_project(db: Session, project: Project) -> Project:
    project.status = "ARCHIVED"
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


def list_projects(
    db: Session,
    status: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
) -> list[Project]:
    stmt = select(Project).options(
        joinedload(Project.project_skills).joinedload(ProjectSkill.skill)
    )
    if status:
        stmt = stmt.where(Project.status == status)
    if department:
        stmt = stmt.where(Project.department == department)
    if priority:
        stmt = stmt.where(Project.priority == priority)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            (Project.name.ilike(like)) | (Project.description.ilike(like))
        )
    return db.scalars(stmt).unique().all()


def get_project_staffing(db: Session, project: Project) -> list[EmployeeProject]:
    return db.scalars(
        select(EmployeeProject)
        .options(joinedload(EmployeeProject.employee).joinedload(Employee.user))
        .where(
            EmployeeProject.project_id == project.id,
            EmployeeProject.status.in_(["PLANNED", "ACTIVE"]),
        )
    ).all()
