"""User settings — matches [`contracts/user-settings.schema.json`](../../../contracts/user-settings.schema.json)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserSettings(BaseModel):
    model_config = ConfigDict(extra="allow")

    timezone: str = Field(default="UTC", description="IANA tz, e.g. Europe/Berlin")
    week_starts_on: Literal["monday", "sunday"] = "monday"
    default_audio_quality: Literal["low", "medium", "high"] = "medium"
    theme: Literal["light", "dark", "system"] = "system"
    notifications_enabled: bool = True


class UserSettingsPatch(BaseModel):
    """Partial update for PATCH /api/settings — only sent fields are applied."""

    model_config = ConfigDict(extra="forbid")

    timezone: str | None = None
    week_starts_on: Literal["monday", "sunday"] | None = None
    default_audio_quality: Literal["low", "medium", "high"] | None = None
    theme: Literal["light", "dark", "system"] | None = None
    notifications_enabled: bool | None = None


def merge_user_settings(current: UserSettings, patch: UserSettingsPatch) -> UserSettings:
    updates = patch.model_dump(exclude_unset=True, exclude_none=True)
    return current.model_copy(update=updates)
