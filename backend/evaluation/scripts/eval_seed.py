import csv
from pathlib import Path
from datetime import datetime, date
import logging
from typing import Dict, Any

from sqlalchemy import func, select

from app.database.postgres import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.skill import Skill
from app.models.employee_skill import EmployeeSkill
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.availability import Availability
from app.models.employee_project import EmployeeProject
from app.core.security import hash_password
from app.services.skill_service import normalize_skill_name

logger = logging.getLogger(__name__)

EVAL_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = EVAL_DIR / "data"

def clean_eval_data(db, commit: bool = True):
    """Deletes EVAL- projects and eval_ users. Pass commit=False to run
    it inside a larger transaction (seed_eval_data does)."""
    print("Cleaning existing evaluation data...")
    db.query(EmployeeProject).filter(EmployeeProject.project.has(Project.name.like("EVAL-%"))).delete(synchronize_session=False)
    db.query(ProjectSkill).filter(ProjectSkill.project.has(Project.name.like("EVAL-%"))).delete(synchronize_session=False)
    db.query(Project).filter(Project.name.like("EVAL-%")).delete(synchronize_session=False)
    
    users_to_delete = db.query(User).filter(User.email.like("eval_%@talentiq.dev")).all()
    user_ids = [u.id for u in users_to_delete]
    
    if user_ids:
        db.query(Availability).filter(Availability.employee.has(Employee.user_id.in_(user_ids))).delete(synchronize_session=False)
        db.query(EmployeeSkill).filter(EmployeeSkill.employee.has(Employee.user_id.in_(user_ids))).delete(synchronize_session=False)
        db.query(Employee).filter(Employee.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
    
    if commit:
        db.commit()


def _get_or_add_skill(db, raw_name: str) -> Skill:
    """Like skill_service.get_or_create_skill, but flushes instead of
    committing, so a failure later in the load rolls back new skills too."""
    canonical = normalize_skill_name(raw_name)
    existing = db.scalar(select(Skill).where(func.lower(Skill.name) == canonical.lower()))
    if existing:
        return existing
    skill = Skill(name=canonical, category="General")
    db.add(skill)
    db.flush()
    return skill


def _project_status(start_date):
    """A fixture project that hasn't started yet is PLANNING. Computed at
    load time because fixture dates are fixed while the load date isn't."""
    return "ACTIVE" if start_date and start_date <= date.today() else "PLANNING"


def seed_eval_data():
    db = SessionLocal()
    try:
        # Clean and load in one transaction: a failed load leaves the
        # previous evaluation data in place instead of a partial set.
        clean_eval_data(db, commit=False)
        print("Seeding evaluation data...")

        # Load Employees
        emp_map = {}
        with open(DATA_DIR / "employees.csv", newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                eval_id = row['eval_employee_id']
                email = f"eval_{eval_id.lower()}@talentiq.dev"
                user = User(
                    email=email,
                    full_name=row['full_name'],
                    password_hash=hash_password("EvalPass123!"),
                    role="EMPLOYEE",
                    is_active=True
                )
                db.add(user)
                db.flush()

                emp = Employee(
                    user_id=user.id,
                    employee_code=f"EVAL_{eval_id}",
                    department=row['department'],
                    job_title=row['job_title'],
                    experience_years=int(row['experience_years']),
                    bio=row['bio'],
                    availability_status="AVAILABLE",
                    is_active=True
                )
                db.add(emp)
                db.flush()
                
                db.add(Availability(
                    employee_id=emp.id,
                    weekly_capacity_hours=40,
                    allocated_hours=0,
                    status="AVAILABLE"
                ))
                emp_map[eval_id] = emp.id

        # Load Skills
        with open(DATA_DIR / "employee_skills.csv", newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                emp_id = emp_map[row['eval_employee_id']]
                skill = _get_or_add_skill(db, row['skill_name'])
                
                db.add(EmployeeSkill(
                    employee_id=emp_id,
                    skill_id=skill.id,
                    proficiency_level=int(row['proficiency_level']),
                    years_of_experience=int(row['years_of_experience']),
                    source="MANUAL"
                ))

        # Load Projects
        proj_map = {}
        with open(DATA_DIR / "projects.csv", newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                eval_id = row['eval_project_id']
                start_date = date.fromisoformat(row['start_date']) if row['start_date'] else None
                proj = Project(
                    name=f"EVAL-{eval_id} {row['name']}",
                    department=row['department'],
                    description=row['description'],
                    status=_project_status(start_date),
                    priority=row['priority'],
                    start_date=start_date,
                    end_date=date.fromisoformat(row['end_date']) if row['end_date'] else None,
                    required_team_size=int(row['required_team_size']) if row.get('required_team_size') else None
                )
                db.add(proj)
                db.flush()
                proj_map[eval_id] = proj.id

        # Load Project Requirements
        with open(DATA_DIR / "project_requirements.csv", newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                proj_id = proj_map[row['eval_project_id']]
                skill = _get_or_add_skill(db, row['skill_name'])
                
                db.add(ProjectSkill(
                    project_id=proj_id,
                    skill_id=skill.id,
                    required_proficiency=int(row['required_proficiency']),
                    importance=row['importance']
                ))

        # Load Availability (EmployeeProjects)
        with open(DATA_DIR / "availability.csv", newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                emp_id = emp_map[row['eval_employee_id']]
                proj_id = proj_map[row['assigned_project_id']]
                
                db.add(EmployeeProject(
                    employee_id=emp_id,
                    project_id=proj_id,
                    status=row['status'],
                    allocation_percentage=int(row['allocation_percentage']),
                    start_date=date.fromisoformat(row['start_date']) if row['start_date'] else None,
                    end_date=date.fromisoformat(row['end_date']) if row['end_date'] else None
                ))

        db.commit()
        print(f"Successfully seeded {len(emp_map)} employees and {len(proj_map)} projects for evaluation.")
        return emp_map, proj_map

    except Exception as e:
        db.rollback()
        print(f"Error seeding eval data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_eval_data()
