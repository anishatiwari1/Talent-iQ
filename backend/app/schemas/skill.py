from typing import Optional
from pydantic import BaseModel, ConfigDict


class SkillCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None


class SkillOut(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
