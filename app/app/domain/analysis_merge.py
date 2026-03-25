"""Merge a new ``AnalysisResult`` into journal entry fields (P2.4 / P2.5)."""

from __future__ import annotations

from typing import Any

from app.domain.entry_insight_merge import merge_reanalyze_with_locks
from app.domain.journal_insights import journal_insights_from_analysis, journal_insights_from_mapping
from app.domain.protocols import AnalysisResult

# Keys inside `JournalEntry.insights` (see contracts/insights.schema.json).
INSIGHT_FIELD_NAMES: tuple[str, ...] = (
    "key_points",
    "projects",
    "goals",
    "blockers",
    "people",
    "priorities",
    "themes",
    "impactful_factors",
)


def analysis_result_to_insights(result: AnalysisResult) -> dict[str, Any]:
    """JSON-shaped insights dict for persistence and APIs."""
    return journal_insights_from_analysis(result).model_dump(mode="json")


def merge_analysis_into_entry(
    *,
    existing_summary: str | None,
    existing_sentiment_score: float | None,
    existing_insights: dict[str, Any] | None,
    new_result: AnalysisResult,
    field_locks: list[str] | None,
    preserve_locked_fields: bool,
) -> tuple[str | None, float | None, dict[str, Any]]:
    """Return updated ``(summary, sentiment_score, insights)`` after applying ``new_result``.

    When ``preserve_locked_fields`` is false, locks are ignored. Lock paths match
    :mod:`app.domain.entry_insight_merge`.
    """
    cur = journal_insights_from_mapping(existing_insights) if existing_insights else None
    new_summary, new_sentiment, merged = merge_reanalyze_with_locks(
        summary=existing_summary,
        sentiment_score=existing_sentiment_score,
        insights=cur,
        analysis=new_result,
        locks=field_locks,
        preserve_locked_fields=preserve_locked_fields,
    )
    return new_summary, new_sentiment, merged.model_dump(mode="json")
