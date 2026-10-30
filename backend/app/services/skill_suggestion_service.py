"""Related-skill suggestions for unmet project requirements.

Deliberately separate from skill_gap_service: nothing here changes a
gap, its severity, or staffing. For each requirement the project's
staffing doesn't meet, it lists curated related skills (skill_relations)
and the active employees who hold them, so a manager can see possible
pathways -- e.g. "needs FastAPI; Asha has Python 4 (same family)".

Read from PostgreSQL, the source of truth, rather than Neo4j: the graph
mirror is refreshed only by the manual sync script and may be stale.
Read-only.
"""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.project import Project
from app.models.skill_relation import SkillRelation
from app.services import project_service, skill_gap_service

HOLDERS_PER_RELATED_SKILL = 5


def related_skill_suggestions(db: Session, project: Project) -> dict:
    unmet = [
        row for row in skill_gap_service.analyze_project_gaps(db, project)
        if row["coverage_status"] != "MET"
    ]
    result = {
        "project_id": project.id,
        "basis": "CURATED_SKILL_RELATIONS",
        "counts_toward_coverage": False,
        "suggestions": [],
    }
    if not unmet:
        return result

    unmet_ids = {row["skill_id"] for row in unmet}
    relations = db.scalars(
        select(SkillRelation)
        .options(joinedload(SkillRelation.skill), joinedload(SkillRelation.related_skill))
        .where(or_(
            SkillRelation.skill_id.in_(unmet_ids),
            SkillRelation.related_skill_id.in_(unmet_ids),
        ))
    ).all()

    # Relations are undirected: index each one from both ends.
    related_by_skill: dict[int, list[tuple]] = {}
    for rel in relations:
        related_by_skill.setdefault(rel.skill_id, []).append((rel.related_skill, rel))
        related_by_skill.setdefault(rel.related_skill_id, []).append((rel.skill, rel))

    related_ids = {
        skill.id for skill_id in unmet_ids for skill, _ in related_by_skill.get(skill_id, [])
    }
    holders_by_skill: dict[int, list[EmployeeSkill]] = {}
    if related_ids:
        holder_rows = db.scalars(
            select(EmployeeSkill)
            .join(Employee)
            .options(joinedload(EmployeeSkill.employee).joinedload(Employee.user))
            .where(
                EmployeeSkill.skill_id.in_(related_ids),
                Employee.is_active == True,  # noqa: E712
            )
        ).all()
        for es in holder_rows:
            holders_by_skill.setdefault(es.skill_id, []).append(es)

    roster_ids = {s.employee_id for s in project_service.get_project_staffing(db, project)}

    for row in unmet:
        related_skills = []
        for skill, rel in related_by_skill.get(row["skill_id"], []):
            holders = sorted(
                holders_by_skill.get(skill.id, []),
                # Current staff first: upskilling them needs no new allocation.
                key=lambda es: (es.employee_id in roster_ids, es.proficiency_level),
                reverse=True,
            )
            related_skills.append({
                "skill_id": skill.id,
                "skill_name": skill.name,
                "relation_type": rel.relation_type,
                "note": rel.note,
                "holder_count": len(holders),
                "holders": [
                    {
                        "employee_id": es.employee_id,
                        "employee_name": es.employee.user.full_name if es.employee.user else f"Employee {es.employee_id}",
                        "proficiency_level": es.proficiency_level,
                        "on_project": es.employee_id in roster_ids,
                    }
                    for es in holders[:HOLDERS_PER_RELATED_SKILL]
                ],
            })
        if related_skills:
            result["suggestions"].append({
                "skill_id": row["skill_id"],
                "skill_name": row["skill_name"],
                "required_level": row["required_level"],
                "coverage_status": row["coverage_status"],
                "related_skills": related_skills,
            })
    return result
