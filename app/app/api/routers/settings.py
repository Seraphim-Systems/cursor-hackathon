"""User-scoped settings — GET/PATCH [`/api/settings`](../../../docs/DATA_CONTRACTS.md)."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.infrastructure.persistence.documents import UserDocument
from app.schemas.user_settings import UserSettings, UserSettingsPatch, merge_user_settings

router = APIRouter(prefix="/settings", tags=["settings"])


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
