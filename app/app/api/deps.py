"""FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from app.config import settings
from app.domain.protocols import IAIAnalyzer, IAudioStorage, ITranscriber
from app.infrastructure.adapters import build_analyzer, build_audio_storage, build_transcriber
from app.infrastructure.persistence.documents import UserDocument


def get_analyzer() -> IAIAnalyzer:
    return build_analyzer(settings)


def get_audio_storage() -> IAudioStorage:
    return build_audio_storage(settings)


def get_transcriber() -> ITranscriber:
    return build_transcriber(settings)


async def get_current_user_id(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None
    sub = payload.get("sub")
    if sub is None or sub == "":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    return str(sub)


async def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> UserDocument:
    try:
        oid = PydanticObjectId(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        ) from None
    user = await UserDocument.get(oid)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
