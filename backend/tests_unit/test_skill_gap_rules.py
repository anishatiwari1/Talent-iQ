"""Skill gap calculation rules, exercised with plain stand-in objects.

No database is used: ORM rows are replaced by SimpleNamespace objects with
only the attributes the service reads, and the few DB-backed helpers are
monkeypatched. ReadOnlyDB fails the test on any attempted write.
"""
from types import SimpleNamespace as N

import pytest

from app.services import skill_gap_service as sg


class ReadOnlyDB:
    """Serves queued results to db.scalars() and rejects every write."""

    def __init__(self, *results):
        self.results = list(results)

    def scalars(self, stmt):
        return _Result(self.results.pop(0))

    def _write(self, *args, **kwargs):
        raise AssertionError("skill gap analysis must not write to the database")

    add = add_all = delete = flush = commit = refresh = merge = _write


class _Result(list):
    def all(self):
        return list(self)

    def unique(self):
        return self


def skill_row(skill_id, level, confidence=None, source="MANUAL"):
    return N(skill_id=skill_id, proficiency_level=level, confidence=confidence, source=source)


def employee(employee_id, skills, active=True):
    return N(
        id=employee_id,
        is_active=active,
        employee_skills=skills,
        user=N(full_name=f"Employee {employee_id}"),
    )


def requirement(skill_id, level, importance="IMPORTANT", project_id=7, project=None):
    return N(
        skill_id=skill_id,
        required_proficiency=level,
        importance=importance,
        project_id=project_id,
        project=project,
        skill=N(name=f"Skill {skill_id}"),
    )


def project(requirements=(), required_team_size=5, project_id=7):
    return N(
        id=project_id,
        name="Customer Portal Revamp",
        department="Product",
        status="ACTIVE",
        required_team_size=required_team_size,
        project_skills=list(requirements),
    )


# --- Requirement rule ---------------------------------------------------

def test_best_single_member_is_used_not_the_sum():
    members = [employee(1, [skill_row(1, 2)]), employee(2, [skill_row(1, 3)])]
    row = sg._evaluate_requirement(requirement(1, 4, "MUST_HAVE"), members)
    assert row["current_level"] == 3
    assert row["gap"] == 1
    assert row["coverage_status"] == "BELOW_REQUIRED"
    assert row["severity"] == "MEDIUM"
    assert row["qualified_members"] == 0


def test_met_requirement_counts_every_qualified_member():
    members = [employee(1, [skill_row(1, 4)]), employee(2, [skill_row(1, 5)]), employee(3, [skill_row(1, 2)])]
    row = sg._evaluate_requirement(requirement(1, 4), members)
    assert (row["current_level"], row["gap"], row["severity"]) == (5, 0, "NONE")
    assert row["coverage_status"] == "MET"
    assert row["qualified_members"] == 2


def test_missing_skill_record_is_not_evidenced_rather_than_zero():
    members = [employee(1, [skill_row(2, 5)])]
    row = sg._evaluate_requirement(requirement(1, 3, "NICE_TO_HAVE"), members)
    assert row["current_level"] is None
    assert row["coverage_status"] == "NOT_EVIDENCED"
    # Worst case is assumed for gap and severity, and labelled as such.
    assert row["gap"] == 3
    assert row["severity"] == "MEDIUM"
    assert row["best_holder_source"] is None


def test_empty_roster_is_reported_as_no_staff():
    row = sg._evaluate_requirement(requirement(1, 4, "MUST_HAVE"), [])
    assert row["coverage_status"] == "NO_STAFF"
    assert row["current_level"] is None
    assert row["severity"] == "HIGH"


def test_best_holder_prefers_manual_record_on_a_tie():
    members = [
        employee(1, [skill_row(1, 4, confidence=0.6, source="LLM_EXTRACTION")]),
        employee(2, [skill_row(1, 4)]),
        employee(3, [skill_row(1, 3, confidence=0.99, source="LLM_EXTRACTION")]),
    ]
    row = sg._evaluate_requirement(requirement(1, 4), members)
    assert row["best_holder_source"] == "MANUAL"
    assert row["best_holder_confidence"] is None


def test_requirement_row_keeps_original_response_keys():
    row = sg._evaluate_requirement(requirement(1, 2), [employee(1, [skill_row(1, 2)])])
    for key in ("skill_id", "skill_name", "current_level", "required_level", "gap", "severity"):
        assert key in row
    assert row["importance"] == "IMPORTANT"
    assert row["project_id"] == 7


# --- Staffing completeness ---------------------------------------------

