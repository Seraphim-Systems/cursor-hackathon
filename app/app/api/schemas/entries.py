"""API models aligned with contracts/journal-entry.schema.json and insights.schema.json."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.infrastructure.persistence.documents import JournalEntryDocument

SourceKind = Literal["text", "audio", "mixed"]


class ProjectItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    notes: str = ""


class InsightsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key_points: list[str] = Field(default_factory=list)
    projects: list[ProjectItemResponse] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)


class JournalEntryResponse(BaseModel):
    """Journal entry resource (data contract)."""

    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    source: SourceKind
    created_at: datetime
    updated_at: datetime
    audio_storage_key: str | None = None
    transcript: str | None = None
    cleaned_text: str | None = None
    summary: str | None = None
    sentiment_score: float | None = None
    insights: InsightsResponse
    insights_field_locks: list[str] = Field(default_factory=list)


def entry_to_response(doc: JournalEntryDocument) -> JournalEntryResponse:
    return JournalEntryResponse(
        id=str(doc.id),
        user_id=doc.user_id,
        source=doc.source,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        audio_storage_key=doc.audio_storage_key,
        transcript=doc.transcript,
        cleaned_text=doc.cleaned_text,
        summary=doc.summary,
        sentiment_score=doc.sentiment_score,
        insights=InsightsResponse(
            key_points=list(doc.insights.key_points),
            projects=[
                ProjectItemResponse(name=p.name, notes=p.notes) for p in doc.insights.projects
            ],
            goals=list(doc.insights.goals),
            blockers=list(doc.insights.blockers),
            people=list(doc.insights.people),
            priorities=list(doc.insights.priorities),
            themes=list(doc.insights.themes),
        ),
        insights_field_locks=list(doc.insights_field_locks),
    )
