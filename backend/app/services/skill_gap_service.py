"""Skill gap analysis (Phase 10) -- individual, project/team, and
organization-wide.
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.skill import Skill
from app.models.team import Team
from app.services import project_service, team_service
from app.services.recommendation_service import get_project_availability


def _severity(gap: int, importance: str) -> str:
    if gap <= 0:
        return "NONE"
    if importance == "MUST_HAVE" and gap >= 2:
        return "HIGH"
    if importance == "MUST_HAVE" or gap >= 2:
        return "MEDIUM"
    return "LOW"


def _evaluate_requirement(ps: ProjectSkill, members: list[Employee]) -> dict:
    """Evaluates one requirement against a roster.

    Proficiency is ordinal (1-5), so levels are never summed or
    averaged: the requirement is met when at least one member holds the
    skill at or above the required level. A member with no EmployeeSkill
    row for the skill is "not evidenced", not "level 0"."""
    holders = [
        es
        for member in members
        for es in member.employee_skills
        if es.skill_id == ps.skill_id
    ]
    required = ps.required_proficiency

    if not members:
        status, current, gap_value = "NO_STAFF", None, required
    elif not holders:
        status, current, gap_value = "NOT_EVIDENCED", None, required
    else:
        current = max(es.proficiency_level for es in holders)
        gap_value = max(required - current, 0)
        status = "MET" if gap_value == 0 else "BELOW_REQUIRED"

    # Among holders at the best level, report the most trustworthy record:
    # manual/manager entries carry no confidence and rank above extractions.
    best = max(
        (es for es in holders if es.proficiency_level == current),
        key=lambda es: 1.0 if es.confidence is None else es.confidence,
        default=None,
    )

    return {
        "skill_id": ps.skill_id,
        "skill_name": ps.skill.name,
        "current_level": current,
        "required_level": required,
        "gap": gap_value,
        "severity": _severity(gap_value, ps.importance),
        "project_id": ps.project_id,
        "importance": ps.importance,
        "coverage_status": status,
        "qualified_members": sum(1 for es in holders if es.proficiency_level >= required),
        "best_holder_source": best.source if best else None,
        "best_holder_confidence": best.confidence if best else None,
    }


def _project_staffing_employees(db: Session, project: Project) -> list[Employee]:
    """Employees on PLANNED/ACTIVE EmployeeProject rows -- the approved
    staffing, the same roster used to decide when a project is fully
    staffed. Includes inactive employees; callers filter them."""
    return [s.employee for s in project_service.get_project_staffing(db, project)]


def _employee_name(employee: Employee) -> str:
    return employee.user.full_name if employee.user else f"Employee {employee.id}"


def _staffing_summary(project: Project, employees: list[Employee]) -> dict:
    """Headcount completeness, reported separately from skill coverage.
    Inactive employees are listed but never counted as staffed."""
    active = [e for e in employees if e.is_active]
    target = project.required_team_size
    staffed = len(active)

    if staffed == 0:
        status = "UNSTAFFED"
    elif not target:
        status = "UNKNOWN_TARGET"
    elif staffed < target:
        status = "UNDERSTAFFED"
    elif staffed == target:
        status = "COMPLETE"
    else:
        status = "OVERSTAFFED"

    return {
        "status": status,
        "staffed_count": staffed,
        "required_team_size": target,
        "shortfall": max(target - staffed, 0) if target else None,
        "inactive_members": [
            {"employee_id": e.id, "employee_name": _employee_name(e)}
            for e in employees
            if not e.is_active
        ],
    }


def _project_meta(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "department": project.department,
        "status": project.status,
    }


def _project_gaps(project: Project, employees: list[Employee]) -> list[dict]:
    members = [e for e in employees if e.is_active]
    return [_evaluate_requirement(ps, members) for ps in project.project_skills]


def analyze_project_gaps(db: Session, project: Project) -> list[dict]:
    """Compares required project skills against the project's approved
    staffing (see _project_staffing_employees). Employees elsewhere in
    the organization never count as coverage, and inactive staffed
    employees are excluded.

    Read-only: results are computed on demand and never persisted."""
    return _project_gaps(project, _project_staffing_employees(db, project))


def project_gap_analysis(db: Session, project: Project) -> dict:
    """Project gaps plus the context needed to read them: which roster
    was analyzed, staffing completeness, and whether the approved
    staffing still matches the current approved team's roster.
    Read-only."""
    employees = _project_staffing_employees(db, project)
    approved_team = team_service.get_approved_team(db, project)
    roster_mismatch = approved_team is not None and (
        {m.employee_id for m in approved_team.members} != {e.id for e in employees}
    )
    return {
        "project": _project_meta(project),
        "roster_source": "APPROVED_STAFFING",
        "approved_team_id": approved_team.id if approved_team else None,
        "roster_mismatch": roster_mismatch,
        "staffing": _staffing_summary(project, employees),
        "gaps": _project_gaps(project, employees),
    }


# DRAFT/RECOMMENDED teams are proposals and APPROVED is the live roster;
# SUPERSEDED/REJECTED rows are kept only as history.
CURRENT_TEAM_STATUSES = {"DRAFT", "RECOMMENDED", "APPROVED"}


def analyze_team_gaps(db: Session, project: Project, team: Team) -> list[dict]:
    """Compares required project skills against the active members of
    this one Team row only -- never merged with other proposals for the
    same project. approve_team syncs TeamMember to the final roster, so
    an APPROVED team's members are its approved roster; DRAFT/RECOMMENDED
    teams are proposed rosters. Each row carries the team's status so
    callers can label which roster was analyzed.

    Read-only: results are computed on demand and never persisted."""
    members = [m.employee for m in team.members if m.employee.is_active]
    team_fields = {
        "team_id": team.id,
        "team_status": team.status,
        "is_current": team.status in CURRENT_TEAM_STATUSES,
    }
    return [
        {**_evaluate_requirement(ps, members), **team_fields}
        for ps in project.project_skills
    ]


def team_gap_analysis(db: Session, project: Project, team: Team) -> dict:
    """Team gaps plus the team's project, status and staffing
    completeness, so a caller never has to pair a team with a project
    on its own. Read-only."""
    return {
        "project": _project_meta(project),
        "roster_source": "TEAM",
        "team_id": team.id,
        "team_status": team.status,
        "is_current": team.status in CURRENT_TEAM_STATUSES,
        "staffing": _staffing_summary(project, [m.employee for m in team.members]),
        "gaps": analyze_team_gaps(db, project, team),
    }


# Highest first: how urgently a skill's uncovered demand needs attention.
SHORTAGE_RISK_RANK = {"SHORTAGE": 3, "CAPACITY_UNKNOWN": 2, "TIGHT": 1, "OK": 0}


def _has_capacity(db: Session, cache: dict, employee: Employee, project: Project) -> Optional[bool]:
    """Whether the employee has any free capacity in the project's date
    window, or None when that can't be known (no availability record, or
    project dates that don't form a valid window). Cached per pair
    because the window depends only on the project."""
    key = (employee.id, project.id)
    if key not in cache:
        try:
            result = get_project_availability(db, employee, project)
        except ValueError:
            cache[key] = None
        else:
            cache[key] = (
                None if result["data_quality"] != "ok"
                else result["remaining_capacity"] > 0
            )
    return cache[key]


def organization_skill_gap_summary(db: Session) -> list[dict]:
    """Organization-level demand vs. capacity for every skill required
    by a PLANNING/ACTIVE project.

    Demand is counted in *requirements* (one project needing one skill),
    not employees: ProjectSkill has no headcount, so the only defensible
    lower bound is one qualified person per requirement the project's
    own approved staffing doesn't already cover. Supply is active
    employees only, judged against each requirement's own level.
    Availability is checked per requirement window, so one person can
    count as available for several overlapping projects -- counts are
    of distinct people and must not be summed across skills. Employees
    with no record of a skill are "not recorded", not "lacking it".
    Read-only."""
    requirements = db.scalars(
        select(ProjectSkill)
        .options(joinedload(ProjectSkill.skill), joinedload(ProjectSkill.project))
        .join(Project)
        .where(Project.status.in_(["PLANNING", "ACTIVE"]))
    ).all()
    employees = db.scalars(
        select(Employee)
        .options(joinedload(Employee.employee_skills))
        .where(Employee.is_active == True)  # noqa: E712
    ).unique().all()
    # Only active employees appear here, so inactive staff never count.
    levels = {
        e.id: {es.skill_id: es.proficiency_level for es in e.employee_skills}
        for e in employees
    }

    rosters: dict[int, set[int]] = {}
    capacity_cache: dict = {}
    by_skill: dict[int, dict] = {}

    for ps in requirements:
        entry = by_skill.setdefault(ps.skill_id, {
            "skill_id": ps.skill_id,
            "skill_name": ps.skill.name,
            "projects_requiring": 0,
            "max_required_level": 0,
            "requirements_uncovered": 0,
            "available_ids": set(),
            "unknown_ids": set(),
        })
        entry["projects_requiring"] += 1
        entry["max_required_level"] = max(entry["max_required_level"], ps.required_proficiency)

        project = ps.project
        if project.id not in rosters:
            rosters[project.id] = {
                s.employee_id for s in project_service.get_project_staffing(db, project)
            }
        roster = rosters[project.id]

        def meets(employee_id: int) -> bool:
            return levels.get(employee_id, {}).get(ps.skill_id, 0) >= ps.required_proficiency

        if any(meets(employee_id) for employee_id in roster):
            continue

        entry["requirements_uncovered"] += 1
        for employee in employees:
            if employee.id in roster or not meets(employee.id):
                continue
            has_capacity = _has_capacity(db, capacity_cache, employee, project)
            if has_capacity is None:
                entry["unknown_ids"].add(employee.id)
            elif has_capacity:
                entry["available_ids"].add(employee.id)

    summary = []
    for skill_id, entry in by_skill.items():
        available_ids = entry.pop("available_ids")
        unknown_ids = entry.pop("unknown_ids") - available_ids
        total = entry["projects_requiring"]
        uncovered = entry["requirements_uncovered"]
        available = len(available_ids)

        if uncovered == 0:
            risk = "OK"
        elif available == 0:
            risk = "CAPACITY_UNKNOWN" if unknown_ids else "SHORTAGE"
        elif available < uncovered:
            risk = "TIGHT"
        else:
            risk = "OK"

        qualified = sum(
            1 for skills in levels.values()
            if skills.get(skill_id, 0) >= entry["max_required_level"]
        )
        entry.update({
            "requirements_covered": total - uncovered,
            "employees_qualified": qualified,
            "employees_with_skill_any_level": sum(1 for skills in levels.values() if skill_id in skills),
            "employees_qualified_available": available,
            "employees_capacity_unknown": len(unknown_ids),
            # Share of this skill's requirements met by current staffing: 0-1.
            "coverage_ratio": round((total - uncovered) / total, 2),
            "shortage_risk": risk,
            "insufficient_coverage": risk != "OK",
            "concentration_risk": 0 < qualified <= 2,
        })
        summary.append(entry)

    summary.sort(
        key=lambda e: (
            SHORTAGE_RISK_RANK[e["shortage_risk"]],
            e["requirements_uncovered"],
            e["projects_requiring"],
        ),
        reverse=True,
    )
    return summary