@pytest.mark.parametrize(
    "target, active_count, status, shortfall",
    [
        (5, 0, "UNSTAFFED", 5),
        (None, 2, "UNKNOWN_TARGET", None),
        (5, 3, "UNDERSTAFFED", 2),
        (3, 3, "COMPLETE", 0),
        (2, 3, "OVERSTAFFED", 0),
    ],
)
def test_staffing_status(target, active_count, status, shortfall):
    staff = [employee(i, []) for i in range(active_count)]
    summary = sg._staffing_summary(project(required_team_size=target), staff)
    assert summary["status"] == status
    assert summary["staffed_count"] == active_count
    assert summary["shortfall"] == shortfall


def test_inactive_staff_are_listed_but_not_counted():
    staff = [employee(1, []), employee(2, [], active=False)]
    summary = sg._staffing_summary(project(required_team_size=2), staff)
    assert summary["staffed_count"] == 1
    assert summary["status"] == "UNDERSTAFFED"
    assert summary["inactive_members"] == [{"employee_id": 2, "employee_name": "Employee 2"}]


# --- Project view -------------------------------------------------------

def _patch_staffing(monkeypatch, employees):
    monkeypatch.setattr(
        sg.project_service, "get_project_staffing",
        lambda db, p: [N(employee=e, employee_id=e.id) for e in employees],
    )


def test_project_gaps_use_only_active_staffed_employees(monkeypatch):
    inactive_expert = employee(2, [skill_row(1, 5)], active=False)
    _patch_staffing(monkeypatch, [employee(1, [skill_row(1, 2)]), inactive_expert])
    [row] = sg.analyze_project_gaps(ReadOnlyDB(), project([requirement(1, 4, "MUST_HAVE")]))
    assert row["current_level"] == 2
    assert row["gap"] == 2
    assert row["severity"] == "HIGH"


def test_project_with_no_staff_reports_no_staff_even_if_experts_exist(monkeypatch):
    # Experts elsewhere in the organization are never consulted.
    _patch_staffing(monkeypatch, [])
    [row] = sg.analyze_project_gaps(ReadOnlyDB(), project([requirement(1, 3)]))
    assert row["coverage_status"] == "NO_STAFF"


@pytest.mark.parametrize(
    "team_member_ids, expected_mismatch",
    [([1, 2], False), ([1], True), ([1, 2, 3], True)],
)
def test_project_analysis_flags_roster_mismatch(monkeypatch, team_member_ids, expected_mismatch):
    _patch_staffing(monkeypatch, [employee(1, []), employee(2, [])])
    approved = N(id=12, members=[N(employee_id=i) for i in team_member_ids])
    monkeypatch.setattr(sg.team_service, "get_approved_team", lambda db, p: approved)
    result = sg.project_gap_analysis(ReadOnlyDB(), project([requirement(1, 3)], required_team_size=2))
    assert result["roster_source"] == "APPROVED_STAFFING"
    assert result["approved_team_id"] == 12
    assert result["roster_mismatch"] is expected_mismatch
    assert result["staffing"]["status"] == "COMPLETE"
    assert result["project"]["id"] == 7


def test_project_analysis_without_approved_team_is_not_a_mismatch(monkeypatch):
    _patch_staffing(monkeypatch, [employee(1, [])])
    monkeypatch.setattr(sg.team_service, "get_approved_team", lambda db, p: None)
    result = sg.project_gap_analysis(ReadOnlyDB(), project())
    assert result["approved_team_id"] is None
    assert result["roster_mismatch"] is False


# --- Team view ----------------------------------------------------------

def _team(status, members, team_id=12):
    return N(id=team_id, status=status, members=[N(employee=m) for m in members])


@pytest.mark.parametrize(
    "status, is_current",
    [("DRAFT", True), ("RECOMMENDED", True), ("APPROVED", True), ("SUPERSEDED", False), ("REJECTED", False)],
)
def test_team_rows_carry_team_status(status, is_current):
    rows = sg.analyze_team_gaps(ReadOnlyDB(), project([requirement(1, 3)]), _team(status, [employee(1, [skill_row(1, 3)])]))
    assert rows[0]["team_id"] == 12
    assert rows[0]["team_status"] == status
    assert rows[0]["is_current"] is is_current


def test_team_gaps_ignore_inactive_members():
    members = [employee(1, [skill_row(1, 2)]), employee(2, [skill_row(1, 5)], active=False)]
    [row] = sg.analyze_team_gaps(ReadOnlyDB(), project([requirement(1, 4)]), _team("RECOMMENDED", members))
    assert row["current_level"] == 2
    assert row["coverage_status"] == "BELOW_REQUIRED"


