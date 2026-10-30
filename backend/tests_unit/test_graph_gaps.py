"""Knowledge-graph skill gaps: the pure calculations over graph records,
the shared availability helper, and sync pruning. No Neo4j or database."""
from datetime import date, timedelta
from types import SimpleNamespace as N

import pytest

from app.services import graph_gap_service as gg
from app.services import graph_sync_service
from app.services.employee_service import compute_window_availability
from app.services.recommendation_service import project_window


def req(skill_id, level, importance="IMPORTANT", name=None):
    return {"skill_id": skill_id, "skill_name": name or f"Skill {skill_id}",
            "required_level": level, "importance": importance}


def member(employee_id, skills, active=True):
    return {"id": employee_id, "name": f"Employee {employee_id}", "is_active": active,
            "skills": [{"skill_id": s, "level": lvl, "source": "MANUAL"} for s, lvl in skills.items()]}


# --- Project view ---------------------------------------------------------

PROJECT = {"id": 7, "name": "Portal", "department": "Product", "status": "ACTIVE", "required_team_size": 4}


def test_project_results_and_urgency():
    view = gg.build_project_view(
        PROJECT,
        [req(1, 4, "MUST_HAVE", "React"), req(2, 3, "NICE_TO_HAVE", "TypeScript"), req(3, 3, "MUST_HAVE", "FastAPI")],
        [member(10, {1: 3, 3: 4}), member(11, {1: 2})],
    )
    rows = {r["skill_name"]: r for r in view["requirements"]}
    assert (rows["React"]["result"], rows["React"]["urgency"], rows["React"]["levels_short"]) == ("BELOW_LEVEL", "URGENT", 1)
    assert rows["React"]["team_best_level"] == 3
    assert (rows["TypeScript"]["result"], rows["TypeScript"]["urgency"]) == ("MISSING", "MINOR")
    assert rows["TypeScript"]["team_best_level"] is None
    assert (rows["FastAPI"]["result"], rows["FastAPI"]["urgency"], rows["FastAPI"]["members_at_level"]) == ("MET", "NO_GAP", 1)

    summary = view["summary"]
    assert (summary["skills_needed"], summary["skills_met"], summary["skills_missing"]) == (3, 1, 2)
    assert summary["urgent_gaps"] == 1
    assert summary["urgency"] == "URGENT"
    assert summary["coverage"] == 33
    assert (summary["people_assigned"], summary["planned_team_size"], summary["staffing_status"]) == (2, 4, "UNDERSTAFFED")


def test_project_rows_sort_most_urgent_first():
    view = gg.build_project_view(
        PROJECT,
        [req(3, 3, "MUST_HAVE", "Met skill"), req(2, 3, "NICE_TO_HAVE", "Minor gap"), req(1, 4, "MUST_HAVE", "Urgent gap")],
        [member(10, {3: 3})],
    )
    assert [r["skill_name"] for r in view["requirements"]] == ["Urgent gap", "Minor gap", "Met skill"]


def test_inactive_members_are_listed_and_never_count():
    view = gg.build_project_view(PROJECT, [req(1, 3)], [member(10, {1: 5}, active=False)])
    assert view["requirements"][0]["result"] == "NO_STAFF"
    assert view["summary"]["people_assigned"] == 0
    assert view["inactive_members"] == [{"employee_id": 10, "employee_name": "Employee 10"}]


def test_project_without_requirements_has_no_coverage_figure():
    view = gg.build_project_view(PROJECT, [], [member(10, {})])
    assert view["summary"]["coverage"] is None
    assert view["summary"]["urgency"] == "NO_GAP"


# --- Organization view ----------------------------------------------------

def org_project(project_id, requirements, roster, team_size=3, start="2026-11-01", end="2027-03-01"):
    return {"project": {"id": project_id, "name": f"Project {project_id}", "department": "Eng",
                        "status": "ACTIVE", "required_team_size": team_size,
                        "start_date": start, "end_date": end},
            "requirements": requirements, "roster_ids": roster}


def org_employee(employee_id, skills, capacity=40, stints=()):
    return {"employee": {"id": employee_id, "name": f"Employee {employee_id}", "weekly_capacity_hours": capacity},
            "skills": [{"skill_id": s, "level": lvl} for s, lvl in skills.items()],
            "stints": [{"allocation": a, "start_date": s, "end_date": e} for a, s, e in stints]}


@pytest.fixture
def org():
    projects = [
        org_project(1, [req(10, 3, "MUST_HAVE", "React"), req(20, 4, "MUST_HAVE", "Kubernetes")], roster=[1]),
        org_project(2, [req(10, 4, "IMPORTANT", "React"), req(30, 2, "NICE_TO_HAVE", "Figma")], roster=[2, 99]),
        org_project(3, [req(10, 2, "IMPORTANT", "React")], roster=[1]),
    ]
    employees = [
        org_employee(1, {10: 3}),                                   # on P1 and P3, covers React there
        org_employee(2, {30: 2}),                                   # on P2, covers Figma
        org_employee(3, {10: 5}),                                   # free
        org_employee(4, {10: 4, 20: 4}, stints=[(100, "2026-01-01", "2027-12-31")]),  # fully booked
        org_employee(5, {20: 5}, capacity=None),                    # availability not recorded
    ]
    # Employee 99 on P2's roster is inactive: the employee query returns active people only.
    return gg.build_organization_view(projects, employees)


