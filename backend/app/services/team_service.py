"""Balanced team formation (Phase 9).

Deliberately NOT "take the top N individual scores" -- that can staff
five Python experts and cover zero of the project's React/DevOps
requirements. Instead this runs a greedy set-cover: repeatedly pick
the candidate who closes the most currently-uncovered, importance-
weighted requirement, breaking ties on individual score, until the
team reaches required_team_size or requirements are fully covered.
"""
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.assignment import Assignment
from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.project import Project
from app.models.team import Team, TeamMember
from app.services.recommendation_service import (
    IMPORTANCE_WEIGHT,
    available_capacity_percentage,
    capacity_for_project,
    get_project_availability,
    score_employee_for_project,
)

logger = logging.getLogger("talentiq.teams")


def _editable_team(db: Session, team: Team) -> Team:
    if team.status == "RECOMMENDED":
        return team
    if team.status != "APPROVED":
        raise ValueError("Only a recommended team can be edited")

    proposal = Team(
        project_id=team.project_id,
        status="RECOMMENDED",
        skill_coverage_percentage=team.skill_coverage_percentage,
        created_at=datetime.utcnow(),
    )
    db.add(proposal)
    db.flush()

    for member in team.members:
        db.add(TeamMember(
            team_id=proposal.id,
            employee_id=member.employee_id,
            role_on_team=member.role_on_team,
            match_score=member.match_score,
        ))
    db.flush()
    return proposal


def form_team(db: Session, project: Project, team_size: int) -> Team:
    if team_size < 1:
        raise ValueError("Team size must be at least one")
    if project.required_team_size and team_size > project.required_team_size:
        raise ValueError("Team size cannot exceed the project's required team size")

    required_skills = list(project.project_skills)
    required_skill_ids = {ps.skill_id: ps for ps in required_skills}
    total_weight = sum(IMPORTANCE_WEIGHT.get(ps.importance, 2) for ps in required_skills) or 1

    candidates = db.scalars(
        select(Employee)
        .options(
            joinedload(Employee.employee_skills).joinedload(EmployeeSkill.skill),
            joinedload(Employee.availability),
        )
        .where(Employee.is_active == True)  # noqa: E712
    ).unique().all()
    eligible_candidates = []
    for candidate in candidates:
        availability = get_project_availability(db, candidate, project)
        if availability["data_quality"] != "ok":
            continue
        if available_capacity_percentage(db, candidate, project, availability) > 0:
            eligible_candidates.append(candidate)
    candidates = eligible_candidates

    # Precompute each candidate's individual score once.
    scored = {}
    for c in candidates:
        availability = get_project_availability(db, c, project)
        result = score_employee_for_project(db, c, project, availability)
        scored[c.id] = {"employee": c, **result}

    covered_skill_ids: set[int] = set()
    selected: list[dict] = []
    remaining = {c.id: scored[c.id] for c in candidates}

    while len(selected) < team_size and remaining:

        best_id, best_gain, best_new_skills = None, -1.0, set()

        for emp_id, data in remaining.items():
            employee_skill_ids = {es.skill_id for es in data["employee"].employee_skills}
            newly_covered = (employee_skill_ids & required_skill_ids.keys()) - covered_skill_ids
            gain = sum(
                IMPORTANCE_WEIGHT.get(required_skill_ids[sid].importance, 2)
                for sid in newly_covered
            )
            # Tie-break on individual score so among equal coverage gain
            # we still prefer the stronger overall candidate.
            comparable = gain + (data["score"] / 1000)
            if comparable > best_gain:
                best_gain, best_id, best_new_skills = comparable, emp_id, newly_covered

        if best_id is None:
            break

        selected.append(remaining.pop(best_id))
        covered_skill_ids |= best_new_skills
        

    coverage_pct = round(
        sum(IMPORTANCE_WEIGHT.get(required_skill_ids[sid].importance, 2) for sid in covered_skill_ids)
        / total_weight * 100, 1
    ) if required_skill_ids else 100.0

    team = Team(
        project_id=project.id,
        status="RECOMMENDED",
        skill_coverage_percentage=coverage_pct,
        created_at=datetime.utcnow(),
    )
    db.add(team)
    db.flush()

    for data in selected:
        db.add(TeamMember(
            team_id=team.id,
            employee_id=data["employee"].id,
            role_on_team=data["employee"].job_title,
            match_score=data["score"],
        ))

    db.commit()
    db.refresh(team)

    logger.info(
        "team_formed project_id=%s team_id=%s members=%d coverage=%.1f%%",
        project.id, team.id, len(selected), coverage_pct,
    )

    return team


