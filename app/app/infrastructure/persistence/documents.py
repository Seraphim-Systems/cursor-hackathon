"""Beanie documents."""

from typing import Annotated

from beanie import Document, Indexed
from pydantic import EmailStr, Field

from app.schemas.user_settings import UserSettings


class UserDocument(Document):
    """User account; `settings` matches [`user-settings.schema.json`](../../../../contracts/user-settings.schema.json)."""

    email: Annotated[EmailStr, Indexed(unique=True)]
    hashed_password: str
    settings: UserSettings = Field(default_factory=UserSettings)

    class Settings:
        name = "users"
<<<<<<< HEAD
<<<<<<< Updated upstream
"""Beanie documents — align with contracts/journal-entry and user-settings schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

SourceKind = Literal["text", "audio", "mixed"]


class UserSettingsEmbedded(BaseModel):
    timezone: str = "UTC"
    week_starts_on: Literal["monday", "sunday"] = "monday"
    default_audio_quality: Literal["low", "medium", "high"] = "medium"
    theme: Literal["light", "dark", "system"] = "system"
    notifications_enabled: bool = True


class UserDocument(Document):
    email: str
    hashed_password: str
    settings: UserSettingsEmbedded = Field(default_factory=UserSettingsEmbedded)

    class Settings:
        name = "users"
        indexes = [IndexModel([("email", ASCENDING)], unique=True)]


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
    source: SourceKind
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    insights: InsightsEmbedded = Field(default_factory=InsightsEmbedded)
    insights_field_locks: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "journal_entries"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        ]


class ProjectDocument(Document):
    user_id: str
    title: str
    normalized_name: str
    description: str | None = None
    first_seen_at: datetime
    last_mentioned_at: datetime
    related_entry_ids: list[str] = Field(default_factory=list)
    status: str | None = None

    class Settings:
        name = "projects"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("normalized_name", ASCENDING)], unique=True),
        ]
=======
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
"""Beanie documents."""

from typing import Annotated

from beanie import Document, Indexed
from pydantic import EmailStr, Field

from app.schemas.user_settings import UserSettings


class UserDocument(Document):
    """User account; `settings` matches [`user-settings.schema.json`](../../../../contracts/user-settings.schema.json)."""

    email: Annotated[EmailStr, Indexed(unique=True)]
    hashed_password: str
    settings: UserSettings = Field(default_factory=UserSettings)

    class Settings:
        name = "users"
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
