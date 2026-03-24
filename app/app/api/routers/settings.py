<<<<<<< HEAD
<<<<<<< Updated upstream
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import UserDep
from app.api.schemas.settings import UserSettingsPatch
from app.infrastructure.persistence.documents import UserSettingsEmbedded
=======
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
"""User-scoped settings — GET/PATCH [`/api/settings`](../../../docs/DATA_CONTRACTS.md)."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.infrastructure.persistence.documents import UserDocument
from app.schemas.user_settings import UserSettings, UserSettingsPatch, merge_user_settings
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)

router = APIRouter(prefix="/settings", tags=["settings"])


<<<<<<< HEAD
<<<<<<< Updated upstream
@router.get("")
async def get_settings(user: UserDep) -> dict:
    return user.settings.model_dump()


@router.patch("")
async def patch_settings(user: UserDep, body: UserSettingsPatch) -> dict:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return user.settings.model_dump()
    current = user.settings.model_dump()
    current.update(patch)
    try:
        user.settings = UserSettingsEmbedded.model_validate(current)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    await user.save()
    return user.settings.model_dump()
=======
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
@router.get("", response_model=UserSettings)
async def get_settings(user: UserDocument = Depends(get_current_user)) -> UserSettings:
    return user.settings


@router.patch("", response_model=UserSettings)
async def patch_settings(
    body: UserSettingsPatch,
    user: UserDocument = Depends(get_current_user),
) -> UserSettings:
    user.settings = merge_user_settings(user.settings, body)
    await user.save()
    return user.settings
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
