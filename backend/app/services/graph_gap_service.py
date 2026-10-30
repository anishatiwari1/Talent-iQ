"""Skill gaps read from the Neo4j knowledge graph (Skill Gaps dashboard).

All data comes from the graph: (Employee)-[:HAS_SKILL]->(Skill),
(Project)-[:REQUIRES_SKILL]->(Skill) and (Employee)-[:WORKED_ON]->(Project),
as mirrored from PostgreSQL by graph_sync_service. Cypher only fetches;
the gap rules themselves are the same functions skill_gap_service and
employee_service use, so a fresh graph gives the same answers PostgreSQL
would. Status only -- no suggestions -- and strictly read-only.

Verified vs. estimated: every met/missing count, coverage figure and
urgency uses recorded skills only, so the scores always match the
database. Separately, (Skill)-[:RELATED_TO]-(Skill) links estimate a
level for skills a person hasn't recorded (e.g. REST API -> FastAPI).
Estimates are reported in their own fields with the skill they came
from, and never change a verified result.

There is deliberately no PostgreSQL fallback: if the graph isn't
connected, callers get GraphUnavailable and the page says so.
"""
from datetime import date
from types import SimpleNamespace
from typing import Optional

from app.services import graph_service

try:
    from neo4j.exceptions import ServiceUnavailable, SessionExpired
    _CONNECTION_ERRORS: tuple = (ServiceUnavailable, SessionExpired)
except ImportError:
    _CONNECTION_ERRORS = ()
from app.services.employee_service import compute_window_availability
from app.services.recommendation_service import project_window
from app.services.skill_gap_service import _evaluate_requirement, _staffing_summary

ACTIVE_PROJECT_STATUSES = ["PLANNING", "ACTIVE"]
ASSIGNED_STATUSES = ["PLANNED", "ACTIVE"]

# A missing skill's urgency comes from how important it is to the project.
URGENCY_BY_IMPORTANCE = {"MUST_HAVE": "URGENT", "IMPORTANT": "IMPORTANT", "NICE_TO_HAVE": "MINOR"}
URGENCY_RANK = {"URGENT": 3, "IMPORTANT": 2, "MINOR": 1, "NO_GAP": 0}

# How many levels an estimate drops below the related skill it comes from.
# Same-family skills and a framework/its language transfer closely;
# complementary skills (often used together) transfer less.
ESTIMATE_DISCOUNT = {"SAME_FAMILY": 1, "FRAMEWORK_OF": 1, "COMPLEMENTARY": 2}
DEFAULT_ESTIMATE_DISCOUNT = 2

RESULT_BY_COVERAGE_STATUS = {
    "MET": "MET",
    "BELOW_REQUIRED": "BELOW_LEVEL",
    "NOT_EVIDENCED": "MISSING",
    "NO_STAFF": "NO_STAFF",
}


class GraphUnavailable(Exception):
    """The knowledge graph isn't connected."""


class GraphProjectNotFound(Exception):
    """The project isn't in the knowledge graph (not synced yet)."""


# --- Cypher -----------------------------------------------------------------

_REQUIREMENTS = """
OPTIONAL MATCH (p)-[req:REQUIRES_SKILL]->(s:Skill)
WITH p, collect(CASE WHEN s IS NULL THEN NULL ELSE {
    skill_id: s.id, skill_name: s.name,
    required_level: req.required_proficiency, importance: req.importance
} END) AS requirements
"""

PROJECT_QUERY = """
MATCH (p:Project {id: $project_id})
""" + _REQUIREMENTS + """
OPTIONAL MATCH (e:Employee)-[w:WORKED_ON]->(p) WHERE w.status IN $assigned
OPTIONAL MATCH (e)-[h:HAS_SKILL]->(es:Skill)
WITH p, requirements, e, collect(CASE WHEN es IS NULL THEN NULL ELSE {
    skill_id: es.id, level: h.proficiency, source: h.source
} END) AS skills
RETURN p {.id, .name, .department, .status, .required_team_size} AS project,
       requirements,
       collect(CASE WHEN e IS NULL THEN NULL ELSE {
           id: e.id, name: e.name, is_active: e.is_active, skills: skills
       } END) AS members
"""

ORG_PROJECTS_QUERY = """
MATCH (p:Project) WHERE p.status IN $statuses
""" + _REQUIREMENTS + """
OPTIONAL MATCH (e:Employee)-[w:WORKED_ON]->(p) WHERE w.status IN $assigned
RETURN p {.id, .name, .department, .status, .required_team_size, .start_date, .end_date} AS project,
       requirements,
       collect(DISTINCT e.id) AS roster_ids
"""