def get_approved_team(db: Session, project: Project) -> Optional[Team]:
    """The project's current approved team: the APPROVED team with the
    most recent approval Assignment, falling back to the most recently
    updated APPROVED team. None when the project has no approved team."""
    approved_teams = {
        team.id: team for team in project.teams if team.status == "APPROVED"
    }
    if not approved_teams:
        return None
    approvals = db.scalars(
        select(Assignment)
        .where(
            Assignment.project_id == project.id,
            Assignment.team_id.in_(approved_teams),
            Assignment.status == "APPROVED",
        )
        .order_by(
            Assignment.approved_at.desc().nullslast(),
            Assignment.created_at.desc(),
            Assignment.id.desc(),
        )
    ).all()
    team = next(
        (approved_teams[approval.team_id] for approval in approvals),
        None,
    )
    if team is None:
        team = max(
            approved_teams.values(),
            key=lambda approved: (
                approved.updated_at or approved.created_at,
                approved.id,
            ),
        )
    return team


def get_remaining_gaps(project: Project, team: Team) -> list[str]:
    covered_skill_ids = set()
    for member in team.members:
        employee_skill_ids = {es.skill_id for es in member.employee.employee_skills}
        covered_skill_ids |= employee_skill_ids
    return [
        ps.skill.name for ps in project.project_skills
        if ps.skill_id not in covered_skill_ids
    ]


def get_capacity_unknown_candidates(db: Session, project: Project) -> list[str]:
    employees = db.scalars(
        select(Employee)
        .options(joinedload(Employee.availability), joinedload(Employee.user))
        .where(Employee.is_active == True)  # noqa: E712
    ).unique().all()
    return [
        employee.user.full_name
        for employee in employees
        if get_project_availability(db, employee, project)["data_quality"] == "unknown"
    ]


def regenerate_team(db: Session, project: Project, team_size: int) -> Team:
    """Creates a fresh Team proposal (old ones remain for history)."""
    return form_team(db, project, team_size)


def replace_member(db: Session, team: Team, old_employee_id: int, new_employee_id: int, project: Project) -> Team:
    member = next((m for m in team.members if m.employee_id == old_employee_id), None)
    if not member:
        raise ValueError("Employee is not currently on this team")
    if any(m.employee_id == new_employee_id for m in team.members):
        raise ValueError("Employee is already on this team")

    employee = db.get(Employee, new_employee_id)
    if not employee:
        raise ValueError("Employee not found")

    availability = get_project_availability(db, employee, project)
    _require_capacity(db, employee, project)

    result = score_employee_for_project(db, employee, project, availability)
    editable_team = _editable_team(db, team)
    editable_member = next(
        m for m in editable_team.members if m.employee_id == old_employee_id
    )
    editable_member.employee_id = new_employee_id
    editable_member.role_on_team = employee.job_title
    editable_member.match_score = result["score"]
    db.flush()
    db.expire(editable_team, ["members"])
    refresh_coverage(editable_team, project)

    db.commit()
    db.refresh(editable_team)
    return editable_team


def _require_capacity(db: Session, employee: Employee, project: Project) -> None:
    capacity = capacity_for_project(db, employee, project)
    if capacity is None:
        raise ValueError(f"Availability data missing for {employee.user.full_name}")
    if capacity <= 0:
        raise ValueError(f"{employee.user.full_name} has no available capacity for this project window")


def _coverage_percentage(project: Project, employees: list[Employee]) -> float:
    required = {ps.skill_id: ps for ps in project.project_skills}
    if not required:
        return 100.0
    held = set()
    for employee in employees:
        held |= {es.skill_id for es in employee.employee_skills}
    total = sum(IMPORTANCE_WEIGHT.get(ps.importance, 2) for ps in required.values()) or 1
    covered = sum(IMPORTANCE_WEIGHT.get(required[sid].importance, 2) for sid in held & required.keys())
    return round(covered / total * 100, 1)


def create_team_from_selection(db: Session, project: Project, employee_ids: list[int]) -> Team:
    """A team proposal built from the manager's own picks (e.g. ticked
    on the Recommendations page) rather than the set-cover algorithm."""
    if not employee_ids:
        raise ValueError("Select at least one employee")
    if len(employee_ids) != len(set(employee_ids)):
        raise ValueError("Each employee can only be selected once")
    if project.required_team_size and len(employee_ids) > project.required_team_size:
        raise ValueError(
            f"This project needs {project.required_team_size} people; you selected {len(employee_ids)}"
        )

    employees = []
    for employee_id in employee_ids:
        employee = db.get(Employee, employee_id)
        if not employee or not employee.is_active:
            raise ValueError("Every selected employee must be an active employee")
        _require_capacity(db, employee, project)
        employees.append(employee)

    team = Team(
        project_id=project.id,
        status="RECOMMENDED",
        skill_coverage_percentage=_coverage_percentage(project, employees),
        created_at=datetime.utcnow(),
    )
    db.add(team)
    db.flush()
    for employee in employees:
        availability = get_project_availability(db, employee, project)
        result = score_employee_for_project(db, employee, project, availability)
        db.add(TeamMember(
            team_id=team.id,
            employee_id=employee.id,
            role_on_team=employee.job_title,
            match_score=result["score"],
        ))
    db.commit()
    db.refresh(team)
    return team


