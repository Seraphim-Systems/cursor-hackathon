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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class MeResponse(BaseModel):
    user: UserPublic
    settings: UserSettings
<<<<<<< HEAD
"""Auth request/response shapes — aligned with `contracts/auth-*.schema.json` and `me-response.schema.json`."""

from typing import Literal
=======
"""Auth request/response shapes — aligned with contracts/auth-*.schema.json."""
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_settings import UserSettings


<<<<<<< HEAD
class AuthCredentials(BaseModel):
    """Body for `POST /api/auth/register` and `POST /api/auth/login` — see `auth-request.schema.json`."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=1024)


RegisterRequest = AuthCredentials
LoginRequest = AuthCredentials
=======
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)


class UserPublic(BaseModel):
    id: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
<<<<<<< HEAD
    token_type: Literal["bearer"] = "bearer"
=======
    token_type: str = "bearer"
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    expires_in: int
    user: UserPublic


class MeResponse(BaseModel):
    user: UserPublic
    settings: UserSettings
