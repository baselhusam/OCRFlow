import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.roles import UserRole


class AdminUserItem(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    display_name: str | None
    role: UserRole
    is_active: bool
    project_count: int = 0
    run_count: int = 0
    pages_processed: int = 0
    last_login_at: datetime | None = None
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminUserList(BaseModel):
    items: list[AdminUserItem]


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = UserRole.USER

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None


class AdminUserPasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)
