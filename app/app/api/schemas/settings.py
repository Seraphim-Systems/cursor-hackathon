"""contracts/user-settings.schema.json."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class UserSettingsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timezone: str | None = None
    week_starts_on: Literal["monday", "sunday"] | None = None
    default_audio_quality: Literal["low", "medium", "high"] | None = None
    theme: Literal["light", "dark", "system"] | None = None
    notifications_enabled: bool | None = None