ORG_EMPLOYEES_QUERY = """
MATCH (e:Employee) WHERE e.is_active = true
OPTIONAL MATCH (e)-[h:HAS_SKILL]->(s:Skill)
WITH e, collect(CASE WHEN s IS NULL THEN NULL ELSE {skill_id: s.id, level: h.proficiency} END) AS skills
OPTIONAL MATCH (e)-[w:WORKED_ON]->(p:Project) WHERE w.status = 'ACTIVE'
RETURN e {.id, .name, .weekly_capacity_hours} AS employee,
       skills,
       collect(CASE WHEN p IS NULL THEN NULL ELSE {
           allocation: w.allocation_percentage,
           start_date: coalesce(w.start_date, p.start_date),
           end_date: coalesce(w.end_date, p.end_date)
       } END) AS stints
"""

PROJECT_LIST_QUERY = """
MATCH (p:Project)
RETURN p.id AS id, p.name AS name, p.department AS department, p.status AS status
ORDER BY name
"""

# Undirected match returns each relation from both ends.
RELATED_QUERY = """
MATCH (a:Skill)-[r:RELATED_TO]-(b:Skill)
RETURN a.id AS skill_id, b.id AS related_id, b.name AS related_name, r.type AS relation_type
"""

SYNC_META_QUERY = "MATCH (m:SyncMeta {id: 'talentiq'}) RETURN m.synced_at AS synced_at"


def _read(query: str, **params) -> list[dict]:
    if not graph_service.is_enabled():
        raise GraphUnavailable()
    try:
        return graph_service.run_read(query, **params)
    except _CONNECTION_ERRORS as exc:
        # Neo4j went away after startup.
        raise GraphUnavailable() from exc


def _synced_at() -> Optional[str]:
    rows = _read(SYNC_META_QUERY)
    return rows[0]["synced_at"] if rows else None


def _parse_date(value) -> Optional[date]:
    return date.fromisoformat(value) if value else None


# --- Shaping graph records for the shared rules ------------------------------

def _requirement(row: dict, project_id: int) -> SimpleNamespace:
    return SimpleNamespace(
        skill_id=row["skill_id"],
        required_proficiency=row["required_level"],
        importance=row["importance"],
        project_id=project_id,
        skill=SimpleNamespace(name=row["skill_name"]),
    )


def _member(row: dict) -> SimpleNamespace:
    return SimpleNamespace(
        id=row["id"],
        is_active=bool(row.get("is_active")),
        user=SimpleNamespace(full_name=row["name"]),
        employee_skills=[
            SimpleNamespace(skill_id=s["skill_id"], proficiency_level=s["level"],
                            confidence=None, source=s.get("source"))
            for s in row["skills"]
        ],
    )


def _related_index(related_rows) -> dict[int, list[dict]]:
    index: dict[int, list[dict]] = {}
    for row in related_rows:
        index.setdefault(row["skill_id"], []).append(row)
    return index


def estimate_level(skill_id: int, levels: dict[int, int], related: dict[int, list[dict]]) -> Optional[dict]:
    """Estimated level for a skill the person hasn't recorded, from their
    recorded related skills; None if they recorded it (the record wins) or
    hold no related skill."""
    if skill_id in levels:
        return None
    best = None
    for rel in related.get(skill_id, []):
        held = levels.get(rel["related_id"])
        if held is None:
            continue
        discount = ESTIMATE_DISCOUNT.get(rel["relation_type"], DEFAULT_ESTIMATE_DISCOUNT)
        level = max(held - discount, 1)
        if best is None or level > best["level"]:
            best = {
                "level": level,
                "related_skill": rel["related_name"],
                "related_level": held,
                "relation_type": rel["relation_type"],
            }
    return best


def _max_urgency(urgencies) -> str:
    return max(urgencies, key=URGENCY_RANK.__getitem__, default="NO_GAP")


def _coverage(met: int, total: int) -> Optional[int]:
    return round(met / total * 100) if total else None


# --- Project view ------------------------------------------------------------

