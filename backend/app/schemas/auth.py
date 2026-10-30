from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "EMPLOYEE"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AccountUpdate(BaseModel):
    full_name: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class NotificationPreferences(BaseModel):
    assignments: Optional[bool] = None
    workload: Optional[bool] = None
    documents: Optional[bool] = None
    projects: Optional[bool] = None
    development: Optional[bool] = None


class PreferencesUpdate(BaseModel):
    notifications: Optional[NotificationPreferences] = None
    recommendation_top_n: Optional[int] = Field(default=None, ge=1, le=50)
    workload_warning_threshold: Optional[int] = Field(default=None, ge=50, le=150)
    show_profile_links: Optional[bool] = None
