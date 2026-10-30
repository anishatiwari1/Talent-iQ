from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_manager
from app.database.postgres import get_db
from app.models.team import Team
from app.models.user import User
from app.services import graph_gap_service, project_service, skill_gap_service, skill_suggestion_service

router = APIRouter(prefix="/api/v1/skill-gaps", tags=["Skill Gaps"])


@router.get("/projects/{project_id}")
def get_project_skill_gaps(
    project_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return skill_gap_service.analyze_project_gaps(db, project)


@router.get("/teams/{team_id}")
def get_team_skill_gaps(
    team_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    return skill_gap_service.analyze_team_gaps(db, project, team)


@router.get("/projects/{project_id}/analysis")
def get_project_skill_gap_analysis(
    project_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return skill_gap_service.project_gap_analysis(db, project)


@router.get("/projects/{project_id}/related-skill-suggestions")
def get_project_related_skill_suggestions(
    project_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Suggestions only: never counted as coverage of a requirement."""
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return skill_suggestion_service.related_skill_suggestions(db, project)


@router.get("/teams/{team_id}/analysis")
def get_team_skill_gap_analysis(
    team_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    return skill_gap_service.team_gap_analysis(db, project, team)


@router.get("/organization")
def get_organization_skill_gaps(
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return skill_gap_service.organization_skill_gap_summary(db)


# --- Knowledge graph (Skill Gaps dashboard) ---------------------------------
# Read only from Neo4j, with no PostgreSQL fallback: if the graph isn't
# connected the dashboard says so instead of silently switching sources.

GRAPH_UNAVAILABLE = (
    "The knowledge graph isn't connected, so skill gaps can't be shown. "
    "Start Neo4j and run the graph sync."
)


@router.get("/graph/organization")
def get_graph_organization_skill_gaps(
    current_user: User = Depends(require_manager),
):
    try:
        return graph_gap_service.organization_skill_gaps()
    except graph_gap_service.GraphUnavailable:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=GRAPH_UNAVAILABLE)


@router.get("/graph/projects")
def list_graph_projects(
    current_user: User = Depends(require_manager),
):
    try:
        return graph_gap_service.graph_projects()
    except graph_gap_service.GraphUnavailable:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=GRAPH_UNAVAILABLE)


@router.get("/graph/projects/{project_id}")
def get_graph_project_skill_gaps(
    project_id: int,
    current_user: User = Depends(require_manager),
):
    try:
        return graph_gap_service.project_skill_gaps(project_id)
    except graph_gap_service.GraphUnavailable:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=GRAPH_UNAVAILABLE)
    except graph_gap_service.GraphProjectNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This project isn't in the knowledge graph yet. Run the graph sync.",
        )
