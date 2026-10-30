from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class RecommendationDecisionIn(BaseModel):
    allocation_percentage: int = 100
    role_on_project: Optional[str] = None


class AssignmentOut(BaseModel):
    id: int
    project_id: int
    employee_id: Optional[int] = None
    team_id: Optional[int] = None
    status: str
    approved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
