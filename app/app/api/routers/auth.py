<<<<<<< HEAD
<<<<<<< Updated upstream
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
=======
"""Register, login, and current user."""

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
=======
"""Register, login, and current user."""

from fastapi import APIRouter, Depends, HTTPException, status
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)

from app.api.deps import get_current_user
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository
from app.infrastructure.security import create_access_token, hash_password, verify_password
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse, UserPublic
from app.schemas.user_settings import UserSettings

router = APIRouter(prefix="/auth", tags=["auth"])
_users = UserRepository()


def _user_public(doc: UserDocument) -> UserPublic:
    return UserPublic(id=str(doc.id), email=str(doc.email))


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=TokenResponse)
async def register(body: RegisterRequest) -> TokenResponse:
    if await _users.find_by_email(str(body.email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
<<<<<<< HEAD
    try:
        user = await _users.create(
            email=str(body.email),
            hashed_password=hash_password(body.password),
            settings=UserSettings(),
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from None
=======
    user = await _users.create(
        email=str(body.email),
        hashed_password=hash_password(body.password),
        settings=UserSettings(),
    )
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    token, expires_in = create_access_token(subject_user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
        user=_user_public(user),
    )


@router.post("/login", response_model=TokenResponse)
<<<<<<< HEAD
<<<<<<< Updated upstream
async def login(body: LoginRequest, facade: AuthFacadeDep) -> TokenResponse:
    user = await facade.verify_login(email=body.email, password=body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token, exp = create_access_token(subject_user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        expires_in=exp,
=======
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
async def login(body: LoginRequest) -> TokenResponse:
    user = await _users.find_by_email(str(body.email))
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token, expires_in = create_access_token(subject_user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
        user=_user_public(user),
    )


@router.get("/me", response_model=MeResponse)
<<<<<<< HEAD
<<<<<<< Updated upstream
async def me(user: UserDep) -> MeResponse:
    return MeResponse(
        user=_user_public(user),
        settings=user.settings.model_dump(),
    )
=======
async def me(user: UserDocument = Depends(get_current_user)) -> MeResponse:
    return MeResponse(user=_user_public(user), settings=user.settings)
>>>>>>> Stashed changes
=======
async def me(user: UserDocument = Depends(get_current_user)) -> MeResponse:
    return MeResponse(user=_user_public(user), settings=user.settings)
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
