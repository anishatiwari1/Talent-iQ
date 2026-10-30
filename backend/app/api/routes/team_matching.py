from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_manager
from app.database.postgres import get_db
from app.models.team import Team
from app.models.user import User
from app.schemas.recommendation import MemberSkillOut, TeamCreateIn, TeamDecisionIn, TeamMemberOut, TeamProposalOut
from app.services import assignment_service, employee_service, project_service, team_service

router = APIRouter(prefix="/api/v1/team-matching", tags=["AI Team Matching"])


def _serialize_member(member, project, delivered_counts: dict, db: Session) -> TeamMemberOut:
    employee = member.employee
    held = {es.skill_id: es for es in employee.employee_skills}
    staffing = next(
        (ep for ep in employee.employee_projects if ep.project_id == project.id and ep.status == "ACTIVE"),
        None,
    )
    snapshot = employee_service.get_current_availability_snapshot(db, employee.id)
    return TeamMemberOut(
        employee_id=member.employee_id,
        employee_name=employee.user.full_name,
        role_on_team=member.role_on_team,
        match_score=member.match_score or 0.0,
        matched_skills=[es.skill.name for es in employee.employee_skills],
        job_title=employee.job_title,
        department=employee.department,
        email=employee.user.email,
        avatar_url=employee_service.avatar_url(employee),
        experience_years=employee.experience_years,
        delivered_projects_count=delivered_counts.get(employee.id, 0),
        allocation_percentage=staffing.allocation_percentage if staffing else None,
        utilization_percentage=snapshot["utilization_percentage"],
        availability_status=snapshot["status"],
        required_skills=[
            MemberSkillOut(
                name=ps.skill.name,
                level=held[ps.skill_id].proficiency_level if ps.skill_id in held else None,
                required_level=ps.required_proficiency,
                meets_requirement=ps.skill_id in held and held[ps.skill_id].proficiency_level >= ps.required_proficiency,
            )
            for ps in project.project_skills
            if ps.skill_id in held
        ],
    )


def _serialize(team: Team, project, db: Session) -> TeamProposalOut:
    delivered_counts = employee_service.delivered_project_counts(db, [m.employee_id for m in team.members])
    members = [_serialize_member(m, project, delivered_counts, db) for m in team.members]
    # Best-matched members first, so the strongest fit leads the roster.
    members.sort(key=lambda member: -member.match_score)
    return TeamProposalOut(
        team_id=team.id,
        project_id=team.project_id,
        status=team.status,
        skill_coverage_percentage=team.skill_coverage_percentage or 0.0,
        members=members,
        remaining_gaps=team_service.get_remaining_gaps(project, team),
        availability_data_missing=team_service.get_capacity_unknown_candidates(db, project),
    )


@router.post("/projects/{project_id}/form-team", response_model=TeamProposalOut, status_code=status.HTTP_201_CREATED)
def form_team(
    project_id: int,
    team_size: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    try:
        team = team_service.form_team(db, project, team_size)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(team, project, db)


@router.get("/projects/{project_id}/teams/current")
def get_current_teams(
    project_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """The approved (staffed) team plus any unapproved proposal made
    after it, so the Teams and Recommendations pages show the same state."""
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    approved = team_service.get_approved_team(db, project)
    pending = team_service.get_pending_proposal(db, project, approved)
    return {
        "approved": _serialize(approved, project, db) if approved else None,
        "pending": _serialize(pending, project, db) if pending else None,
    }


@router.post("/projects/{project_id}/teams", response_model=TeamProposalOut, status_code=status.HTTP_201_CREATED)
def create_team_from_selection(
    project_id: int,
    payload: TeamCreateIn,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Builds a team from the manager's own selection (e.g. picked on the
    Recommendations page); with approve=true it is staffed immediately."""
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    try:
        team = team_service.create_team_from_selection(db, project, payload.employee_ids)
        if payload.approve:
            assignment_service.approve_team(db, team, current_user, payload.employee_ids)
            db.refresh(team)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(team, project, db)


@router.get("/projects/{project_id}/approved-team", response_model=TeamProposalOut)
def get_approved_team(
    project_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.get_project_or_404(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        
    team = team_service.get_approved_team(db, project)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No approved team found")
        
    return _serialize(team, project, db)


@router.post("/teams/{team_id}/regenerate", response_model=TeamProposalOut)
def regenerate_team(
    team_id: int,
    team_size: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    try:
        new_team = team_service.regenerate_team(db, project, team_size)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(new_team, project, db)


@router.get("/teams/{team_id}/candidates")
def list_replacement_candidates(
    team_id: int,
    limit: int = 0,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    return team_service.replacement_candidates(db, team, project, limit=limit)


@router.post("/teams/{team_id}/members/{employee_id}/replace-with/{new_employee_id}", response_model=TeamProposalOut)
def replace_member(
    team_id: int,
    employee_id: int,
    new_employee_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    try:
        team = team_service.replace_member(db, team, employee_id, new_employee_id, project)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(team, project, db)


@router.delete("/teams/{team_id}/members/{employee_id}", response_model=TeamProposalOut)
def remove_member(
    team_id: int,
    employee_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    try:
        team = team_service.remove_member(db, team, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(team, project, db)


@router.post("/teams/{team_id}/members/{employee_id}", response_model=TeamProposalOut)
def add_member(
    team_id: int,
    employee_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)
    try:
        team = team_service.add_member(db, team, employee_id, project)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _serialize(team, project, db)


@router.post("/teams/{team_id}/decision", response_model=TeamProposalOut)
def decide_team(
    team_id: int,
    payload: TeamDecisionIn,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Final manager review step (Phase 12): APPROVE creates real
    Assignment + EmployeeProject rows for every member (or the
    manager's modified roster); REJECT just closes the proposal out."""
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    project = project_service.get_project_or_404(db, team.project_id)

    if payload.action.upper() == "APPROVE":
        try:
            assignment_service.approve_team(db, team, current_user, payload.employee_ids)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    elif payload.action.upper() == "REJECT":
        try:
            assignment_service.reject_team(db, team)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="action must be APPROVE or REJECT")

    db.refresh(team)
    return _serialize(team, project, db)
