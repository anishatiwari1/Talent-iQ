from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest


def register_user(
    db: Session,
    data: RegisterRequest
) -> User:

    # Check whether email already exists
    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        raise ValueError("Email already registered")

    # Create new user
    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role.upper(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(
    db: Session,
    data: LoginRequest
) -> User:

    user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if not user:
        raise ValueError("Invalid email or password")

    if not user.password_hash:
        raise ValueError(
            "This account does not use password authentication"
        )

    if not verify_password(
        data.password,
        user.password_hash
    ):
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("User account is inactive")

    return user


def create_user_token(user: User) -> str:

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    }

    return create_access_token(token_data)