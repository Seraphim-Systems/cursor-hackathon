from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal

from beanie import Document, Indexed
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.schemas.user_settings import UserSettings


SourceKind = Literal["text", "audio", "mixed"]


class UserDocument(Document):
    """User account; `settings` matches [`user-settings.schema.json`](../../../../contracts/user-settings.schema.json)."""

    email: Annotated[EmailStr, Indexed(unique=True)]
    hashed_password: str
    is_admin: bool = False
    settings: UserSettings = Field(default_factory=UserSettings)

    class Settings:
        name = "users"


class ProjectItem(BaseModel):
    name: str
    notes: str = ""


class InsightsImpactfulFactorEmbedded(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    impact: float
    factor_type: str = Field(alias="type")


class InsightsEmbedded(BaseModel):
    key_points: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    impactful_factors: list[InsightsImpactfulFactorEmbedded] = Field(default_factory=list)


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


class PeriodSummaryDocument(Document):
    """Cached AI summary for a specific time period (Year, Month, Week, or Day)."""

    user_id: str
    period_type: Literal["year", "month", "week", "day"]
    start_date: str  # ISO YYYY-MM-DD
    end_date: str    # ISO YYYY-MM-DD
    
    summary: str
    key_achievements: list[str] = Field(default_factory=list)
    top_themes: list[str] = Field(default_factory=list)
    key_people: list[str] = Field(default_factory=list)

    last_entry_count: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "period_summaries"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("period_type", ASCENDING), ("start_date", ASCENDING), ("end_date", ASCENDING)], unique=True),
        ]
