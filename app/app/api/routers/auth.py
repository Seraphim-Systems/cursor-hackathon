from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AuthFacadeDep, UserDep
from app.api.schemas.auth import (
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.api.security import create_access_token
from app.infrastructure.persistence.documents import UserDocument

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_public(u: UserDocument) -> UserPublic:
    return UserPublic(id=str(u.id), email=u.email)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, facade: AuthFacadeDep) -> TokenResponse:
    try:
        user = await facade.register(email=body.email, password=body.password)
    except ValueError as e:
        if "already" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    token, exp = create_access_token(subject_user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        expires_in=exp,
        user=_user_public(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, facade: AuthFacadeDep) -> TokenResponse:
    user = await facade.verify_login(email=body.email, password=body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token, exp = create_access_token(subject_user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        expires_in=exp,
        user=_user_public(user),
    )


@router.get("/me", response_model=MeResponse)
async def me(user: UserDep) -> MeResponse:
    return MeResponse(
        user=_user_public(user),
        settings=user.settings.model_dump(),
    )
