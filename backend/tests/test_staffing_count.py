from datetime import date, datetime
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.models.project import Project
from app.models.employee import Employee
from app.models.team import Team, TeamMember
from app.models.employee_project import EmployeeProject
from app.services import project_service, team_service, assignment_service
from app.database.postgres import get_db

from app.database.postgres import SessionLocal



def test_staffing_counts(db: Session, client: TestClient):
    # Setup some basic data
    # Create project
    from app.models.user import User
    import uuid
    uid = uuid.uuid4().hex[:8]
    admin_user = User(email=f"admin_{uid}@test.com", password_hash="hash", full_name="Admin", role="ADMIN")
    db.add(admin_user)
    db.flush()

    project = Project(
        name=f"Internal DevOps Platform {uid}",
        department="Engineering",
        status="PLANNING",
        priority="MEDIUM",
        required_team_size=3
    )
    db.add(project)
    db.flush()

    from app.models.availability import Availability
    
    # Create 4 employees
    emps = []
    for i in range(4):
        emp_user = User(email=f"emp{i}_{uid}@test.com", password_hash="hash", full_name=f"Emp {i}", role="EMPLOYEE")
        db.add(emp_user)
        db.flush()
        emp = Employee(user_id=emp_user.id, employee_code=f"EMP_{uid}_{i}", department="Engineering", job_title="Engineer")
        db.add(emp)
        db.flush()
        avail = Availability(employee_id=emp.id, weekly_capacity_hours=40, allocated_hours=0, status="AVAILABLE")
        db.add(avail)
        emps.append(emp)
    db.flush()

    project_id = project.id

    # Helper to check staffed count via API
    def get_staffed_count():
        # wait, the dependency requires authentication. Let's just use the service instead of API.
        db.refresh(project)
        return len([ep for ep in project.employee_projects if ep.status in ("PLANNED", "ACTIVE")])

    # TEST 1: Project requires 3 employees. No approved team. Expected: 0 / 3 staffed.
    assert get_staffed_count() == 0, "Test 1 Failed"

    # Create a proposed team
    team = Team(project_id=project_id, status="RECOMMENDED", skill_coverage_percentage=100.0)
    db.add(team)
    db.flush()
    for i in range(3):
        db.add(TeamMember(team_id=team.id, employee_id=emps[i].id, role_on_team="Eng"))
    db.commit()

    # TEST 2: Proposed team has 3 employees but manager has not approved it. Expected: 0 / 3 staffed.
    assert get_staffed_count() == 0, "Test 2 Failed"

    # TEST 3: Manager approves 3-person team. Expected: 3 / 3 staffed.
    assignment_service.approve_team(db, team, admin_user)
    assert get_staffed_count() == 3, "Test 3 Failed"

    # TEST 4: Manager excludes one member. Expected: 2 / 3 staffed.
    team_service.remove_member(db, team, emps[2].id)
    assert get_staffed_count() == 2, "Test 4 Failed"

    # TEST 5: Manager replaces excluded member. Expected: 3 / 3 staffed.
    # We use add_member since remove_member already took them out
    team_service.add_member(db, team, emps[3].id, project)
    # Since team is now RECOMMENDED, staffed count remains 2 until approved
    assert get_staffed_count() == 2, "Test 5 (Pre-approve) Failed"
    # Approve again
    assignment_service.approve_team(db, team, admin_user)
    assert get_staffed_count() == 3, "Test 5 Failed"

    # TEST 6: Duplicate employee-project records exist. 
    # Let's verify existing_eps logic prevented duplicates
    eps = db.query(EmployeeProject).filter(EmployeeProject.project_id == project_id).all()
    assert len(eps) == 4 # 3 active, 1 removed
    assert get_staffed_count() == 3, "Test 6 Failed"

    # TEST 7: Rejected team must not contribute to staffed count.
    team2 = Team(project_id=project_id, status="REJECTED")
    db.add(team2)
    db.flush()
    db.add(TeamMember(team_id=team2.id, employee_id=emps[2].id))
    db.commit()
    assert get_staffed_count() == 3, "Test 7 Failed"

    # TEST 8: Old/replaced team members must not contribute to staffed count.
    # emps[2] was replaced, their EP should be REMOVED
    ep_replaced = db.query(EmployeeProject).filter_by(employee_id=emps[2].id, project_id=project_id).first()
    assert ep_replaced.status == "REMOVED", "Test 8 Failed"
    
    # TEST 9: A project can have multiple employees assigned to other projects...
    # (Just verifying it's specific to the project)
    project2 = Project(name="P2", department="D", status="PLANNING", priority="L")
    db.add(project2)
    db.flush()
    ep_other = EmployeeProject(employee_id=emps[0].id, project_id=project2.id, status="ACTIVE", allocation_percentage=100)
    db.add(ep_other)
    db.commit()
    assert get_staffed_count() == 3, "Test 9 Failed"

