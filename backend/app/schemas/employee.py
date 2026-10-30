from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SkillOut(BaseModel):
    id: int
    name: str
    category: str
    model_config = ConfigDict(from_attributes=True)


class EmployeeSkillIn(BaseModel):
    skill_id: int
    # Same 1 (Basic) - 5 (Expert) scale the UI and LLM extraction use.
    proficiency_level: int = Field(default=1, ge=1, le=5)
    years_of_experience: int = 0


class EmployeeSkillOut(BaseModel):
    id: int
    skill: SkillOut
    proficiency_level: int
    years_of_experience: int
    source: str
    confidence: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class CertificationIn(BaseModel):
    name: str
    issuer: str
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    document_id: Optional[int] = None


class CertificationOut(CertificationIn):
    id: int
    document_file_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class CertificationLinkDocument(BaseModel):
    document_id: Optional[int] = None


class EmployeeExpertiseOut(BaseModel):
    id: int
    document_id: int
    name: str
    evidence: str
    source: str
    model_config = ConfigDict(from_attributes=True)


class ResumeProjectOut(BaseModel):
    id: int
    document_id: int
    name: str
    description: Optional[str] = None
    technologies: List[str] = []
    evidence: str
    source: str
    model_config = ConfigDict(from_attributes=True)


class AvailabilityOut(BaseModel):
    weekly_capacity_hours: int
    allocated_hours: int
    status: str
    utilization_percentage: float
    available_from: Optional[date] = None
    notes: Optional[str] = None
    # Pending capacity change awaiting manager approval, if any.
    requested_capacity_hours: Optional[int] = None
    capacity_request_reason: Optional[str] = None
    capacity_requested_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AvailabilityUpdate(BaseModel):
    available_from: Optional[date] = None
    notes: Optional[str] = None

class CapacityRequestIn(BaseModel):
    requested_capacity_hours: int = Field(ge=1, le=80)
    reason: str = Field(min_length=3, max_length=500)

class CapacityDecisionIn(BaseModel):
    action: str  # APPROVE | REJECT
    note: Optional[str] = Field(default=None, max_length=500)

class DeliveredProjectOut(BaseModel):
    project_id: int
    project_name: str
    description: Optional[str] = None
    department: str
    role_on_project: Optional[str] = None
    allocation_percentage: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    technologies: List[str] = []


class EmployeeProfileOut(BaseModel):
    id: int
    employee_code: str
    full_name: str
    email: str
    department: str
    job_title: str
    experience_years: int
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    delivered_projects_count: int = 0
    delivered_projects: List[DeliveredProjectOut] = []
    active_projects_count: int = 0
    member_since: Optional[datetime] = None
    availability_status: str
    is_active: bool
    skills: List[EmployeeSkillOut] = []
    certifications: List[CertificationOut] = []
    expertise_areas: List[EmployeeExpertiseOut] = []
    resume_projects: List[ResumeProjectOut] = []
    availability: Optional[AvailabilityOut] = None
    model_config = ConfigDict(from_attributes=True)


class EmployeeProfileUpdate(BaseModel):
    department: Optional[str] = None
    job_title: Optional[str] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=60)
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None


class EmployeeSummaryOut(BaseModel):
    id: int
    employee_code: str
    full_name: str
    department: str
    job_title: str
    experience_years: int
    availability_status: str
    utilization_percentage: float
    skill_names: List[str] = []
    avatar_url: Optional[str] = None
    delivered_projects_count: int = 0
    availability_note: Optional[str] = None
    available_from: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)


class EmployeeProjectHistoryOut(BaseModel):
    id: int
    project_id: int
    project_name: str
    role_on_project: Optional[str] = None
    status: str
    allocation_percentage: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)
