"""FastAPI dependencies."""

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.security import decode_subject

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserDocument:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    subject = decode_subject(credentials.credentials)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        oid = PydanticObjectId(subject)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    user = await UserDocument.get(oid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
"""FastAPI dependencies."""

<<<<<<< HEAD
<<<<<<< Updated upstream
from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.facades.auth_facade import AuthFacade
from app.application.facades.journal_facade import JournalFacade
from app.config import settings
from app.infrastructure.adapters import build_analyzer, build_transcriber
from app.infrastructure.adapters.local_audio_storage import LocalAudioStorage
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import (
    JournalEntryRepository,
    ProjectRepository,
    UserRepository,
)
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


def get_journal_facade() -> JournalFacade:
    return JournalFacade(
        entries=JournalEntryRepository(),
        projects=ProjectRepository(),
        storage=LocalAudioStorage(Path(settings.audio_storage_path)),
        transcriber=build_transcriber(settings),
        analyzer=build_analyzer(settings),
    )


def get_auth_facade() -> AuthFacade:
    return AuthFacade(users=UserRepository())


JournalFacadeDep = Annotated[JournalFacade, Depends(get_journal_facade)]
AuthFacadeDep = Annotated[AuthFacade, Depends(get_auth_facade)]
=======
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.security import decode_subject

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserDocument:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    subject = decode_subject(credentials.credentials)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        oid = PydanticObjectId(subject)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    user = await UserDocument.get(oid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
