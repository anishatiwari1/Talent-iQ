from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_manager
from app.database.postgres import get_db
from app.models.user import User
from app.services import workforce_service

router = APIRouter(prefix="/api/v1/workforce", tags=["Workforce Intelligence"])


@router.get("/overview")
def get_workforce_overview(
    department: Optional[str] = None,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return workforce_service.get_workforce_overview(db, department=department)
