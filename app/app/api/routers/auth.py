"""Minimal auth routes so journal entries can enforce ownership (Part 1 contract)."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth_tokens import create_access_token, hash_password, token_type_bearer, verify_password
from app.api.deps import get_current_user
from app.infrastructure.persistence.documents import UserDocument

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8)


class LoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str


class UserSummary(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    email: EmailStr


class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSummary


def _user_summary(user: UserDocument) -> UserSummary:
    return UserSummary(id=str(user.id), email=user.email)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterBody) -> TokenResponse:
    existing = await UserDocument.find_one(UserDocument.email == body.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = UserDocument(email=body.email, hashed_password=hash_password(body.password))
    await user.insert()
    token, expires_in = create_access_token(user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type=token_type_bearer(),
        expires_in=expires_in,
        user=_user_summary(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginBody) -> TokenResponse:
    user = await UserDocument.find_one(UserDocument.email == body.email)
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token, expires_in = create_access_token(user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type=token_type_bearer(),
        expires_in=expires_in,
        user=_user_summary(user),
    )


@router.get("/me", response_model=UserSummary)
async def me(user: UserDocument = Depends(get_current_user)) -> UserSummary:
    return _user_summary(user)
