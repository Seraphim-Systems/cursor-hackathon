"""API models aligned with contracts/journal-entry.schema.json and insights.schema.json."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.infrastructure.persistence.documents import JournalEntryDocument

SourceKind = Literal["text", "audio", "mixed"]


class InsightProjectOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    notes: str | None = None


class InsightsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key_points: list[str] = Field(default_factory=list)
    projects: list[InsightProjectOut] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)


class JournalEntryOut(BaseModel):
    """Journal entry resource (data contract)."""

    model_config = ConfigDict(extra="allow")

    id: str
    user_id: str
    source: SourceKind
    created_at: datetime
    updated_at: datetime
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    insights: InsightsOut | None = None
    insights_field_locks: list[str] = Field(default_factory=list)


def journal_entry_to_out(doc: JournalEntryDocument) -> JournalEntryOut:
    raw = doc.insights
    if not raw or not any(
        [
            raw.key_points,
            raw.projects,
            raw.goals,
            raw.blockers,
            raw.people,
            raw.priorities,
            raw.themes,
        ]
    ):
        insights = None
    else:
        insights = InsightsOut.model_validate(raw.model_dump(mode="json"))
    return JournalEntryOut(
        id=str(doc.id),
        user_id=str(doc.user_id),
        source=doc.source,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        audio_storage_key=doc.audio_storage_key,
        transcript=doc.transcript,
        cleaned_text=doc.cleaned_text,
        summary=doc.summary,
        sentiment_score=doc.sentiment_score,
        insights=insights,
        insights_field_locks=list(doc.insights_field_locks),
    )


# Back-compat names used elsewhere
JournalEntryResponse = JournalEntryOut
entry_to_response = journal_entry_to_out


class JournalEntryCreateBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source: SourceKind
    created_at: datetime | None = None
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    insights: InsightsOut | None = None
    insights_field_locks: list[str] | None = None
    run_analysis: bool = False


class JournalEntryPatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source: SourceKind | None = None
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    insights: InsightsOut | None = None
    insights_field_locks: list[str] | None = None


class JournalEntryListResponse(BaseModel):
    items: list[JournalEntryOut]
    total: int
