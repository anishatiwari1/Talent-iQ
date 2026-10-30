"""Employee profile, skills, certifications, availability and workload.

Phase 2 (employee self-service) and part of Phase 3 (manager directory
reads from the same functions).
"""
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.certification import Certification
from app.models.availability import Availability
from app.models.employee_project import EmployeeProject
from app.models.project import Project
from app.models.skill import Skill
from app.models.user import User
from app.models.document import Document
from app.models.employee_expertise import EmployeeExpertise
from app.models.project_skill import ProjectSkill
from app.models.resume_project import ResumeProject
from app.models.skill_relation import SkillRelation
from app.schemas.llm_extraction import LLMExtraction, PersistedExtractionSummary, RejectedClaim, SkillClaim
from app.services.skill_service import normalize_skill_name


def get_employee_by_user_id(db: Session, user_id: int) -> Optional[Employee]:
    return db.scalar(select(Employee).where(Employee.user_id == user_id))


def get_employee_or_404(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise ValueError("Employee not found")
    return employee


def ensure_employee_profile(db: Session, user: User) -> Employee:
    """Creates the Employee + Availability rows for a user who
    registered with role EMPLOYEE but has no profile row yet
    (e.g. seeded directly via the auth endpoints before Phase 2
    existed). Idempotent."""
    employee = get_employee_by_user_id(db, user.id)
    if employee:
        return employee

    code = f"EMP-{1000 + user.id}"
    employee = Employee(
        user_id=user.id,
        employee_code=code,
        department="Unassigned",
        job_title="Not set",
        experience_years=0,
        availability_status="AVAILABLE",
    )
    db.add(employee)
    db.flush()

    availability = Availability(
        employee_id=employee.id,
        weekly_capacity_hours=40,
        allocated_hours=0,
        status="AVAILABLE",
    )
    db.add(availability)
    db.commit()
    db.refresh(employee)
    return employee


PROFILE_LINK_FIELDS = ("linkedin_url", "github_url", "portfolio_url")


def normalize_url(value: Optional[str]) -> Optional[str]:
    """'linkedin.com/in/x' -> 'https://linkedin.com/in/x'; blank -> None."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if not value.lower().startswith(("http://", "https://")):
        value = f"https://{value}"
    if " " in value or "." not in value:
        raise ValueError(f"'{value}' is not a valid link")
    return value


def update_profile(db: Session, employee: Employee, updates: dict) -> Employee:
    for field, value in updates.items():
        if field in PROFILE_LINK_FIELDS:
            # Links may be cleared, so a blank value is applied as None.
            setattr(employee, field, normalize_url(value))
        elif field == "location":
            setattr(employee, field, (value or "").strip() or None)
        elif value is not None:
            setattr(employee, field, value)
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    return employee


def add_or_update_skill(
    db: Session,
    employee: Employee,
    skill_id: int,
    proficiency_level: Optional[int],
    years_of_experience: Optional[int],
    source: str = "MANUAL",
    confidence: Optional[float] = None,
    commit: bool = True,
) -> EmployeeSkill:
    existing = db.scalar(
        select(EmployeeSkill).where(
            EmployeeSkill.employee_id == employee.id,
            EmployeeSkill.skill_id == skill_id,
        )
    )
    if existing:
        source_priority = {
            "MANUAL": 100,
            "MANAGER_ASSIGNED": 100,
            "LLM_EXTRACTION": 50,
            "RESUME_EXTRACTION": 25,
        }
        if source_priority.get(source, 10) < source_priority.get(existing.source, 10):
            return existing
        if proficiency_level is not None:
            existing.proficiency_level = proficiency_level
        if years_of_experience is not None:
            existing.years_of_experience = years_of_experience
        existing.source = source
        if confidence is not None or source in {"MANUAL", "MANAGER_ASSIGNED", "LLM_EXTRACTION"}:
            existing.confidence = confidence
        if commit:
            db.commit()
            db.refresh(existing)
        return existing

    row = EmployeeSkill(
        employee_id=employee.id,
        skill_id=skill_id,
        proficiency_level=proficiency_level if proficiency_level is not None else 1,
        years_of_experience=years_of_experience if years_of_experience is not None else 0,
        source=source,
        confidence=confidence,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    return row


def persist_llm_extraction(
    db: Session,
    employee: Employee,
    document_id: int,
    extraction: LLMExtraction,
) -> PersistedExtractionSummary:
    skills_by_name = {claim.name.casefold(): claim for claim in extraction.skills}
    for experience in extraction.experience:
        key = experience.technology.casefold()
        current = skills_by_name.get(key)
        if current is None:
            current = SkillClaim(
                name=experience.technology,
                proficiency=None,
                years_of_experience=experience.years,
                evidence=experience.evidence,
            )
            skills_by_name[key] = current
        elif current.years_of_experience is None:
            skills_by_name[key] = current.model_copy(
                update={"years_of_experience": experience.years}
            )

    persisted = PersistedExtractionSummary()
    for claim in skills_by_name.values():
        canonical = normalize_skill_name(claim.name)
        skill = db.scalar(select(Skill).where(func.lower(Skill.name) == canonical.casefold()))
        if not skill:
            continue
        existing = db.scalar(
            select(EmployeeSkill).where(
                EmployeeSkill.employee_id == employee.id,
                EmployeeSkill.skill_id == skill.id,
            )
        )
        previous_source = existing.source if existing else None
        saved = add_or_update_skill(
            db,
            employee,
            skill_id=skill.id,
            proficiency_level=claim.proficiency,
            years_of_experience=claim.years_of_experience,
            source="LLM_EXTRACTION",
            confidence=None,
            commit=False,
        )
        if previous_source in {"MANUAL", "MANAGER_ASSIGNED"} and saved.source == previous_source:
            persisted.manual_skills_preserved.append(skill.name)
        else:
            persisted.skills.append(skill.name)

    for claim in extraction.certifications:
        if not claim.issuer:
            persisted.skipped.append(RejectedClaim(
                category="certification",
                name=claim.name,
                reason="issuer_required_by_existing_certification_schema",
                evidence=claim.evidence,
            ))
            continue
        existing = db.scalar(
            select(Certification).where(
                Certification.employee_id == employee.id,
                func.lower(Certification.name) == claim.name.casefold(),
                func.lower(Certification.issuer) == claim.issuer.casefold(),
            )
        )
        if existing:
            persisted.certifications.append(existing.name)
            continue
        db.add(Certification(
            employee_id=employee.id,
            name=claim.name,
            issuer=claim.issuer,
        ))
        persisted.certifications.append(claim.name)

    for claim in extraction.expertise_areas:
        existing = db.scalar(
            select(EmployeeExpertise).where(
                EmployeeExpertise.employee_id == employee.id,
                func.lower(EmployeeExpertise.name) == claim.name.casefold(),
            )
        )
        if existing:
            existing.document_id = document_id
            existing.evidence = claim.evidence
        else:
            db.add(EmployeeExpertise(
                employee_id=employee.id,
                document_id=document_id,
                name=claim.name,
                evidence=claim.evidence,
            ))
        persisted.expertise_areas.append(claim.name)

    for claim in extraction.projects:
        existing = db.scalar(
            select(ResumeProject).where(
                ResumeProject.employee_id == employee.id,
                ResumeProject.document_id == document_id,
                func.lower(ResumeProject.name) == claim.name.casefold(),
            )
        )
        if existing:
            existing.description = claim.description
            existing.technologies = claim.technologies
            existing.evidence = claim.evidence
        else:
            db.add(ResumeProject(
                employee_id=employee.id,
                document_id=document_id,
                name=claim.name,
                description=claim.description,
                technologies=claim.technologies,
                evidence=claim.evidence,
            ))
        persisted.projects.append(claim.name)

    db.commit()
    return persisted


def remove_skill(db: Session, employee: Employee, skill_id: int) -> None:
    row = db.scalar(
        select(EmployeeSkill).where(
            EmployeeSkill.employee_id == employee.id,
            EmployeeSkill.skill_id == skill_id,
        )
    )
    if not row:
        raise ValueError("Employee does not have this skill on record")
    db.delete(row)
    db.commit()


def _validate_certificate_document(db: Session, employee: Employee, document_id: Optional[int]) -> None:
    if document_id is None:
        return
    document = db.get(Document, document_id)
    if not document or document.employee_id != employee.id:
        raise ValueError("Certificate document not found")


def add_certification(db: Session, employee: Employee, data: dict) -> Certification:
    data = {**data, "credential_url": normalize_url(data.get("credential_url"))}
    _validate_certificate_document(db, employee, data.get("document_id"))
    cert = Certification(employee_id=employee.id, **data)
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


def link_certification_document(
    db: Session, employee: Employee, certification_id: int, document_id: Optional[int]
) -> Certification:
    cert = db.get(Certification, certification_id)
    if not cert or cert.employee_id != employee.id:
        raise ValueError("Certification not found")
    _validate_certificate_document(db, employee, document_id)
    cert.document_id = document_id
    db.commit()
    db.refresh(cert)
    return cert


def remove_certification(db: Session, employee: Employee, certification_id: int) -> None:
    cert = db.get(Certification, certification_id)
    if not cert or cert.employee_id != employee.id:
        raise ValueError("Certification not found")
    db.delete(cert)
    db.commit()


def get_or_create_availability(db: Session, employee: Employee) -> Availability:
    availability = db.scalar(
        select(Availability).where(Availability.employee_id == employee.id)
    )
    if availability:
        return availability
    availability = Availability(employee_id=employee.id)
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability


def get_availability_for_window(
    db: Session,
    employee_id: int,
    window_start: date,
    window_end: date,
) -> dict:
    """Return peak allocation and remaining capacity over an inclusive date window."""
    if window_end < window_start:
        raise ValueError("window_end must be on or after window_start")

    availability = db.scalar(
        select(Availability).where(Availability.employee_id == employee_id)
    )
    projects = db.scalars(
        select(EmployeeProject)
        .options(joinedload(EmployeeProject.project))
        .where(
            EmployeeProject.employee_id == employee_id,
            EmployeeProject.status == "ACTIVE",
        )
    ).all()

    stints = [
        (
            staffing.allocation_percentage,
            staffing.start_date or staffing.project.start_date,
            staffing.end_date or staffing.project.end_date,
        )
        for staffing in projects
        if staffing.status == "ACTIVE"
    ]
    return compute_window_availability(
        stints,
        availability.weekly_capacity_hours if availability else None,
        window_start,
        window_end,
    )


def compute_window_availability(
    stints: list[tuple[int, Optional[date], Optional[date]]],
    weekly_capacity_hours: Optional[int],
    window_start: date,
    window_end: date,
) -> dict:
    """Peak allocation and remaining capacity over an inclusive window,
    from plain data so any source (Postgres rows, graph records) gets the
    same answer. Each stint is (allocation_percentage, effective_start,
    effective_end) of an ACTIVE staffing; weekly_capacity_hours is None
    when the employee has no availability record."""
    if window_end < window_start:
        raise ValueError("window_end must be on or after window_start")

    window_exclusive_end = window_end + timedelta(days=1)
    breakpoints = {window_start, window_exclusive_end}
    changes: dict[date, float] = {}

    for allocation_percentage, effective_start, effective_end in stints:
        if effective_start and effective_end and effective_start > effective_end:
            continue
        if effective_start and effective_start > window_end:
            continue
        if effective_end and effective_end < window_start:
            continue

        overlap_start = max(window_start, effective_start) if effective_start else window_start
        overlap_end = min(window_end, effective_end) if effective_end else window_end
        if overlap_start > overlap_end:
            continue

        allocation = float(allocation_percentage)
        changes[overlap_start] = changes.get(overlap_start, 0.0) + allocation
        day_after_overlap = overlap_end + timedelta(days=1)
        changes[day_after_overlap] = changes.get(day_after_overlap, 0.0) - allocation
        breakpoints.add(overlap_start)
        breakpoints.add(day_after_overlap)

    ordered_breakpoints = sorted(breakpoints)
    timeline = []
    active_allocation = 0.0
    peak_allocation = 0.0

    for index, interval_start in enumerate(ordered_breakpoints[:-1]):
        active_allocation += changes.get(interval_start, 0.0)
        interval_end = ordered_breakpoints[index + 1] - timedelta(days=1)
        if interval_start > window_end or interval_end < window_start:
            continue
        timeline.append({
            "start": interval_start,
            "end": interval_end,
            "allocation": active_allocation,
        })
        peak_allocation = max(peak_allocation, active_allocation)

    data_quality = (
        "unknown"
        if weekly_capacity_hours is None or weekly_capacity_hours <= 0
        else "ok"
    )
    return {
        "peak_allocation": peak_allocation,
        "remaining_capacity": (
            None if data_quality == "unknown" else max(100.0 - peak_allocation, 0.0)
        ),
        "weekly_capacity_hours": weekly_capacity_hours if weekly_capacity_hours is not None else 0,
        "timeline": timeline,
        "data_quality": data_quality,
    }


UNAVAILABLE_THRESHOLD = 90


def availability_status_for_window(result: dict) -> str:
    if result["data_quality"] != "ok":
        return "UNKNOWN"
    # 90%+ leaves no practical room for new work, so it counts as
    # unavailable; "overloaded" is reserved for going past 100%.
    if result["peak_allocation"] >= UNAVAILABLE_THRESHOLD:
        return "UNAVAILABLE"
    if result["peak_allocation"] > 0:
        return "PARTIALLY_AVAILABLE"
    return "AVAILABLE"


def get_current_availability_snapshot(db: Session, employee_id: int) -> dict:
    """Build current availability values from staffing and capacity records."""
    today = date.today()
    result = get_availability_for_window(db, employee_id, today, today)
    utilization = (
        round(result["peak_allocation"], 1)
        if result["data_quality"] == "ok"
        else 0.0
    )
    capacity_hours = result["weekly_capacity_hours"]
    availability = db.scalar(
        select(Availability).where(Availability.employee_id == employee_id)
    )
    return {
        "weekly_capacity_hours": capacity_hours,
        "allocated_hours": round((utilization / 100) * capacity_hours),
        "status": availability_status_for_window(result),
        "utilization_percentage": utilization,
        "available_from": availability.available_from if availability else None,
        "notes": availability.notes if availability else None,
        "requested_capacity_hours": availability.requested_capacity_hours if availability else None,
        "capacity_request_reason": availability.capacity_request_reason if availability else None,
        "capacity_requested_at": availability.capacity_requested_at if availability else None,
    }


def recompute_allocated_hours(db: Session, employee: Employee) -> Availability:
    """Recomputes cached allocated_hours from active EmployeeProject
    rows. Called any time an assignment changes so Availability never
    drifts from the actual staffing facts."""
    availability = get_or_create_availability(db, employee)
    snapshot = get_current_availability_snapshot(db, employee.id)
    availability.allocated_hours = snapshot["allocated_hours"]
    availability.status = snapshot["status"]
    employee.availability_status = availability.status
    availability.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(availability)
    return availability


def get_project_history(db: Session, employee: Employee) -> list[EmployeeProject]:
    return db.scalars(
        select(EmployeeProject)
        .options(joinedload(EmployeeProject.project))
        .where(EmployeeProject.employee_id == employee.id)
        .order_by(EmployeeProject.start_date.desc().nulls_last())
    ).all()


def list_employees(
    db: Session,
    department: Optional[str] = None,
    skill_id: Optional[int] = None,
    min_proficiency: Optional[int] = None,
    max_utilization: Optional[float] = None,
    availability_status: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
) -> list[tuple[Employee, str, float]]:
    """Manager-facing filtered employee directory (Phase 3)."""
    stmt = (
        select(Employee)
        .join(User, Employee.user_id == User.id)
        .options(
            joinedload(Employee.user),
            joinedload(Employee.employee_skills).joinedload(EmployeeSkill.skill),
            joinedload(Employee.availability),
        )
        .where(Employee.is_active == True)  # noqa: E712
    )

    if department:
        stmt = stmt.where(Employee.department == department)

    if search:
        like = f"%{search.strip().lower()}%"
        # Skill names are searchable too ("React" finds React developers),
        # matching the placeholder in the global search bar.
        has_matching_skill = (
            select(EmployeeSkill.id)
            .join(Skill, Skill.id == EmployeeSkill.skill_id)
            .where(EmployeeSkill.employee_id == Employee.id, Skill.name.ilike(like))
            .exists()
        )
        stmt = stmt.where(
            (User.full_name.ilike(like))
            | (User.email.ilike(like))
            | (Employee.job_title.ilike(like))
            | (Employee.department.ilike(like))
            | (Employee.employee_code.ilike(like))
            | has_matching_skill
        )

    employees = db.scalars(stmt).unique().all()

    if skill_id is not None:
        employees = [
            e for e in employees
            if any(
                es.skill_id == skill_id
                and (min_proficiency is None or es.proficiency_level >= min_proficiency)
                for es in e.employee_skills
            )
        ]

    summaries = []
    for employee in employees:
        snapshot = get_current_availability_snapshot(db, employee.id)
        status = snapshot["status"]
        utilization = snapshot["utilization_percentage"]
        if availability_status and status != availability_status:
            continue
        if max_utilization is not None and utilization > max_utilization:
            continue
        summaries.append((employee, status, round(utilization, 1)))

    return sort_summaries(summaries, sort=sort, search=search, skill_id=skill_id)


def _search_relevance(employee: Employee, term: str) -> float:
    """How closely an employee matches a search term; higher is closer."""
    name = employee.user.full_name.casefold()
    score = 0.0
    if name == term:
        score = max(score, 100)
    elif name.startswith(term) or any(part.startswith(term) for part in name.split()):
        score = max(score, 85)
    elif term in name:
        score = max(score, 70)
    if term in employee.employee_code.casefold():
        score = max(score, 90 if employee.employee_code.casefold() == term else 65)
    for es in employee.employee_skills:
        skill_name = es.skill.name.casefold()
        if term == skill_name or term in skill_name:
            # Stronger, more experienced holders of the skill rank higher.
            score = max(score, 40 + es.proficiency_level * 8 + min(es.years_of_experience, 10))
    if term in employee.job_title.casefold():
        score = max(score, 45)
    if term in employee.department.casefold():
        score = max(score, 30)
    return score


def sort_summaries(
    summaries: list[tuple[Employee, str, float]],
    sort: Optional[str] = None,
    search: Optional[str] = None,
    skill_id: Optional[int] = None,
) -> list[tuple[Employee, str, float]]:
    """Orders directory results. 'relevance' (default) puts the closest
    match first: by search match, then by proficiency in the filtered
    skill, then by most free capacity."""
    sort = (sort or "relevance").lower()
    name_key = lambda row: row[0].user.full_name.casefold()  # noqa: E731

    if sort == "name":
        return sorted(summaries, key=name_key)
    if sort == "utilization":
        return sorted(summaries, key=lambda row: (row[2], name_key(row)))
    if sort == "experience":
        return sorted(summaries, key=lambda row: (-row[0].experience_years, name_key(row)))

    term = (search or "").strip().casefold()

    def skill_strength(employee: Employee) -> tuple[int, int]:
        match = next((es for es in employee.employee_skills if es.skill_id == skill_id), None)
        return (match.proficiency_level, match.years_of_experience) if match else (0, 0)

    def relevance_key(row):
        employee, _, utilization = row
        level, years = skill_strength(employee) if skill_id is not None else (0, 0)
        return (
            -(_search_relevance(employee, term) if term else 0),
            -level,
            -years,
            utilization,
            name_key(row),
        )

    return sorted(summaries, key=relevance_key)


def list_departments(db: Session) -> list[str]:
    return list(db.scalars(
        select(Employee.department)
        .where(Employee.is_active == True)  # noqa: E712
        .distinct()
        .order_by(Employee.department)
    ).all())


# ---------------- Profile photo ----------------

AVATAR_ROOT = Path(__file__).resolve().parent.parent / "storage" / "avatars"
AVATAR_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def save_avatar(db: Session, employee: Employee, filename: str, file_bytes: bytes) -> Employee:
    ext = Path(filename or "").suffix.lower()
    if ext not in AVATAR_EXTENSIONS:
        raise ValueError("Profile photos must be .png, .jpg, or .webp")
    if len(file_bytes) > MAX_AVATAR_BYTES:
        raise ValueError("Profile photos must be 2 MB or smaller")

    AVATAR_ROOT.mkdir(parents=True, exist_ok=True)
    stored_path = AVATAR_ROOT / f"{employee.id}-{uuid.uuid4().hex}{ext}"
    stored_path.write_bytes(file_bytes)

    previous = employee.avatar_path
    employee.avatar_path = str(stored_path)
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    if previous:
        Path(previous).unlink(missing_ok=True)
    return employee


def avatar_url(employee: Employee) -> Optional[str]:
    if not employee.avatar_path:
        return None
    version = int(employee.updated_at.timestamp()) if employee.updated_at else 0
    return f"/employees/{employee.id}/avatar?v={version}"


# ---------------- Delivered projects ----------------

def _is_delivered(staffing: EmployeeProject) -> bool:
    if staffing.status == "COMPLETED":
        return True
    return staffing.project.status == "COMPLETED" and staffing.status != "REMOVED"


def get_delivered_projects(db: Session, employee: Employee) -> list[EmployeeProject]:
    """Projects this employee saw through to completion -- the
    'successfully delivered' count shown on profiles and dashboards."""
    history = db.scalars(
        select(EmployeeProject)
        .options(
            joinedload(EmployeeProject.project)
            .joinedload(Project.project_skills)
            .joinedload(ProjectSkill.skill)
        )
        .where(EmployeeProject.employee_id == employee.id)
    ).unique().all()
    delivered = [ep for ep in history if _is_delivered(ep)]
    delivered.sort(
        key=lambda ep: ep.end_date or ep.project.end_date or date.min,
        reverse=True,
    )
    return delivered


def delivered_project_counts(db: Session, employee_ids: list[int]) -> dict[int, int]:
    if not employee_ids:
        return {}
    rows = db.execute(
        select(EmployeeProject.employee_id, func.count(EmployeeProject.id))
        .join(Project, Project.id == EmployeeProject.project_id)
        .where(
            EmployeeProject.employee_id.in_(employee_ids),
            (EmployeeProject.status == "COMPLETED")
            | ((Project.status == "COMPLETED") & (EmployeeProject.status != "REMOVED")),
        )
        .group_by(EmployeeProject.employee_id)
    ).all()
    return {employee_id: count for employee_id, count in rows}


def complete_project_staffing(db: Session, project: Project) -> list[Employee]:
    """Marks every current staffing row of a finished project COMPLETED
    and frees the employees' capacity. Returns the affected employees."""
    today = date.today()
    affected = []
    for staffing in project.employee_projects:
        if staffing.status in ("PLANNED", "ACTIVE"):
            staffing.status = "COMPLETED"
            if staffing.end_date is None or staffing.end_date > today:
                staffing.end_date = today
            affected.append(staffing.employee)
    db.commit()
    for employee in affected:
        recompute_allocated_hours(db, employee)
    return affected


# ---------------- Workload & capacity ----------------

def get_workload(db: Session, employee: Employee, weeks: int = 12) -> dict:
    """Current per-project allocation plus a week-by-week forecast of
    how loaded the employee will be, from the same staffing facts the
    recommendation engine reads."""
    snapshot = get_current_availability_snapshot(db, employee.id)
    capacity_hours = snapshot["weekly_capacity_hours"]
    today = date.today()

    staffing_rows = db.scalars(
        select(EmployeeProject)
        .options(joinedload(EmployeeProject.project))
        .where(
            EmployeeProject.employee_id == employee.id,
            EmployeeProject.status == "ACTIVE",
        )
    ).all()

    projects = []
    for staffing in staffing_rows:
        start = staffing.start_date or staffing.project.start_date
        end = staffing.end_date or staffing.project.end_date
        if end and end < today:
            continue
        projects.append({
            "project_id": staffing.project_id,
            "project_name": staffing.project.name,
            "role_on_project": staffing.role_on_project,
            "allocation_percentage": staffing.allocation_percentage,
            "weekly_hours": round(staffing.allocation_percentage / 100 * capacity_hours, 1),
            "start_date": start,
            "end_date": end,
            "is_current": start is None or start <= today,
        })
    projects.sort(key=lambda row: (not row["is_current"], row["start_date"] or date.min))

    week_start = today - timedelta(days=today.weekday())
    forecast = []
    next_free_week = None
    for index in range(weeks):
        start = week_start + timedelta(weeks=index)
        end = start + timedelta(days=6)
        result = get_availability_for_window(db, employee.id, start, end)
        allocation = round(result["peak_allocation"], 1)
        forecast.append({
            "week_start": start,
            "week_end": end,
            "allocation_percentage": allocation,
            "allocated_hours": round(allocation / 100 * capacity_hours, 1),
            "status": availability_status_for_window(result),
        })
        if next_free_week is None and allocation < 100:
            next_free_week = start

    utilization = snapshot["utilization_percentage"]
    if utilization > 100:
        health = "OVERLOADED"
    elif utilization >= 85:
        health = "AT_CAPACITY"
    elif utilization >= 40:
        health = "BALANCED"
    else:
        health = "UNDERUTILIZED"

    return {
        **snapshot,
        "free_hours": max(capacity_hours - snapshot["allocated_hours"], 0),
        "health": health,
        "projects": projects,
        "forecast": forecast,
        "next_available_week": next_free_week,
    }


# ---------------- Career development roadmap ----------------

IMPORTANCE_PRIORITY = {"MUST_HAVE": 3, "IMPORTANT": 2, "NICE_TO_HAVE": 1}


def get_development_roadmap(db: Session, employee: Employee) -> dict:
    """Skills this employee should grow next, ranked by how much open
    project demand they would unlock. Demand comes from PLANNING/ACTIVE
    project requirements; stretch suggestions come from curated skill
    relations to skills the employee already holds."""
    held = {es.skill_id: es for es in employee.employee_skills}

    open_requirements = db.scalars(
        select(ProjectSkill)
        .join(Project, Project.id == ProjectSkill.project_id)
        .options(joinedload(ProjectSkill.skill), joinedload(ProjectSkill.project))
        .where(Project.status.in_(["PLANNING", "ACTIVE"]))
    ).all()

    demand: dict[int, dict] = {}
    for requirement in open_requirements:
        entry = demand.setdefault(requirement.skill_id, {
            "skill": requirement.skill,
            "target_level": 0,
            "importance_score": 0,
            "projects": [],
        })
        entry["target_level"] = max(entry["target_level"], requirement.required_proficiency)
        entry["importance_score"] += IMPORTANCE_PRIORITY.get(requirement.importance, 2)
        entry["projects"].append({
            "project_id": requirement.project_id,
            "project_name": requirement.project.name,
            "required_level": requirement.required_proficiency,
            "importance": requirement.importance,
        })

    items = []
    for skill_id, entry in demand.items():
        current = held[skill_id].proficiency_level if skill_id in held else 0
        if current >= entry["target_level"]:
            continue
        gap = entry["target_level"] - current
        score = gap * 2 + entry["importance_score"]
        items.append({
            "skill_id": skill_id,
            "skill_name": entry["skill"].name,
            "category": entry["skill"].category,
            "current_level": current,
            "target_level": entry["target_level"],
            "gap": gap,
            "reason": "PROJECT_DEMAND",
            "demand_projects": entry["projects"],
            "priority_score": score,
        })

    # Stretch skills: related to something the employee is already good
    # at, not demanded by an open project, and not yet held.
    demanded_ids = set(demand)
    strong_ids = {sid for sid, es in held.items() if es.proficiency_level >= 3}
    if strong_ids:
        relations = db.scalars(
            select(SkillRelation).where(
                SkillRelation.skill_id.in_(strong_ids)
                | SkillRelation.related_skill_id.in_(strong_ids)
            )
        ).all()
        seen = set()
        for relation in relations:
            for anchor, other in (
                (relation.skill_id, relation.related_skill_id),
                (relation.related_skill_id, relation.skill_id),
            ):
                if anchor not in strong_ids or other in held or other in demanded_ids or other in seen:
                    continue
                seen.add(other)
                skill = db.get(Skill, other)
                anchor_skill = db.get(Skill, anchor)
                items.append({
                    "skill_id": other,
                    "skill_name": skill.name,
                    "category": skill.category,
                    "current_level": 0,
                    "target_level": 3,
                    "gap": 3,
                    "reason": "RELATED_SKILL",
                    "related_to": anchor_skill.name,
                    "relation_type": relation.relation_type,
                    "demand_projects": [],
                    "priority_score": 1,
                })

    items.sort(key=lambda item: (-item["priority_score"], item["skill_name"]))

    # Phase the plan so it reads as a roadmap rather than a flat list.
    for index, item in enumerate(items):
        if item["reason"] == "RELATED_SKILL":
            item["phase"] = "LATER"
        elif index < 3:
            item["phase"] = "NOW"
        elif index < 7:
            item["phase"] = "NEXT"
        else:
            item["phase"] = "LATER"
        item["estimated_weeks"] = item["gap"] * 3

    return {
        "employee_id": employee.id,
        "open_projects_considered": len({r.project_id for r in open_requirements}),
        "skills_held": len(held),
        "items": items,
    }
