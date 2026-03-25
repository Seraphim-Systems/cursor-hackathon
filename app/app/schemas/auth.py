"""Auth request/response shapes — aligned with contracts/auth-*.schema.json."""

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_settings import UserSettings


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    is_admin: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class MeResponse(BaseModel):
    user: UserPublic
    settings: UserSettings