def test_team_analysis_reports_the_teams_own_project():
    members = [employee(1, [skill_row(1, 4)]), employee(2, [], active=False)]
    result = sg.team_gap_analysis(ReadOnlyDB(), project([requirement(1, 4)], required_team_size=3), _team("APPROVED", members))
    assert result["roster_source"] == "TEAM"
    assert result["project"] == {"id": 7, "name": "Customer Portal Revamp", "department": "Product", "status": "ACTIVE"}
    assert result["staffing"]["status"] == "UNDERSTAFFED"
    assert result["staffing"]["staffed_count"] == 1
    assert result["gaps"][0]["coverage_status"] == "MET"


# --- Organization view --------------------------------------------------

@pytest.fixture
def org_summary(monkeypatch):
    """P1 is staffed by employee 1; P2 is unstaffed; P3 has dates that
    don't form a valid window. Employee 2 has free capacity, 3 has none,
    4 has no availability record."""
    p1, p2, p3 = N(id=1), N(id=2), N(id=3)
    requirements = [
        requirement(10, 3, project=p1),  # covered by employee 1 at exactly 3
        requirement(10, 4, project=p2),  # uncovered; 2 and 3 qualify, only 2 is free
        requirement(20, 3, project=p2),  # only employee 3, who has no capacity
        requirement(30, 2, project=p1),  # only employee 4, capacity unknown
        requirement(40, 2, project=p1),  # two uncovered, one free person
        requirement(40, 2, project=p2),
        requirement(50, 2, project=p3),  # invalid project window
    ]
    employees = [
        employee(1, [skill_row(10, 3)]),
        employee(2, [skill_row(10, 5), skill_row(40, 2)]),
        employee(3, [skill_row(10, 4), skill_row(20, 3)]),
        employee(4, [skill_row(30, 4), skill_row(50, 3)]),
    ]
    staffing = {1: [N(employee_id=1)], 2: [], 3: []}
    monkeypatch.setattr(sg.project_service, "get_project_staffing", lambda db, p: staffing[p.id])

    calls = []

    def availability(db, emp, proj):
        calls.append((emp.id, proj.id))
        if proj.id == 3:
            raise ValueError("window_end must be on or after window_start")
        if emp.id == 4:
            return {"data_quality": "unknown", "remaining_capacity": None}
        return {"data_quality": "ok", "remaining_capacity": 40.0 if emp.id == 2 else 0.0}

    monkeypatch.setattr(sg, "get_project_availability", availability)
    rows = sg.organization_skill_gap_summary(ReadOnlyDB(requirements, employees))
    return {row["skill_id"]: row for row in rows}, calls


def test_org_risk_levels(org_summary):
    rows, _ = org_summary
    assert rows[10]["shortage_risk"] == "OK"
    assert rows[20]["shortage_risk"] == "SHORTAGE"
    assert rows[30]["shortage_risk"] == "CAPACITY_UNKNOWN"
    assert rows[40]["shortage_risk"] == "TIGHT"
    assert rows[50]["shortage_risk"] == "CAPACITY_UNKNOWN"
    for row in rows.values():
        assert row["insufficient_coverage"] is (row["shortage_risk"] != "OK")


def test_org_demand_excludes_requirements_covered_by_staff(org_summary):
    rows, _ = org_summary
    assert rows[10]["projects_requiring"] == 2
    assert rows[10]["requirements_covered"] == 1
    assert rows[10]["requirements_uncovered"] == 1
    assert rows[10]["coverage_ratio"] == 0.5


def test_org_coverage_ratio_is_a_bounded_share(org_summary):
    rows, _ = org_summary
    for row in rows.values():
        assert 0 <= row["coverage_ratio"] <= 1


def test_org_counts_distinct_available_and_unknown_people(org_summary):
    rows, _ = org_summary
    # Employee 3 qualifies for skill 10 on P2 but has no free capacity.
    assert rows[10]["employees_qualified_available"] == 1
    assert rows[30]["employees_capacity_unknown"] == 1
    assert rows[40]["employees_qualified_available"] == 1
    assert rows[40]["requirements_uncovered"] == 2


def test_org_qualified_count_uses_highest_required_level(org_summary):
    rows, _ = org_summary
    # Highest level for skill 10 is 4: employees 2 and 3, not employee 1.
    assert rows[10]["max_required_level"] == 4
    assert rows[10]["employees_qualified"] == 2
    assert rows[10]["employees_with_skill_any_level"] == 3


def test_org_checks_availability_once_per_employee_and_project(org_summary):
    _, calls = org_summary
    assert len(calls) == len(set(calls))


def test_org_sorts_most_urgent_first(org_summary):
    rows, _ = org_summary
    ranks = [sg.SHORTAGE_RISK_RANK[row["shortage_risk"]] for row in rows.values()]
    assert ranks == sorted(ranks, reverse=True)
