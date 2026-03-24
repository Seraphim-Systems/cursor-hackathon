"""Structured journal insights — matches ``contracts/insights.schema.json``."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.domain.protocols import AnalysisResult


class ProjectInsight(BaseModel):
    """One extracted project mention."""

    model_config = ConfigDict(extra="forbid")

    name: str
    notes: str = ""


class JournalInsights(BaseModel):
    """Embedded insights object returned by the API and stored on entries."""

    model_config = ConfigDict(extra="forbid")

    key_points: list[str] = Field(default_factory=list)
    projects: list[ProjectInsight] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)


def journal_insights_from_analysis(result: AnalysisResult) -> JournalInsights:
    """Map analyzer output to the persisted insights shape."""
    projects = [
        ProjectInsight(name=p["name"], notes=str(p.get("notes") or ""))
        for p in result.projects
        if isinstance(p, dict) and str(p.get("name", "")).strip()
    ]
    return JournalInsights(
        key_points=list(result.key_points),
        projects=projects,
        goals=list(result.goals),
        blockers=list(result.blockers),
        people=list(result.people),
        priorities=list(result.priorities),
        themes=list(result.themes),
    )


def journal_insights_from_mapping(data: object | None) -> JournalInsights | None:
    """Parse stored/API dict into ``JournalInsights``; ``None`` stays ``None``."""
    if data is None:
        return None
    if isinstance(data, JournalInsights):
        return data
    if isinstance(data, dict):
        return JournalInsights.model_validate(data)
    raise TypeError(f"Expected dict or JournalInsights, got {type(data)!r}")


def journal_insights_to_jsonable(insights: JournalInsights | None) -> dict | None:
    """Serialize for JSON / Mongo (no ``None`` arrays — use empty lists)."""
    if insights is None:
        return None
    return insights.model_dump(mode="json")
