"""Development seed data (spec Section 26).

Generates realistic, clearly-fictional employees, skills, projects,
and certifications directly into Postgres, so the
dashboards and AI matching system have something real to demonstrate
against. Never used to hardcode fake numbers into the frontend --
everything created here is a normal row the API endpoints already
read/write. Staffing is intentionally left to the explicit manager
approval workflows, so every project starts in PLANNING and moves to
ACTIVE only once a manager approves a full team.

Output is deterministic: the same SEED on an empty database always
produces the same employees, skills, and projects. Dates are relative
to the day the seed runs.

Usage (from backend/, with the venv active and DATABASE_URL set):
    python -m app.seed
Safe to re-run: skips creating a user if that email already exists.
"""
import random
from datetime import date, timedelta

from app.core.security import hash_password
from app.database.postgres import SessionLocal
from app.models.availability import Availability
from app.models.certification import Certification
from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.skill import Skill
from app.models.skill_relation import SkillRelation
from app.models.user import User

SEED = 20260101

SKILLS = [
    ("Python", "Programming Language"), ("JavaScript", "Programming Language"),
    ("TypeScript", "Programming Language"), ("React", "Frontend"),
    ("FastAPI", "Backend Framework"), ("Node.js", "Backend Framework"),
    ("PostgreSQL", "Database"), ("MongoDB", "Database"),
    ("Docker", "DevOps"), ("Kubernetes", "DevOps"),
    ("Amazon Web Services", "Cloud"), ("Machine Learning", "Data & AI"),
    ("Artificial Intelligence", "Data & AI"), ("REST API", "Backend"),
    ("Structured Query Language", "Database"), ("Figma", "Design"),
    ("Project Management", "Soft Skill"), ("System Design", "Architecture"),
    ("Data Engineering", "Data & AI"), ("CI/CD", "DevOps"),
]

FIRST_NAMES = ["Asha", "Rohan", "Meera", "Kabir", "Isha", "Vikram", "Tara", "Dev",
               "Nisha", "Arjun", "Priya", "Sameer", "Anika", "Karan", "Divya", "Rahul"]
LAST_NAMES = ["Sharma", "Verma", "Iyer", "Reddy", "Nair", "Gupta", "Rao", "Mehta",
              "Kapoor", "Joshi", "Chopra", "Malhotra"]

# Each role's department and the skills someone in that role plausibly
# holds, so seeded skills match job titles. Every name is in SKILLS.
ROLES = {
    "Software Engineer": ("Engineering", ["Python", "JavaScript", "React", "REST API", "PostgreSQL", "Docker"]),
    "Senior Software Engineer": ("Engineering", ["Python", "System Design", "PostgreSQL", "REST API", "FastAPI", "Docker", "Amazon Web Services"]),
    "Data Scientist": ("Data & AI", ["Python", "Machine Learning", "Structured Query Language", "Data Engineering", "Artificial Intelligence"]),
    "DevOps Engineer": ("DevOps", ["Docker", "Kubernetes", "CI/CD", "Amazon Web Services", "Python"]),
    "Product Designer": ("Design", ["Figma", "React", "Project Management", "JavaScript"]),
    "Backend Engineer": ("Engineering", ["Python", "FastAPI", "Node.js", "PostgreSQL", "MongoDB", "REST API", "Docker"]),
    "Frontend Engineer": ("Engineering", ["JavaScript", "TypeScript", "React", "REST API", "Figma"]),
    "ML Engineer": ("Data & AI", ["Python", "Machine Learning", "Artificial Intelligence", "Data Engineering", "Docker", "Amazon Web Services"]),
    "QA Engineer": ("Engineering", ["Python", "CI/CD", "JavaScript", "REST API", "Docker"]),
    "Tech Lead": ("Engineering", ["System Design", "Project Management", "Python", "Amazon Web Services", "Kubernetes", "React"]),
}
SENIOR_ROLES = {"Senior Software Engineer", "Tech Lead"}

