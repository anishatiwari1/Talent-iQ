"""Per-user settings (Settings page) stored in users.preferences.

Stored values are merged over DEFAULT_PREFERENCES on every read, so
adding a new setting never requires a data migration and old rows
simply pick up the default.
"""
from copy import deepcopy

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User

# Notification type -> settings category the user can switch off.
NOTIFICATION_CATEGORIES = {
    "PROJECT_ASSIGNMENT": "assignments",
    "ASSIGNMENT_CHANGED": "assignments",
    "PROJECT_COMPLETED": "assignments",
    "WORKLOAD_WARNING": "workload",
    "AVAILABILITY_UPDATED": "workload",
    "CAPACITY_REQUEST": "workload",
    "CAPACITY_DECISION": "workload",
    "DOCUMENT_PROCESSED": "documents",
    "CERTIFICATION_ADDED": "documents",
    "PROJECT_CREATED": "projects",
    "TEAM_APPROVED": "projects",
    "TEAM_CHANGED": "assignments",
    "PROJECT_STAGE_CHANGED": "projects",
    "SKILL_GAP": "development",
}

DEFAULT_PREFERENCES = {
    "notifications": {
        "assignments": True,
        "workload": True,
        "documents": True,
        "projects": True,
        "development": True,
    },
    # Manager defaults
    "recommendation_top_n": 10,
    "workload_warning_threshold": 90,
    # Employee defaults
    "show_profile_links": True,
}


def get_preferences(user: User) -> dict:
    merged = deepcopy(DEFAULT_PREFERENCES)
    stored = user.preferences or {}
    for key, value in stored.items():
        if key == "notifications" and isinstance(value, dict):
            merged["notifications"].update(
                {k: bool(v) for k, v in value.items() if k in merged["notifications"]}
            )
        elif key in merged:
            merged[key] = value
    return merged


def update_preferences(db: Session, user: User, updates: dict) -> dict:
    current = get_preferences(user)
    for key, value in updates.items():
        if value is None or key not in current:
            continue
        if key == "notifications":
            current["notifications"].update(
                {k: bool(v) for k, v in value.items() if k in current["notifications"]}
            )
        else:
            current[key] = value
    # Reassign (not mutate) so SQLAlchemy detects the JSON change.
    user.preferences = current
    db.commit()
    db.refresh(user)
    return current


def notification_enabled(user: User, notification_type: str) -> bool:
    category = NOTIFICATION_CATEGORIES.get(notification_type)
    if category is None:
        return True
    return get_preferences(user)["notifications"].get(category, True)


def update_account(db: Session, user: User, full_name: str) -> User:
    full_name = full_name.strip()
    if not full_name:
        raise ValueError("Name cannot be empty")
    user.full_name = full_name
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not user.password_hash or not verify_password(current_password, user.password_hash):
        raise ValueError("Current password is incorrect")
    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters")
    if current_password == new_password:
        raise ValueError("New password must be different from the current password")
    user.password_hash = hash_password(new_password)
    db.commit()
