"""Real, persisted notifications (Phase 13) -- replaces the frontend's
static mock notification array entirely. Every notification here is
created by an actual backend event (document processed, recommendation
generated, assignment approved, etc.), never inserted speculatively.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.services import settings_service


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
) -> Optional[Notification]:
    # Respect the recipient's Settings page toggles; a muted category
    # is simply not recorded.
    user = db.get(User, user_id)
    if user is None or not settings_service.notification_enabled(user, type):
        return None

    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_managers(
    db: Session,
    type: str,
    title: str,
    message: str,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
) -> None:
    manager_ids = db.scalars(
        select(User.id).where(func.upper(User.role) == "MANAGER", User.is_active == True)  # noqa: E712
    ).all()
    for manager_id in manager_ids:
        create_notification(
            db, manager_id, type, title, message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )


def list_for_user(db: Session, user_id: int, unread_only: bool = False) -> list[Notification]:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)  # noqa: E712
    return db.scalars(stmt.order_by(Notification.created_at.desc())).all()


def unread_count(db: Session, user_id: int) -> int:
    return db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        )
    ) or 0


def mark_read(db: Session, notification: Notification) -> Notification:
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session, user_id: int) -> None:
    for n in list_for_user(db, user_id, unread_only=True):
        n.is_read = True
    db.commit()


def delete_notification(db: Session, notification: Notification) -> None:
    db.delete(notification)
    db.commit()


def delete_read(db: Session, user_id: int) -> int:
    result = db.execute(
        delete(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == True,  # noqa: E712
        )
    )
    db.commit()
    return result.rowcount or 0