# (name, department, description, priority, required_team_size,
#  [(skill, required_proficiency, importance), ...])
PROJECTS = [
    ("Customer Portal Revamp", "Product", "Rebuild the customer self-service portal with a modern React frontend and FastAPI backend.", "HIGH", 4,
     [("React", 4, "MUST_HAVE"), ("FastAPI", 3, "MUST_HAVE"), ("PostgreSQL", 3, "IMPORTANT"), ("REST API", 3, "NICE_TO_HAVE")]),
    ("Churn Prediction Model", "Data & AI", "Build a machine learning model to predict customer churn from usage data.", "HIGH", 4,
     [("Python", 4, "MUST_HAVE"), ("Machine Learning", 4, "MUST_HAVE"), ("PostgreSQL", 3, "IMPORTANT"), ("Data Engineering", 3, "IMPORTANT")]),
    ("Internal DevOps Platform", "DevOps", "Standardize CI/CD and container orchestration across engineering teams.", "MEDIUM", 3,
     [("Docker", 4, "MUST_HAVE"), ("Kubernetes", 3, "MUST_HAVE"), ("CI/CD", 3, "IMPORTANT"), ("Amazon Web Services", 3, "NICE_TO_HAVE")]),
    ("Mobile Checkout Redesign", "Product", "Redesign the mobile checkout flow to reduce cart abandonment.", "MEDIUM", 3,
     [("Figma", 4, "MUST_HAVE"), ("React", 3, "IMPORTANT"), ("System Design", 2, "NICE_TO_HAVE")]),
    ("Workforce Analytics Dashboard", "Data & AI", "Internal dashboard surfacing workforce utilization and skill gap metrics.", "LOW", 3,
     [("Python", 3, "MUST_HAVE"), ("PostgreSQL", 3, "IMPORTANT"), ("REST API", 2, "NICE_TO_HAVE")]),
]

# Curated skill relations behind related-skill suggestions (and Neo4j
# RELATED_TO). Undirected; order within a pair doesn't matter.
SKILL_RELATIONS = [
    ("FastAPI", "Python", "FRAMEWORK_OF"),
    ("React", "JavaScript", "FRAMEWORK_OF"),
    ("Node.js", "JavaScript", "FRAMEWORK_OF"),
    ("TypeScript", "JavaScript", "SAME_FAMILY"),
    ("PostgreSQL", "Structured Query Language", "SAME_FAMILY"),
    ("PostgreSQL", "MongoDB", "SAME_FAMILY"),
    ("Machine Learning", "Artificial Intelligence", "SAME_FAMILY"),
    ("Machine Learning", "Data Engineering", "COMPLEMENTARY"),
    ("Docker", "Kubernetes", "COMPLEMENTARY"),
    ("Docker", "CI/CD", "COMPLEMENTARY"),
    ("Kubernetes", "Amazon Web Services", "COMPLEMENTARY"),
    ("FastAPI", "REST API", "COMPLEMENTARY"),
    ("Node.js", "REST API", "COMPLEMENTARY"),
]

CERTIFICATIONS = [
    ("AWS Certified Solutions Architect", "Amazon"),
    ("Certified Kubernetes Administrator", "CNCF"),
    ("PMP Certification", "PMI"),
    ("Google Data Analytics Certificate", "Google"),
]


def get_or_create_user(db, email, full_name, role):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing, False
    user = User(
        email=email, full_name=full_name,
        password_hash=hash_password("Password123!"),
        role=role, is_active=True,
    )
    db.add(user)
    db.flush()
    return user, True


