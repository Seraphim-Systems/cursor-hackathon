"""Beanie document models — aligned with contracts and the Part 2 journal pipeline."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from beanie import Document, Indexed
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

SourceKind = Literal["text", "audio", "mixed"]


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


class ProjectItem(BaseModel):
    """Matches contracts/insights.schema.json `projects` items."""

    name: str
    notes: str = ""


class InsightsEmbedded(BaseModel):
    """Matches contracts/insights.schema.json (embedded on journal entry)."""

    key_points: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)


class JournalEntryDocument(Document):
    user_id: str
    source: SourceKind = "text"
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    insights: InsightsEmbedded = Field(default_factory=InsightsEmbedded)
    insights_field_locks: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "journal_entries"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        ]
