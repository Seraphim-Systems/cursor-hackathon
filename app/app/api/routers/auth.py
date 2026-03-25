"""Register, login, and current user."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository
from app.infrastructure.security import create_access_token, hash_password, verify_password
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse, UserPublic
from app.schemas.user_settings import UserSettings

router = APIRouter(prefix="/auth", tags=["auth"])
_users = UserRepository()


def _user_public(doc: UserDocument) -> UserPublic:
    return UserPublic(id=str(doc.id), email=str(doc.email), is_admin=bool(doc.is_admin))


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=TokenResponse)
async def register(body: RegisterRequest) -> TokenResponse:
    if await _users.find_by_email(str(body.email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    user = await _users.create(
        email=str(body.email),
        hashed_password=hash_password(body.password),
        settings=UserSettings(),
    )
    token, expires_in = create_access_token(subject_user_id=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=_user_public(user),
    )


@router.post("/login", response_model=TokenResponse)
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
        user=_user_public(user),
    )


@router.get("/me", response_model=MeResponse)
async def me(user: UserDocument = Depends(get_current_user)) -> MeResponse:
    return MeResponse(user=_user_public(user), settings=user.settings)
