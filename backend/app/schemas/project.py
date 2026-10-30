from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectSkillIn(BaseModel):
    skill_id: int
    # Same 1 (Basic) - 5 (Expert) scale the UI and LLM extraction use.
    required_proficiency: int = Field(default=1, ge=1, le=5)
    importance: str = "IMPORTANT"  # MUST_HAVE | IMPORTANT | NICE_TO_HAVE


class ProjectSkillOut(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    required_proficiency: int
    importance: str
    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: str
    priority: str = "MEDIUM"
    status: str = "PLANNING"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    required_team_size: Optional[int] = None
    required_skills: List[ProjectSkillIn] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    required_team_size: Optional[int] = None
    required_skills: Optional[List[ProjectSkillIn]] = None


class ProjectStageEvent(BaseModel):
    stage: str
    entered_at: datetime
    changed_by: Optional[str] = None


class ProjectStageUpdate(BaseModel):
    stage: str


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    department: str
    status: str
    stage: str = "REQUIREMENTS"
    stage_history: List[ProjectStageEvent] = []
    priority: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    required_team_size: Optional[int] = None
    required_skills: List[ProjectSkillOut] = []
    staffed_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class ProjectStaffingOut(BaseModel):
    employee_id: int
    employee_name: str
    role_on_project: Optional[str] = None
    status: str
    allocation_percentage: int
    model_config = ConfigDict(from_attributes=True)
