from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import UserDep
from app.api.schemas.settings import UserSettingsPatch
from app.infrastructure.persistence.documents import UserSettingsEmbedded

router = APIRouter(prefix="/settings", tags=["settings"])


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