def seed():
    rng = random.Random(SEED)
    db = SessionLocal()
    try:
        print("Seeding TalentIQ demo data...")

        # --- Manager -----------------------------------------------------
        manager, created = get_or_create_user(db, "manager@talentiq.dev", "Workforce Manager", "MANAGER")
        print(f"Manager: {manager.email} ({'created' if created else 'already existed'})")

        # --- Skills -------------------------------------------------------
        skill_objs = {}
        for name, category in SKILLS:
            skill = db.query(Skill).filter(Skill.name == name).first()
            if not skill:
                skill = Skill(name=name, category=category)
                db.add(skill)
                db.flush()
            skill_objs[name] = skill
        print(f"Skills: {len(skill_objs)} available")

        # --- Skill relations ----------------------------------------------
        for name_a, name_b, relation_type in SKILL_RELATIONS:
            low, high = sorted((skill_objs[name_a].id, skill_objs[name_b].id))
            exists = db.query(SkillRelation).filter(
                SkillRelation.skill_id == low, SkillRelation.related_skill_id == high,
            ).first()
            if not exists:
                db.add(SkillRelation(
                    skill_id=low, related_skill_id=high,
                    relation_type=relation_type, source="CURATED",
                ))
        db.flush()
        print(f"Skill relations: {len(SKILL_RELATIONS)} curated")

        # --- Employees ------------------------------------------------
        titles = list(ROLES)
        employees = []
        for i in range(32):
            first, last = FIRST_NAMES[i % len(FIRST_NAMES)], LAST_NAMES[i % len(LAST_NAMES)]
            email = f"{first.lower()}.{last.lower()}{i}@talentiq.dev"
            full_name = f"{first} {last}"
            user, created = get_or_create_user(db, email, full_name, "EMPLOYEE")

            # Rotating through roles guarantees every role is represented.
            job_title = titles[i % len(titles)]
            department, skill_pool = ROLES[job_title]
            senior = job_title in SENIOR_ROLES
            experience_years = rng.randint(6, 12) if senior else rng.randint(1, 8)

            employee = db.query(Employee).filter(Employee.user_id == user.id).first()
            if not employee:
                employee = Employee(
                    user_id=user.id,
                    employee_code=f"EMP-U{user.id}",
                    department=department,
                    job_title=job_title,
                    experience_years=experience_years,
                    bio=f"{full_name} is a {job_title.lower()} focused on delivering reliable software.",
                    availability_status="AVAILABLE",
                )
                db.add(employee)
                db.flush()

                db.add(Availability(
                    employee_id=employee.id,
                    weekly_capacity_hours=40,
                    allocated_hours=0,
                    status="AVAILABLE",
                ))

                # 3-5 skills drawn from the role's own pool
                chosen_skills = rng.sample(skill_pool, k=min(len(skill_pool), rng.randint(3, 5)))
                for skill_name in chosen_skills:
                    db.add(EmployeeSkill(
                        employee_id=employee.id,
                        skill_id=skill_objs[skill_name].id,
                        proficiency_level=rng.randint(3, 5) if senior else rng.randint(2, 4),
                        years_of_experience=rng.randint(1, employee.experience_years or 1),
                        source="MANUAL",
                    ))

                if rng.random() > 0.5:
                    cert_name, issuer = rng.choice(CERTIFICATIONS)
                    db.add(Certification(
                        employee_id=employee.id,
                        name=cert_name,
                        issuer=issuer,
                        issue_date=date.today() - timedelta(days=rng.randint(30, 900)),
                    ))

            employees.append(employee)
        db.commit()
        print(f"Employees: {len(employees)} available")

        # --- Projects -------------------------------------------------
        # Unstaffed and not yet started: PLANNING, matching the approval
        # workflow, which activates a project only once fully staffed.
        projects = []
        for index, (name, dept, desc, priority, team_size, requirements) in enumerate(PROJECTS):
            project = db.query(Project).filter(Project.name == name).first()
            if not project:
                start = date.today() + timedelta(days=14 + 7 * index)
                project = Project(
                    name=name, description=desc, department=dept,
                    status="PLANNING", priority=priority,
                    start_date=start,
                    end_date=start + timedelta(days=120),
                    required_team_size=team_size,
                )
                db.add(project)
                db.flush()
                for skill_name, level, importance in requirements:
                    db.add(ProjectSkill(
                        project_id=project.id, skill_id=skill_objs[skill_name].id,
                        required_proficiency=level,
                        importance=importance,
                    ))
            projects.append(project)
        db.commit()
        print(f"Projects: {len(projects)} available")

        print("\nSeed complete.")
        print("Manager login: manager@talentiq.dev / Password123!")
        print("Employee logins: <firstname>.<lastname><n>@talentiq.dev / Password123!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
