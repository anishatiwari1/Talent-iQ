from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class RecommendationOut(BaseModel):
    employee_id: int
    employee_name: str
    department: str
    job_title: str
    score: float
    rank: int
    matched_skills: List[str]
    missing_skills: List[str]
    experience_years: int
    semantic_similarity: float
    current_utilization_percentage: Optional[float]
    available_capacity_percentage: Optional[float]
    reason: str
    contributing_factors: dict
    recommendation_id: Optional[int] = None
    avatar_url: Optional[str] = None
    # Live staffing state, so this page agrees with the Teams tab.
    staffed_on_project: bool = False
    on_pending_team: bool = False


class MemberSkillOut(BaseModel):
    name: str
    level: Optional[int] = None
    required_level: int
    meets_requirement: bool


class TeamMemberOut(BaseModel):
    employee_id: int
    employee_name: str
    role_on_team: Optional[str] = None
    match_score: float
    matched_skills: List[str]
    job_title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    experience_years: int = 0
    delivered_projects_count: int = 0
    allocation_percentage: Optional[int] = None
    utilization_percentage: float = 0.0
    availability_status: Optional[str] = None
    required_skills: List[MemberSkillOut] = []


class TeamCreateIn(BaseModel):
    employee_ids: List[int]
    approve: bool = False


class TeamProposalOut(BaseModel):
    team_id: int
    project_id: int
    status: str
    skill_coverage_percentage: float
    members: List[TeamMemberOut]
    remaining_gaps: List[str]
    availability_data_missing: List[str] = []


class TeamDecisionIn(BaseModel):
    action: str  # APPROVE | REJECT
    employee_ids: Optional[List[int]] = None  # manager's final, possibly-modified roster
