"""Validated shape of LLM JSON output (contract for analysis).

Aligned with `protocols.AnalysisResult`, `contracts/insights.schema.json`, and entry fields
`summary` / `sentiment_score`.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AIProjectMention(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    notes: str = ""


class AIAnalysisPayload(BaseModel):
    """Expected JSON object from the model after `response_format: json_object`."""

    model_config = ConfigDict(extra="forbid")

    summary: str | None = None
    key_points: list[str] = Field(default_factory=list)
    projects: list[AIProjectMention] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
