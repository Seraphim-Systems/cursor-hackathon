"""Pydantic shapes aligned with `contracts/auth-*.schema.json` and `me-response.schema.json`."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_settings import UserSettings


class AuthEmailPasswordBody(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=1024)


class UserSummary(BaseModel):
    id: str
    email: EmailStr


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserSummary


class MeResponse(BaseModel):
    user: UserSummary
    settings: UserSettings
