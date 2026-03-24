"""Beanie document models — aligned with `contracts/*.schema.json`."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from beanie import Document, Indexed
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo import IndexModel


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserSettingsEmbedded(BaseModel):
    model_config = ConfigDict(extra="allow")

    timezone: str | None = None
    week_starts_on: Literal["monday", "sunday"] | None = None
    default_audio_quality: Literal["low", "medium", "high"] | None = None
    theme: Literal["light", "dark", "system"] | None = None
    notifications_enabled: bool | None = None


class UserDocument(Document):
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    settings: UserSettingsEmbedded = Field(default_factory=UserSettingsEmbedded)

    class Settings:
        name = "users"


class JournalEntryDocument(Document):
    """Journal entry persisted for Part 2 pipeline and CRUD."""

    user_id: str
    source: Literal["text", "audio", "mixed"] = "text"
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = None
    insights: dict[str, Any] = Field(default_factory=dict)
    insights_field_locks: list[str] = Field(default_factory=list)

    class Settings:
        name = "journal_entries"
        indexes = [
            IndexModel([("user_id", 1), ("created_at", -1)]),
        ]
