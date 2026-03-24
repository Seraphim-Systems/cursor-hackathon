from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.infrastructure.adapters.registry import build_analyzer, build_transcriber
from app.infrastructure.adapters.local_audio_storage import LocalAudioStorage
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository
from app.infrastructure.security.jwt_tokens import decode_subject

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
_users = UserRepository()


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserDocument:
    sub = decode_subject(token)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await _users.find_by_id(sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


UserDep = Annotated[UserDocument, Depends(get_current_user)]


def get_audio_storage() -> LocalAudioStorage:
    return LocalAudioStorage(settings.audio_storage_path)


def get_transcriber():
    return build_transcriber(settings)


def get_analyzer():
    return build_analyzer(settings)
