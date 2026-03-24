<<<<<<< HEAD
"""Auth response shapes — contracts/auth-responses.schema.json."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1)


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: str


class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class MeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: UserPublic
    settings: dict
=======
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
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
