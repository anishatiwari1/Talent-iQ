from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load all SQLAlchemy models so their metadata is registered
from app.models import (
    User,
    Employee,
    Skill,
    EmployeeSkill,
    Project,
    ProjectSkill,
    Certification,
    Availability,
    EmployeeProject,
    Document,
    Team,
    TeamMember,
    Recommendation,
    SkillGap,
    Assignment,
    Notification,
)

from app.api.routes.auth import router as auth_router
from app.api.routes.employees import router as employees_router
from app.api.routes.skills import router as skills_router
from app.api.routes.projects import router as projects_router
from app.api.routes.documents import router as documents_router
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.team_matching import router as team_matching_router
from app.api.routes.skill_gaps import router as skill_gaps_router
from app.api.routes.assignments import router as assignments_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.workforce import router as workforce_router
from app.services import graph_service


app = FastAPI(
    title="TalentIQ API",
    description="Backend API for the TalentIQ Workforce Intelligence Platform",
    version="1.0.0",
)


# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
],
    # Vite moves to the next free port (3001, 5174, ...) when the default
    # is busy; accept any local dev port so login doesn't fail CORS.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(skills_router)
app.include_router(projects_router)
app.include_router(documents_router)
app.include_router(recommendations_router)
app.include_router(team_matching_router)
app.include_router(skill_gaps_router)
app.include_router(assignments_router)
app.include_router(notifications_router)
app.include_router(workforce_router)


@app.on_event("startup")
def on_startup():
    # No-op (logs and stays disabled) unless NEO4J_URI/USER/PASSWORD
    # are configured in the environment -- see graph_service docstring.
    graph_service.init_driver()


@app.on_event("shutdown")
def on_shutdown():
    graph_service.close_driver()


@app.get("/")
def root():
    return {"message": "Welcome to TalentIQ API"}


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "TalentIQ API",
    }