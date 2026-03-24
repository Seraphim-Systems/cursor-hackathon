from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal

from beanie import Document, Indexed
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.schemas.user_settings import UserSettings


class UserDocument(Document):
    """User account; `settings` matches [`user-settings.schema.json`](../../../../contracts/user-settings.schema.json)."""

    email: Annotated[EmailStr, Indexed(unique=True)]
    hashed_password: str
    is_admin: bool = False
    settings: UserSettings = Field(default_factory=UserSettings)

    class Settings:
        name = "users"


class InsightsProjectEmbedded(BaseModel):
    name: str
    notes: str = ""


class InsightsEmbedded(BaseModel):
    key_points: list[str] = Field(default_factory=list)
    projects: list[InsightsProjectEmbedded] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)


class JournalEntryDocument(Document):
    """Journal entry; `parts` matches [`journal-entry.schema.json`](../../../../contracts/journal-entry.schema.json)."""

    user_id: str
    title: str = ""
    source: Literal["text", "audio", "mixed"] = "text"
    content: str = ""
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = None
    insights: InsightsEmbedded = Field(default_factory=InsightsEmbedded)
    insights_field_locks: list[str] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "entries"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ]


class ProjectDocument(Document):
    """Project resource."""

    user_id: str
    name: str
    normalized_name: str = ""
    description: str = ""
    active: bool = True
    last_mentioned_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "projects"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("normalized_name", ASCENDING)]),
        ]
