import re
from sqlalchemy.orm import Session
from app.database.postgres import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.project import Project
from app.models.team import Team, TeamMember
from app.models.employee_project import EmployeeProject
from app.models.assignment import Assignment
from app.models.availability import Availability
from app.models.notification import Notification

def run_audit():
    db = SessionLocal()
    
    # Audit Users
    all_users = db.query(User).all()
    test_users = [u for u in all_users if "admin_" in u.email or "emp" in u.email and "_test" not in u.email and "@test.com" in u.email]
    # More precise check: admin_UUID@test.com, empN_UUID@test.com, admin@test.com, empN@test.com
    test_emails_pattern = re.compile(r"^(admin|emp\d)(_[a-f0-9]{8})?@test\.com$")
    test_users = [u for u in all_users if test_emails_pattern.match(u.email)]
    
    # Audit Employees
    test_user_ids = [u.id for u in test_users]
    test_employees = db.query(Employee).filter(Employee.user_id.in_(test_user_ids)).all() if test_user_ids else []
    
    # Let's also check for EMP_UUID_x
    test_emp_codes = re.compile(r"^EMP_[a-f0-9]{8}_\d$")
    test_employees.extend([e for e in db.query(Employee).all() if e.employee_code and test_emp_codes.match(e.employee_code) and e not in test_employees])
    test_employees = list(set(test_employees))
    
    # Audit Projects
    all_projects = db.query(Project).all()
    test_proj_pattern = re.compile(r"^(Internal DevOps Platform\s[a-f0-9]{8}|P2)$")
    test_projects = [p for p in all_projects if test_proj_pattern.match(p.name)]
    
    # Dependent records
    test_emp_ids = [e.id for e in test_employees]
    test_proj_ids = [p.id for p in test_projects]
    
    test_eps = []
    test_teams = []
    test_team_members = []
    test_assignments = []
    test_availabilities = []
    test_notifications = []
    
    if test_emp_ids or test_proj_ids:
        test_eps = db.query(EmployeeProject).filter(
            (EmployeeProject.employee_id.in_(test_emp_ids)) | (EmployeeProject.project_id.in_(test_proj_ids))
        ).all()
        
        test_teams = db.query(Team).filter(Team.project_id.in_(test_proj_ids)).all()
        test_team_ids = [t.id for t in test_teams]
        
        test_team_members = db.query(TeamMember).filter(
            (TeamMember.team_id.in_(test_team_ids)) | (TeamMember.employee_id.in_(test_emp_ids))
        ).all()
        
        test_assignments = db.query(Assignment).filter(
            (Assignment.project_id.in_(test_proj_ids)) | 
            (Assignment.team_id.in_(test_team_ids)) | 
            (Assignment.employee_id.in_(test_emp_ids))
        ).all()
        
        test_availabilities = db.query(Availability).filter(Availability.employee_id.in_(test_emp_ids)).all()
        
        test_notifications = db.query(Notification).filter(Notification.user_id.in_(test_user_ids)).all()

    real_users = len(all_users) - len(test_users)
    real_employees = len(db.query(Employee).all()) - len(test_employees)
    real_projects = len(all_projects) - len(test_projects)
    
    print("--- DATABASE AUDIT REPORT ---")
    print(f"Total Users: {len(all_users)} | Test Users to remove: {len(test_users)} | Real Users to preserve: {real_users}")
    print(f"Total Employees: {len(db.query(Employee).all())} | Test Employees to remove: {len(test_employees)} | Real Employees to preserve: {real_employees}")
    print(f"Total Projects: {len(all_projects)} | Test Projects to remove: {len(test_projects)} | Real Projects to preserve: {real_projects}")
    
    print(f"\nDependent records to remove:")
    print(f"- EmployeeProject records: {len(test_eps)}")
    print(f"- Teams: {len(test_teams)}")
    print(f"- TeamMembers: {len(test_team_members)}")
    print(f"- Assignments: {len(test_assignments)}")
    print(f"- Availabilities: {len(test_availabilities)}")
    print(f"- Notifications: {len(test_notifications)}")
    
    print("\nTest Projects detected:")
    for p in test_projects:
        print(f"  - {p.id}: {p.name}")
        
    print("\nTest Employees detected:")
    for e in test_employees:
        print(f"  - {e.id}: {e.employee_code} (User {e.user.email})")

if __name__ == "__main__":
    run_audit()
