from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_manager
from app.database.postgres import get_db
from app.models.user import User
from app.schemas.skill import SkillCreate, SkillOut
from app.services import skill_service

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])


@router.get("", response_model=list[SkillOut])
def list_skills(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return skill_service.list_skills(db, category=category)


@router.post("", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def create_skill(
    payload: SkillCreate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        return skill_service.create_skill(db, payload.name, payload.category, payload.description)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