def test_org_summary_counts_needs(org):
    summary = org["summary"]
    assert (summary["skill_needs"], summary["needs_met"], summary["needs_not_met"]) == (5, 3, 2)
    assert summary["urgent_gaps"] == 1
    # P1 lacks Kubernetes and P2 lacks React at level 4; only P3 is fully skilled.
    assert (summary["projects_fully_skilled"], summary["projects_with_needs"]) == (1, 3)


def test_org_by_skill(org):
    rows = {r["skill_name"]: r for r in org["by_skill"]}
    react = rows["React"]
    assert (react["projects_needing"], react["projects_with"], react["projects_without"]) == (3, 2, 1)
    assert react["urgency"] == "IMPORTANT"
    assert react["level_needed"] == 4
    assert react["employees_at_level"] == 2          # employees 3 and 4
    assert react["free_to_join"] == 1                # employee 3; employee 4 is fully booked
    assert react["coverage"] == 67

    kube = rows["Kubernetes"]
    assert kube["urgency"] == "URGENT"
    assert (kube["free_to_join"], kube["availability_unknown"]) == (0, 1)

    assert rows["Figma"]["urgency"] == "NO_GAP"


def test_org_rows_sort_most_urgent_first(org):
    assert [r["skill_name"] for r in org["by_skill"]][0] == "Kubernetes"
    assert org["by_project"][0]["project_id"] == 1


def test_org_by_project_ignores_inactive_roster(org):
    p2 = next(p for p in org["by_project"] if p["project_id"] == 2)
    assert p2["people_assigned"] == 1
    assert (p2["skills_met"], p2["skills_missing"]) == (1, 1)


def test_org_invalid_project_dates_count_as_unknown_availability():
    view = gg.build_organization_view(
        [org_project(1, [req(10, 2)], roster=[], start="2027-05-01", end="2027-01-01")],
        [org_employee(3, {10: 3})],
    )
    row = view["by_skill"][0]
    assert (row["free_to_join"], row["availability_unknown"]) == (0, 1)


# --- Shared helpers -------------------------------------------------------

def test_window_availability_peak_and_unknown_capacity():
    start, end = date(2026, 11, 1), date(2026, 11, 30)
    stints = [(60, date(2026, 10, 1), date(2026, 11, 10)), (50, date(2026, 11, 5), None)]
    result = compute_window_availability(stints, 40, start, end)
    assert result["peak_allocation"] == 110.0
    assert result["remaining_capacity"] == 0.0
    assert compute_window_availability([], None, start, end)["data_quality"] == "unknown"
    with pytest.raises(ValueError):
        compute_window_availability([], 40, end, start)


def test_project_window_defaults():
    today = date.today()
    assert project_window(None, None) == (today, today)
    assert project_window(date(2026, 1, 1), None) == (date(2026, 1, 1), date(2026, 1, 1))
    assert project_window(None, date(2026, 2, 1)) == (date(2026, 2, 1), date(2026, 2, 1))


def test_graph_unavailable_when_disabled(monkeypatch):
    monkeypatch.setattr(gg.graph_service, "is_enabled", lambda: False)
    with pytest.raises(gg.GraphUnavailable):
        gg.organization_skill_gaps()


def test_lost_connection_is_reported_as_unavailable(monkeypatch):
    if not gg._CONNECTION_ERRORS:
        pytest.skip("neo4j driver not installed")
    monkeypatch.setattr(gg.graph_service, "is_enabled", lambda: True)

    def fail(*args, **kwargs):
        raise gg._CONNECTION_ERRORS[0]("connection lost")

    monkeypatch.setattr(gg.graph_service, "run_read", fail)
    with pytest.raises(gg.GraphUnavailable):
        gg.graph_projects()


def test_missing_project_raises_not_found(monkeypatch):
    monkeypatch.setattr(gg.graph_service, "is_enabled", lambda: True)
    monkeypatch.setattr(gg.graph_service, "run_read", lambda query, **params: [])
    with pytest.raises(gg.GraphProjectNotFound):
        gg.project_skill_gaps(123)


# --- Sync pruning ---------------------------------------------------------

class FakeTx:
    def __init__(self):
        self.calls = []

    def run(self, query, **params):
        self.calls.append((" ".join(query.split()), params))
        return N(single=lambda: {"pruned": 0})


