import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.roles import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()


class UserPreferencesRead(BaseModel):
    appearance: Literal["system", "light", "dark"] = "light"
    default_output_format: Literal["json", "csv", "markdown"] = "json"
    default_ocr_model: str = "ocrflow-base v2.4"
    auto_run_on_upload: bool = True
    email_on_run_fail: bool = True
    weekly_summary: bool = False


class UserPreferencesUpdate(BaseModel):
    appearance: Literal["system", "light", "dark"] | None = None
    default_output_format: Literal["json", "csv", "markdown"] | None = None
    default_ocr_model: str | None = Field(default=None, max_length=128)
    auto_run_on_upload: bool | None = None
    email_on_run_fail: bool | None = None
    weekly_summary: bool | None = None


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=2000)


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    display_name: str | None
    bio: str | None
    role: UserRole
    preferences: UserPreferencesRead
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: Any) -> "UserRead":
        prefs = user.preferences or {}
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            display_name=user.display_name,
            bio=user.bio,
            role=UserRole(user.role) if user.role in UserRole._value2member_map_ else UserRole.USER,
            preferences=UserPreferencesRead.model_validate(prefs),
            is_active=user.is_active,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class MemberRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    display_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: Any) -> "MemberRead":
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            display_name=user.display_name,
            role=UserRole(user.role) if user.role in UserRole._value2member_map_ else UserRole.USER,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )


class MemberList(BaseModel):
    items: list[MemberRead]


class MemberUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