def build_project_view(project: dict, requirement_rows: list[dict], member_rows: list[dict],
                       related_rows: list[dict] = ()) -> dict:
    """Pure: computes a project's skill status from graph records."""
    members = [_member(row) for row in member_rows]
    active = [m for m in members if m.is_active]
    related = _related_index(related_rows)
    active_levels = [
        (m.user.full_name, {es.skill_id: es.proficiency_level for es in m.employee_skills})
        for m in active
    ]
    staffing = _staffing_summary(SimpleNamespace(required_team_size=project.get("required_team_size")), members)

    requirements = []
    for row in requirement_rows:
        evaluated = _evaluate_requirement(_requirement(row, project["id"]), active)
        met = evaluated["coverage_status"] == "MET"
        estimate = None
        if not met:
            for name, levels in active_levels:
                guess = estimate_level(row["skill_id"], levels, related)
                if guess and (estimate is None or guess["level"] > estimate["level"]):
                    estimate = {**guess, "employee_name": name}
            if estimate:
                estimate["likely_met"] = estimate["level"] >= evaluated["required_level"]
        requirements.append({
            "skill_id": row["skill_id"],
            "skill_name": row["skill_name"],
            "importance": row["importance"],
            "urgency": "NO_GAP" if met else URGENCY_BY_IMPORTANCE.get(row["importance"], "IMPORTANT"),
            "level_needed": evaluated["required_level"],
            "team_best_level": evaluated["current_level"],
            "result": RESULT_BY_COVERAGE_STATUS[evaluated["coverage_status"]],
            "levels_short": evaluated["gap"],
            "members_at_level": evaluated["qualified_members"],
            "estimate": estimate,
        })
    requirements.sort(key=lambda r: (-URGENCY_RANK[r["urgency"]], -r["levels_short"], r["skill_name"]))

    met_count = sum(1 for r in requirements if r["result"] == "MET")
    return {
        "project": {k: project.get(k) for k in ("id", "name", "department", "status")},
        "summary": {
            "urgency": _max_urgency(r["urgency"] for r in requirements),
            "skills_needed": len(requirements),
            "skills_met": met_count,
            "skills_missing": len(requirements) - met_count,
            "urgent_gaps": sum(1 for r in requirements if r["urgency"] == "URGENT"),
            "skills_likely_met": sum(1 for r in requirements if r["estimate"] and r["estimate"]["likely_met"]),
            "coverage": _coverage(met_count, len(requirements)),
            "people_assigned": staffing["staffed_count"],
            "planned_team_size": staffing["required_team_size"],
            "staffing_status": staffing["status"],
        },
        "inactive_members": staffing["inactive_members"],
        "requirements": requirements,
    }


def project_skill_gaps(project_id: int) -> dict:
    rows = _read(PROJECT_QUERY, project_id=project_id, assigned=ASSIGNED_STATUSES)
    if not rows:
        raise GraphProjectNotFound()
    row = rows[0]
    view = build_project_view(row["project"], row["requirements"], row["members"], _read(RELATED_QUERY))
    return {"source": "KNOWLEDGE_GRAPH", "synced_at": _synced_at(), **view}


def graph_projects() -> list[dict]:
    return _read(PROJECT_LIST_QUERY)


# --- Organization view -------------------------------------------------------