def get_pending_proposal(db: Session, project: Project, approved: Optional[Team]) -> Optional[Team]:
    """Newest RECOMMENDED proposal that is newer than the approved team,
    so an unfinished proposal can be reopened instead of being lost."""
    proposals = [team for team in project.teams if team.status == "RECOMMENDED"]
    if approved is not None:
        proposals = [team for team in proposals if team.id > approved.id]
    return max(proposals, key=lambda team: team.id, default=None)


def refresh_coverage(team: Team, project: Project) -> None:
    team.skill_coverage_percentage = _coverage_percentage(project, [m.employee for m in team.members])


def replacement_candidates(db: Session, team: Team, project: Project, limit: int = 15) -> list[dict]:
    """Employees not on the team, ranked by fit for this project, each
    flagged with whether replace/add would currently accept them (and
    why not), so the UI never offers a choice the backend will reject."""
    on_team = {m.employee_id for m in team.members}
    employees = db.scalars(
        select(Employee)
        .options(
            joinedload(Employee.user),
            joinedload(Employee.employee_skills).joinedload(EmployeeSkill.skill),
            joinedload(Employee.availability),
        )
        .where(Employee.is_active == True)  # noqa: E712
    ).unique().all()

    required_ids = {ps.skill_id for ps in project.project_skills}
    candidates = []
    for employee in employees:
        if employee.id in on_team:
            continue
        availability = get_project_availability(db, employee, project)
        if availability["data_quality"] != "ok":
            candidates.append({
                "employee_id": employee.id,
                "name": employee.user.full_name,
                "job_title": employee.job_title,
                "department": employee.department,
                "match_score": 0.0,
                "available_capacity_percentage": None,
                "matched_skills": [],
                "eligible": False,
                "ineligible_reason": "Availability data missing",
            })
            continue
        capacity = capacity_for_project(db, employee, project)
        result = score_employee_for_project(db, employee, project, availability)
        candidates.append({
            "employee_id": employee.id,
            "name": employee.user.full_name,
            "job_title": employee.job_title,
            "department": employee.department,
            "match_score": result["score"],
            "available_capacity_percentage": round(capacity, 1),
            "matched_skills": [
                es.skill.name for es in employee.employee_skills if es.skill_id in required_ids
            ],
            "eligible": capacity > 0,
            "ineligible_reason": None if capacity > 0 else "Fully allocated during this project",
        })

    candidates.sort(key=lambda c: (not c["eligible"], -c["match_score"], c["name"]))
    return candidates[:limit] if limit else candidates


def remove_member(db: Session, team: Team, employee_id: int) -> Team:
    member = next((m for m in team.members if m.employee_id == employee_id), None)
    if not member:
        raise ValueError("Employee is not currently on this team")

    editable_team = _editable_team(db, team)
    editable_member = next(
        m for m in editable_team.members if m.employee_id == employee_id
    )
    db.delete(editable_member)
    db.flush()
    db.expire(editable_team, ["members"])
    refresh_coverage(editable_team, editable_team.project)
    db.commit()
    db.refresh(editable_team)
    return editable_team


def add_member(db: Session, team: Team, employee_id: int, project: Project) -> Team:
    if any(member.employee_id == employee_id for member in team.members):
        raise ValueError("Employee is already on this team")
    employee = db.get(Employee, employee_id)
    if not employee:
        raise ValueError("Employee not found")
    if project.required_team_size and len(team.members) >= project.required_team_size:
        raise ValueError("The project has already reached its required team size")
    availability = get_project_availability(db, employee, project)
    _require_capacity(db, employee, project)

    result = score_employee_for_project(db, employee, project, availability)
    editable_team = _editable_team(db, team)
    db.add(TeamMember(
        team_id=editable_team.id,
        employee_id=employee_id,
        role_on_team=employee.job_title,
        match_score=result["score"],
    ))
    db.flush()
    db.expire(editable_team, ["members"])
    refresh_coverage(editable_team, project)

    db.commit()
    db.refresh(editable_team)
    return editable_team