def test_prune_removes_nodes_and_relationships_missing_from_postgres():
    pg_data = {
        "employees": [{"id": 1}], "skills": [{"id": 10}], "projects": [{"id": 7}], "certifications": [],
        "employee_skills": [{"employee_id": 1, "skill_id": 10}],
        "project_skills": [{"project_id": 7, "skill_id": 10}],
        "employee_projects": [{"employee_id": 1, "project_id": 7}],
    }
    tx = FakeTx()
    stats = graph_sync_service.prune_stale_tx(tx, pg_data)
    assert set(stats) == {"Employee", "Skill", "Project", "Certification",
                          "HAS_SKILL", "REQUIRES_SKILL", "WORKED_ON", "HAS_CERTIFICATION"}
    by_query = {q: p for q, p in tx.calls}
    assert by_query["MATCH (n:Employee) WHERE NOT n.id IN $ids DETACH DELETE n RETURN count(n) AS pruned"] == {"ids": [1]}
    has_skill = next(p for q, p in tx.calls if "[r:HAS_SKILL]" in q)
    assert has_skill == {"keys": ["1:10"]}


def test_sync_time_is_recorded():
    tx = FakeTx()
    synced_at = graph_sync_service.record_sync_time_tx(tx)
    assert "SyncMeta" in tx.calls[0][0]
    assert tx.calls[0][1]["synced_at"] == synced_at


# --- Related-skill estimates ------------------------------------------------

def rel(skill_id, related_id, related_name, relation_type):
    return {"skill_id": skill_id, "related_id": related_id, "related_name": related_name, "relation_type": relation_type}


RELATED = [
    rel(2, 3, "REST API", "COMPLEMENTARY"),      # FastAPI <- REST API
    rel(4, 5, "JavaScript", "SAME_FAMILY"),      # TypeScript <- JavaScript
    rel(4, 6, "React", "COMPLEMENTARY"),         # TypeScript <- React
]


def index(rows=RELATED):
    return gg._related_index(rows)


def test_estimate_discounts_by_relation_type():
    assert gg.estimate_level(2, {3: 5}, index())["level"] == 3        # complementary: -2
    assert gg.estimate_level(4, {5: 5}, index())["level"] == 4        # same family: -1
    assert gg.estimate_level(2, {3: 1}, index())["level"] == 1        # never below 1


def test_estimate_uses_the_strongest_related_skill():
    guess = gg.estimate_level(4, {5: 3, 6: 5}, index())
    assert (guess["level"], guess["related_skill"]) == (3, "React")


def test_a_recorded_skill_is_never_estimated():
    assert gg.estimate_level(2, {2: 1, 3: 5}, index()) is None
    assert gg.estimate_level(2, {}, index()) is None


def test_project_estimates_never_change_verified_scores():
    requirements = [req(2, 4, "MUST_HAVE", "FastAPI"), req(4, 3, "IMPORTANT", "TypeScript")]
    members = [member(10, {3: 5, 5: 5})]
    plain = gg.build_project_view(PROJECT, requirements, members)
    with_graph = gg.build_project_view(PROJECT, requirements, members, RELATED)

    for key in ("skills_met", "skills_missing", "urgent_gaps", "coverage", "urgency"):
        assert plain["summary"][key] == with_graph["summary"][key], key

    rows = {r["skill_name"]: r for r in with_graph["requirements"]}
    assert rows["FastAPI"]["result"] == "MISSING"
    assert (rows["FastAPI"]["estimate"]["level"], rows["FastAPI"]["estimate"]["likely_met"]) == (3, False)
    assert rows["TypeScript"]["result"] == "MISSING"
    assert rows["TypeScript"]["estimate"]["likely_met"] is True
    assert rows["TypeScript"]["estimate"]["employee_name"] == "Employee 10"
    assert with_graph["summary"]["skills_likely_met"] == 1


def test_met_requirements_get_no_estimate():
    view = gg.build_project_view(PROJECT, [req(2, 2)], [member(10, {2: 3, 3: 5})], RELATED)
    assert view["requirements"][0]["estimate"] is None


def test_inactive_members_give_no_estimates():
    view = gg.build_project_view(PROJECT, [req(4, 3)], [member(10, {5: 5}, active=False)], RELATED)
    assert view["requirements"][0]["estimate"] is None


def test_org_likely_counts_leave_verified_counts_alone():
    projects = [org_project(1, [req(4, 3, "IMPORTANT", "TypeScript"), req(2, 4, "MUST_HAVE", "FastAPI")], roster=[1])]
    employees = [org_employee(1, {5: 5, 3: 5})]
    plain = gg.build_organization_view(projects, employees)
    view = gg.build_organization_view(projects, employees, RELATED)

    for key in ("skill_needs", "needs_met", "needs_not_met", "urgent_gaps", "coverage"):
        assert plain["summary"][key] == view["summary"][key], key
    assert view["summary"]["needs_likely_met"] == 1
    skills = {s["skill_name"]: s for s in view["by_skill"]}
    assert skills["TypeScript"]["projects_likely_with"] == 1
    assert skills["FastAPI"]["projects_likely_with"] == 0
    assert view["by_project"][0]["skills_likely_met"] == 1
