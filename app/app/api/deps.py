"""FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.facades.auth_facade import AuthFacade
from app.config import settings
from app.domain.protocols import IAIAnalyzer, IAudioStorage, ITranscriber
from app.infrastructure.adapters import build_analyzer, build_audio_storage, build_transcriber
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository
from app.api.security import decode_subject

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> UserDocument:
    try:
        uid = decode_subject(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await UserRepository().get_by_id(uid)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


UserDep = Annotated[UserDocument, Depends(get_current_user)]


def get_analyzer() -> IAIAnalyzer:
    return build_analyzer(settings)


def get_audio_storage() -> IAudioStorage:
    return build_audio_storage(settings)


def get_transcriber() -> ITranscriber:
    return build_transcriber(settings)


def get_auth_facade() -> AuthFacade:
    return AuthFacade(users=UserRepository())


AuthFacadeDep = Annotated[AuthFacade, Depends(get_auth_facade)]
