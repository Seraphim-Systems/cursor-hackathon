"""Auth request/response shapes — aligned with `contracts/auth-*.schema.json` and `me-response.schema.json`."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_settings import UserSettings


class AuthCredentials(BaseModel):
    """Body for `POST /api/auth/register` and `POST /api/auth/login` — see `auth-request.schema.json`."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=1024)


RegisterRequest = AuthCredentials
LoginRequest = AuthCredentials


class UserPublic(BaseModel):
    id: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserPublic


class MeResponse(BaseModel):
    user: UserPublic
    settings: UserSettings