def build_organization_view(project_rows: list[dict], employee_rows: list[dict],
                            related_rows: list[dict] = ()) -> dict:
    """Pure: computes organization-wide skill status from graph records.

    A requirement (one project needing one skill at a level) is met when
    an active member of that project's assigned staff holds the skill at
    that level. "Employees at level" counts active employees at the
    highest level any project needs. "Free to join" counts active
    employees, not already on the project, qualified for at least one
    requirement and with spare capacity in that project's dates; people
    whose availability isn't recorded are counted separately. An unmet
    requirement is "likely met" when a team member's related skills give
    an estimated level that reaches it; it still counts as not met."""
    related = _related_index(related_rows)
    employees = {}
    for row in employee_rows:
        emp = row["employee"]
        employees[emp["id"]] = {
            "levels": {s["skill_id"]: s["level"] for s in row["skills"]},
            "capacity": emp.get("weekly_capacity_hours"),
            "stints": [
                (s["allocation"], _parse_date(s["start_date"]), _parse_date(s["end_date"]))
                for s in row["stints"]
            ],
        }

    capacity_cache: dict = {}

    def has_capacity(employee_id: int, project: dict) -> Optional[bool]:
        key = (employee_id, project["id"])
        if key not in capacity_cache:
            emp = employees[employee_id]
            try:
                window = project_window(_parse_date(project.get("start_date")), _parse_date(project.get("end_date")))
                result = compute_window_availability(emp["stints"], emp["capacity"], *window)
            except ValueError:
                capacity_cache[key] = None
            else:
                capacity_cache[key] = (
                    None if result["data_quality"] != "ok" else result["remaining_capacity"] > 0
                )
        return capacity_cache[key]

    def level(employee_id: int, skill_id: int) -> int:
        return employees.get(employee_id, {}).get("levels", {}).get(skill_id, 0)

    def likely_met(roster: list[int], skill_id: int, needed: int) -> bool:
        for eid in roster:
            guess = estimate_level(skill_id, employees[eid]["levels"], related)
            if guess and guess["level"] >= needed:
                return True
        return False

    by_skill: dict[int, dict] = {}
    by_project = []
    total_needs = total_met = urgent_gaps = total_likely = 0

    for row in project_rows:
        project = row["project"]
        # Only active employees are in `employees`, so inactive staff never count.
        roster = [eid for eid in row["roster_ids"] if eid in employees]
        project_met = project_likely = 0
        project_urgencies = []

        for req in row["requirements"]:
            needed = req["required_level"]
            met = any(level(eid, req["skill_id"]) >= needed for eid in roster)
            entry = by_skill.setdefault(req["skill_id"], {
                "skill_id": req["skill_id"],
                "skill_name": req["skill_name"],
                "projects_needing": 0,
                "projects_with": 0,
                "projects_likely_with": 0,
                "max_level_needed": 0,
                "unmet_urgencies": [],
                "free_ids": set(),
                "unknown_ids": set(),
            })
            entry["projects_needing"] += 1
            entry["max_level_needed"] = max(entry["max_level_needed"], needed)
            total_needs += 1
            if met:
                entry["projects_with"] += 1
                project_met += 1
                total_met += 1
            else:
                urgency = URGENCY_BY_IMPORTANCE.get(req["importance"], "IMPORTANT")
                entry["unmet_urgencies"].append(urgency)
                project_urgencies.append(urgency)
                urgent_gaps += urgency == "URGENT"
                if likely_met(roster, req["skill_id"], needed):
                    entry["projects_likely_with"] += 1
                    project_likely += 1
                    total_likely += 1

            for eid in employees:
                if eid in roster or level(eid, req["skill_id"]) < needed:
                    continue
                capacity = has_capacity(eid, project)
                if capacity is None:
                    entry["unknown_ids"].add(eid)
                elif capacity:
                    entry["free_ids"].add(eid)

        needed_count = len(row["requirements"])
        by_project.append({
            "project_id": project["id"],
            "name": project["name"],
            "department": project.get("department"),
            "urgency": _max_urgency(project_urgencies),
            "skills_needed": needed_count,
            "skills_met": project_met,
            "skills_missing": needed_count - project_met,
            "skills_likely_met": project_likely,
            "people_assigned": len(roster),
            "planned_team_size": project.get("required_team_size"),
            "coverage": _coverage(project_met, needed_count),
        })

    skills = []
    for entry in by_skill.values():
        free_ids = entry.pop("free_ids")
        unknown_ids = entry.pop("unknown_ids") - free_ids
        urgencies = entry.pop("unmet_urgencies")
        max_level = entry.pop("max_level_needed")
        skills.append({
            **entry,
            "urgency": _max_urgency(urgencies),
            "projects_without": entry["projects_needing"] - entry["projects_with"],
            "level_needed": max_level,
            "employees_at_level": sum(1 for e in employees.values() if e["levels"].get(entry["skill_id"], 0) >= max_level),
            "free_to_join": len(free_ids),
            "availability_unknown": len(unknown_ids),
            "coverage": _coverage(entry["projects_with"], entry["projects_needing"]),
        })

    skills.sort(key=lambda s: (-URGENCY_RANK[s["urgency"]], -s["projects_without"], s["skill_name"]))
    by_project.sort(key=lambda p: (-URGENCY_RANK[p["urgency"]], -p["skills_missing"], p["name"]))

    projects_with_needs = [p for p in by_project if p["skills_needed"]]
    return {
        "summary": {
            "skill_needs": total_needs,
            "needs_met": total_met,
            "needs_not_met": total_needs - total_met,
            "needs_likely_met": total_likely,
            "urgent_gaps": urgent_gaps,
            "coverage": _coverage(total_met, total_needs),
            "projects_fully_skilled": sum(1 for p in projects_with_needs if p["skills_missing"] == 0),
            "projects_with_needs": len(projects_with_needs),
        },
        "by_skill": skills,
        "by_project": by_project,
    }


def organization_skill_gaps() -> dict:
    project_rows = _read(ORG_PROJECTS_QUERY, statuses=ACTIVE_PROJECT_STATUSES, assigned=ASSIGNED_STATUSES)
    employee_rows = _read(ORG_EMPLOYEES_QUERY)
    view = build_organization_view(project_rows, employee_rows, _read(RELATED_QUERY))
    return {"source": "KNOWLEDGE_GRAPH", "synced_at": _synced_at(), **view}
