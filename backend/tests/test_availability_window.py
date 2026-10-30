from datetime import date
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.project import Project
from app.services.assignment_service import _split_team_allocation_percentages, approve_team
from app.services import employee_service
from app.services.employee_service import get_availability_for_window
from app.services.recommendation_service import get_project_availability, score_employee_for_project
from app.services import team_service


class FakeSession:
    def __init__(self, availability, projects):
        self.availability = availability
        self.projects = projects

    def scalar(self, _statement):
        return self.availability

    def scalars(self, _statement):
        return SimpleNamespace(all=lambda: self.projects)

    def commit(self):
        pass

    def refresh(self, _record):
        pass


def staffing(start, end, allocation, project_start=None, project_end=None, status="ACTIVE"):
    project = Project(
        id=100 + allocation,
        name="Staffing fixture",
        department="Engineering",
        status="PLANNING",
        priority="MEDIUM",
        start_date=project_start,
        end_date=project_end,
    )
    project.project_skills = []
    return EmployeeProject(
        employee_id=1,
        project_id=project.id,
        status=status,
        allocation_percentage=allocation,
        start_date=start,
        end_date=end,
        project=project,
    )


availability = SimpleNamespace(weekly_capacity_hours=40)
project_a = staffing(None, None, 50, date(2026, 10, 1), date(2026, 12, 31))
project_b = staffing(None, None, 30, date(2026, 11, 1), date(2027, 5, 31))

scenario_a = get_availability_for_window(
    FakeSession(availability, [project_a, project_b]),
    1,
    date(2026, 11, 1),
    date(2027, 1, 31),
)
assert scenario_a["peak_allocation"] == 80.0
assert scenario_a["remaining_capacity"] == 20.0
print("a)", scenario_a)

scenario_b = get_availability_for_window(
    FakeSession(availability, [project_a, project_b]),
    1,
    date(2027, 3, 1),
    date(2027, 4, 30),
)
assert scenario_b["peak_allocation"] == 30.0
assert scenario_b["remaining_capacity"] == 70.0
print("b)", scenario_b)

scenario_c = get_availability_for_window(
    FakeSession(availability, [staffing(date(2026, 10, 1), None, 100)]),
    1,
    date(2030, 1, 1),
    date(2030, 1, 31),
)
assert scenario_c["peak_allocation"] == 100.0
assert scenario_c["remaining_capacity"] == 0.0
print("c)", scenario_c)

scenario_d = get_availability_for_window(
    FakeSession(None, []), 1, date(2026, 11, 1), date(2027, 1, 31)
)
assert scenario_d["data_quality"] == "unknown"
assert scenario_d["remaining_capacity"] is None
print("d)", scenario_d)

scenario_e = get_availability_for_window(
    FakeSession(availability, [project_a]),
    1,
    date(2027, 1, 1),
    date(2027, 1, 31),
)
assert scenario_e["peak_allocation"] == 0.0
assert scenario_e["remaining_capacity"] == 100.0
print("e)", scenario_e)

today = date.today()
undated_project = Project(
    id=201,
    name="Undated fixture",
    department="Engineering",
    status="PLANNING",
    priority="MEDIUM",
)
today_employee = Employee(
    id=1,
    user_id=1,
    employee_code="TEST-1",
    department="Engineering",
    job_title="Engineer",
    experience_years=0,
    availability_status="AVAILABLE",
    is_active=True,
)
today_staffing = staffing(None, None, 40, today, today)
today_fallback = get_project_availability(
    FakeSession(availability, [today_staffing]), today_employee, undated_project
)
assert today_fallback["peak_allocation"] == 40.0
print("undated project uses today", today_fallback)

team_allocations = _split_team_allocation_percentages(2)
assert team_allocations == [50, 50]
print("team allocation (2 members)", team_allocations)

employee = Employee(
    id=1,
    user_id=1,
    employee_code="TEST-1",
    department="Engineering",
    job_title="Engineer",
    experience_years=0,
    bio=None,
    availability_status="AVAILABLE",
    is_active=True,
)
employee.employee_skills = []


def score_for_window(start, end, availability_row, staffing_rows):
    project = Project(
        id=200,
        name="Scoring fixture",
        department="Engineering",
        status="PLANNING",
        priority="MEDIUM",
        start_date=start,
        end_date=end,
    )
    project.project_skills = []
    with patch("app.services.recommendation_service.embedding_service.is_enabled", return_value=False):
        return score_employee_for_project(
            FakeSession(availability_row, staffing_rows), employee, project
        )


scored_a = score_for_window(date(2026, 11, 1), date(2027, 1, 31), availability, [project_a, project_b])
assert scored_a["contributing_factors"]["current_utilization_percentage"] == 80.0
assert scored_a["contributing_factors"]["available_capacity_percentage"] == 20.0
print("a) scorer", scored_a["contributing_factors"])

scored_b = score_for_window(date(2027, 3, 1), date(2027, 4, 30), availability, [project_a, project_b])
assert scored_b["contributing_factors"]["current_utilization_percentage"] == 30.0
assert scored_b["contributing_factors"]["available_capacity_percentage"] == 70.0
print("b) scorer", scored_b["contributing_factors"])

scored_c = score_for_window(
    date(2030, 1, 1), date(2030, 1, 31), availability,
    [staffing(date(2026, 10, 1), None, 100)],
)
assert scored_c["contributing_factors"]["current_utilization_percentage"] == 100.0
assert scored_c["contributing_factors"]["available_capacity_percentage"] == 0.0
print("c) scorer", scored_c["contributing_factors"])

