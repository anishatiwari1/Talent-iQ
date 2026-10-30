from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SkillClaim(_StrictModel):
    name: str = Field(min_length=1, max_length=100)
    proficiency: Optional[int] = Field(default=None, ge=1, le=5)
    years_of_experience: Optional[int] = Field(default=None, ge=0)
    evidence: str = Field(min_length=1)


class ExperienceClaim(_StrictModel):
    technology: str = Field(min_length=1, max_length=100)
    years: Optional[int] = Field(default=None, ge=0)
    evidence: str = Field(min_length=1)


class ExpertiseClaim(_StrictModel):
    name: str = Field(min_length=1, max_length=150)
    evidence: str = Field(min_length=1)


class CertificationClaim(_StrictModel):
    name: str = Field(min_length=1, max_length=200)
    issuer: Optional[str] = Field(default=None, max_length=150)
    evidence: str = Field(min_length=1)


class ResumeProjectClaim(_StrictModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    evidence: str = Field(min_length=1)


class LLMExtraction(_StrictModel):
    skills: list[SkillClaim] = Field(default_factory=list)
    experience: list[ExperienceClaim] = Field(default_factory=list)
    expertise_areas: list[ExpertiseClaim] = Field(default_factory=list)
    certifications: list[CertificationClaim] = Field(default_factory=list)
    projects: list[ResumeProjectClaim] = Field(default_factory=list)


class RejectedClaim(_StrictModel):
    category: str
    name: str
    reason: str
    evidence: Optional[str] = None


class PersistedExtractionSummary(_StrictModel):
    skills: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    expertise_areas: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    manual_skills_preserved: list[str] = Field(default_factory=list)
    skipped: list[RejectedClaim] = Field(default_factory=list)
