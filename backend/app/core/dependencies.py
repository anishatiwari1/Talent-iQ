from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.postgres import get_db
from app.models.user import User


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:

    token = credentials.credentials

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user = db.get(User, int(user_id))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def require_role(*allowed_roles: str):
    """Dependency factory enforcing that the current user has one of
    the given roles (e.g. "MANAGER", "EMPLOYEE").

    Usage:
        @router.get("/employees", dependencies=[Depends(require_role("MANAGER"))])

    or, if the endpoint also needs the user object:
        current_user: User = Depends(require_role("MANAGER"))

    This is the backend counterpart to the frontend's RoleRoute --
    every manager-only or employee-only endpoint added from Phase 2
    onward must use this, so authorization is never enforced only in
    the React layer.
    """

    normalized_roles = {role.upper() for role in allowed_roles}

    def dependency(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role.upper() not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency


def require_manager(
    current_user: User = Depends(get_current_user),
) -> User:
    """Convenience shortcut for the common manager-only case."""
    if current_user.role.upper() != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires manager access",
        )
    return current_user


def require_employee(
    current_user: User = Depends(get_current_user),
) -> User:
    """Convenience shortcut for the common employee-only case."""
    if current_user.role.upper() != "EMPLOYEE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires employee access",
        )
    return current_user