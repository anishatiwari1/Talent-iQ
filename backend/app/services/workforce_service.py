"""Workforce Intelligence dashboard aggregation (Phase 11).

Every number here comes from a real query against Postgres -- no
hardcoded dashboard statistics, per the master prompt's explicit
instruction. This is also the natural seam for a Redis cache later
(Section 21): wrap get_workforce_overview() with a short TTL cache
once this is called often enough to matter; it's pure, deterministic,
and side-effect-free, so caching it is safe to add without touching
the query logic.
"""
from datetime import date
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.availability import Availability
from app.models.employee_project import EmployeeProject
from app.models.project import Project
from app.models.recommendation import Recommendation
from app.models.skill import Skill
from app.services.employee_service import (
    availability_status_for_window,
    get_availability_for_window,
)


def get_workforce_overview(db: Session, department: Optional[str] = None) -> dict:
    emp_stmt = select(Employee).options(joinedload(Employee.availability)).where(Employee.is_active == True)  # noqa: E712
    if department:
        emp_stmt = emp_stmt.where(Employee.department == department)
    employees = db.scalars(emp_stmt).unique().all()

    total = len(employees)
    utilizations = []
    window_availability = {}
    overloaded, underutilized, unavailable = [], [], []
    availability_counts = {
        "AVAILABLE": 0,
        "PARTIALLY_AVAILABLE": 0,
        "UNAVAILABLE": 0,
        "UNKNOWN": 0,
    }
    today = date.today()

    for e in employees:
        result = get_availability_for_window(db, e.id, today, today)
        window_availability[e.id] = result
        status = availability_status_for_window(result)
        availability_counts[status] += 1
        if status == "UNAVAILABLE":
            unavailable.append({
                "employee_id": e.id,
                "name": e.user.full_name,
                "utilization": round(result["peak_allocation"], 1),
            })
        util = result["peak_allocation"] if result["data_quality"] == "ok" else 0.0
        utilizations.append(util)
        if util > 100:
            overloaded.append({"employee_id": e.id, "name": e.user.full_name, "utilization": round(util, 1)})
        elif util <= 30:
            underutilized.append({"employee_id": e.id, "name": e.user.full_name, "utilization": round(util, 1)})

    avg_utilization = round(sum(utilizations) / total, 1) if total else 0.0
    available_employees = (
        availability_counts["AVAILABLE"]
        + availability_counts["PARTIALLY_AVAILABLE"]
    )

    dept_stmt = select(Employee.department, func.count(Employee.id)).where(
        Employee.is_active == True  # noqa: E712
    ).group_by(Employee.department)
    department_breakdown = [
        {"department": dept, "employee_count": count}
        for dept, count in db.execute(dept_stmt).all()
    ]

    # Real per-department average utilization -- used by the dashboard
    # instead of a fabricated historical trend (no time-series table
    # exists yet to honestly back a multi-month trend chart).
    dept_utilization: dict[str, list[float]] = {}
    for e in employees:
        result = window_availability[e.id]
        util = result["peak_allocation"] if result["data_quality"] == "ok" else 0.0
        dept_utilization.setdefault(e.department, []).append(util)
    department_utilization = [
        {
            "department": dept,
            "average_utilization_percentage": round(sum(vals) / len(vals), 1) if vals else 0.0,
            "employee_count": len(vals),
        }
        for dept, vals in dept_utilization.items()
    ]

    # Real utilization histogram (bucketed), for the workload
    # distribution chart -- computed from actual Availability rows.
    buckets = [
        {"range": "0-25%", "min": 0, "max": 25, "count": 0},
        {"range": "26-50%", "min": 26, "max": 50, "count": 0},
        {"range": "51-75%", "min": 51, "max": 75, "count": 0},
        {"range": "76-100%", "min": 76, "max": 100, "count": 0},
        {"range": "100%+", "min": 101, "max": None, "count": 0},
    ]
    for util in utilizations:
        for bucket in buckets:
            if bucket["max"] is None:
                if util > 100:
                    bucket["count"] += 1
                    break
            elif bucket["min"] <= util <= bucket["max"]:
                bucket["count"] += 1
                break
    workload_distribution = [{"range": b["range"], "count": b["count"]} for b in buckets]

    project_status_stmt = select(Project.status, func.count(Project.id)).group_by(Project.status)
    project_status_breakdown = [
        {"status": s, "count": c} for s, c in db.execute(project_status_stmt).all()
    ]
    active_projects_count = sum(
        row["count"] for row in project_status_breakdown if row["status"] == "ACTIVE"
    )

    pending_recommendations_count = db.scalar(
        select(func.count(Recommendation.id)).where(Recommendation.status == "PENDING_REVIEW")
    ) or 0

    effective_start = func.coalesce(EmployeeProject.start_date, Project.start_date)
    effective_end = func.coalesce(EmployeeProject.end_date, Project.end_date)
    assigned_stmt = (
        select(func.count(func.distinct(EmployeeProject.employee_id)))
        .join(Project, Project.id == EmployeeProject.project_id)
        .join(Employee, Employee.id == EmployeeProject.employee_id)
        .where(
            Employee.is_active == True,  # noqa: E712
            EmployeeProject.status == "ACTIVE",
            or_(effective_start.is_(None), effective_start <= today),
            or_(effective_end.is_(None), effective_end >= today),
        )
    )
    if department:
        assigned_stmt = assigned_stmt.where(Employee.department == department)
    assigned_employees = db.scalar(assigned_stmt) or 0

    skill_dist_stmt = (
        select(Skill.name, func.count(EmployeeSkill.id))
        .join(EmployeeSkill, EmployeeSkill.skill_id == Skill.id)
        .group_by(Skill.name)
        .order_by(func.count(EmployeeSkill.id).desc())
        .limit(15)
    )
    skill_distribution = [
        {"skill_name": name, "employee_count": count}
        for name, count in db.execute(skill_dist_stmt).all()
    ]

    return {
        "total_employees": total,
        "available_employees": available_employees,
        "fully_available_employees": availability_counts["AVAILABLE"],
        "partially_available_employees": availability_counts["PARTIALLY_AVAILABLE"],
        "unavailable_employees": availability_counts["UNAVAILABLE"],
        "availability_unknown_employees": availability_counts["UNKNOWN"],
        "assigned_employees": assigned_employees,
        "average_utilization_percentage": avg_utilization,
        "overloaded_employees": sorted(overloaded, key=lambda x: -x["utilization"]),
        "unavailable_employees_list": sorted(unavailable, key=lambda x: -x["utilization"]),
        "underutilized_employees": sorted(underutilized, key=lambda x: x["utilization"]),
        "department_breakdown": department_breakdown,
        "department_utilization": department_utilization,
        "workload_distribution": workload_distribution,
        "project_status_breakdown": project_status_breakdown,
        "active_projects_count": active_projects_count,
        "pending_recommendations_count": pending_recommendations_count,
        "skill_distribution": skill_distribution,
    }