scored_d = score_for_window(date(2026, 11, 1), date(2027, 1, 31), None, [])
assert scored_d["contributing_factors"]["capacity_unknown"] is True
assert scored_d["contributing_factors"]["available_capacity_percentage"] is None
assert "availability data missing" in scored_d["reason"]
print("d) scorer", scored_d["contributing_factors"], scored_d["reason"])

scored_e = score_for_window(date(2027, 1, 1), date(2027, 1, 31), availability, [project_a])
assert scored_e["contributing_factors"]["current_utilization_percentage"] == 0.0
assert scored_e["contributing_factors"]["available_capacity_percentage"] == 100.0
print("e) scorer", scored_e["contributing_factors"])


class EmployeeRows:
    def __init__(self, employees):
        self.employees = employees

    def unique(self):
        return self

    def all(self):
        return self.employees


class TeamSession:
    def __init__(self, employees):
        self.employees = employees
        self.added = []
        self.next_team_id = 1

    def scalars(self, _statement):
        return EmployeeRows(self.employees)

    def add(self, record):
        self.added.append(record)

    def flush(self):
        for record in self.added:
            if hasattr(record, "project_id") and not getattr(record, "id", None):
                record.id = self.next_team_id
                self.next_team_id += 1

    def commit(self):
        pass

    def refresh(self, _record):
        pass


unknown_candidate = SimpleNamespace(id=10, user=SimpleNamespace(full_name="Unknown Capacity"), employee_skills=[], job_title="Engineer")
eligible_candidate = SimpleNamespace(id=11, user=SimpleNamespace(full_name="Eligible"), employee_skills=[], job_title="Engineer")
full_candidate = SimpleNamespace(id=12, user=SimpleNamespace(full_name="Fully Allocated"), employee_skills=[], job_title="Engineer")
candidate_capacity = {
    10: {"data_quality": "unknown", "remaining_capacity": None, "peak_allocation": 0.0},
    11: {"data_quality": "ok", "remaining_capacity": 100.0, "peak_allocation": 0.0},
    12: {"data_quality": "ok", "remaining_capacity": 0.0, "peak_allocation": 100.0},
}
team_project = SimpleNamespace(id=20, project_skills=[], required_team_size=2)
team_db = TeamSession([unknown_candidate, eligible_candidate, full_candidate])

with patch.object(team_service, "get_project_availability", side_effect=lambda _db, candidate, _project: candidate_capacity[candidate.id]), patch.object(
    team_service, "score_employee_for_project", return_value={"score": 80.0}
):
    team_service.form_team(team_db, team_project, 2)
    missing_capacity_names = team_service.get_capacity_unknown_candidates(team_db, team_project)

proposed_member_ids = [record.employee_id for record in team_db.added if hasattr(record, "employee_id")]
assert proposed_member_ids == [eligible_candidate.id]
assert missing_capacity_names == [unknown_candidate.user.full_name]
print("team candidates", proposed_member_ids, "availability data missing", missing_capacity_names)


class ApprovalSession:
    def __init__(self, project, employees):
        self.project = project
        self.employees = employees
        self.added = []

    def get(self, model, record_id):
        if model.__name__ == "Project":
            return self.project
        return self.employees.get(record_id)

    def add(self, record):
        self.added.append(record)

    def commit(self):
        pass

    def refresh(self, _record):
        pass


approval_project = SimpleNamespace(
    id=30, name="Approval Test Project", status="ACTIVE", required_team_size=2,
    start_date=date(2026, 11, 1), end_date=date(2027, 1, 31),
)
approval_employees = {
    21: SimpleNamespace(id=21, job_title="Engineer", user_id=121),
    22: SimpleNamespace(id=22, job_title="Engineer", user_id=122),
}
approval_team = SimpleNamespace(
    id=31, project_id=approval_project.id, status="RECOMMENDED",
    members=[SimpleNamespace(employee_id=21), SimpleNamespace(employee_id=22)],
)
approval_db = ApprovalSession(approval_project, approval_employees)
approver = SimpleNamespace(id=1, full_name="Manager")

with patch("app.services.assignment_service.employee_service.recompute_allocated_hours"), patch(
    "app.services.assignment_service.notification_service.create_notification"
):
    approve_team(approval_db, approval_team, approver)

approved_allocations = [
    record.allocation_percentage
    for record in approval_db.added
    if isinstance(record, EmployeeProject)
]
assert approved_allocations == [50, 50]
print("approved two-member allocations", approved_allocations)

cache_availability = SimpleNamespace(weekly_capacity_hours=40, allocated_hours=0, status="AVAILABLE")
cache_employee = SimpleNamespace(id=40, availability_status="AVAILABLE")
cache_db = FakeSession(cache_availability, [])
with patch.object(
    employee_service,
    "get_availability_for_window",
    return_value={"peak_allocation": 75.0, "data_quality": "ok"},
) as window_calculator:
    employee_service.recompute_allocated_hours(cache_db, cache_employee)

assert window_calculator.call_args.args[1:] == (cache_employee.id, today, today)
assert cache_availability.allocated_hours == 30
assert cache_availability.status == "PARTIALLY_AVAILABLE"
print("today cache", cache_availability.allocated_hours, cache_availability.status)