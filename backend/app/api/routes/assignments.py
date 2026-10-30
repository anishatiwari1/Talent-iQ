from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_manager
from app.database.postgres import get_db
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.assignment import AssignmentOut, RecommendationDecisionIn
from app.services import assignment_service

router = APIRouter(prefix="/api/v1/assignments", tags=["Assignments"])


@router.post(
    "/recommendations/{recommendation_id}/approve",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def approve_recommendation(
    recommendation_id: int,
    payload: RecommendationDecisionIn,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    recommendation = db.get(Recommendation, recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    try:
        assignment = assignment_service.approve_recommendation(
            db, recommendation, current_user,
            allocation_percentage=payload.allocation_percentage,
            role_on_project=payload.role_on_project,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return AssignmentOut.model_validate(assignment)


@router.post("/recommendations/{recommendation_id}/reject", status_code=status.HTTP_200_OK)
def reject_recommendation(
    recommendation_id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    recommendation = db.get(Recommendation, recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    assignment_service.reject_recommendation(db, recommendation)
    return {"recommendation_id": recommendation_id, "status": "REJECTED"}
