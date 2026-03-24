"""Merge AI analysis and PATCH payloads with ``insights_field_locks``.

Lock paths (dot notation, aligned with ``docs/DATA_CONTRACTS.md`` examples):

- Entry-level: ``summary``, ``sentiment_score``
- Whole nested object: ``insights`` locks every insights subfield
- Per-field: ``insights.key_points``, ``insights.projects``, etc.

Re-analyze (``POST .../analyze``) must skip locked paths. For ``PATCH /api/entries/{id}``,
locked insight paths are *preserved* when the client sends partial ``insights`` updates;
clients remove a path from ``insights_field_locks`` in the same or a prior request to edit
that field (see data contract: users may unlock via PATCH).
"""

from __future__ import annotations

from typing import Any, Mapping

from app.domain.journal_insights import (
    JournalInsights,
    journal_insights_from_analysis,
    journal_insights_from_mapping,
    journal_insights_to_jsonable,
)
from app.domain.protocols import AnalysisResult

INSIGHT_SUBKEYS = frozenset(
    {"key_points", "projects", "goals", "blockers", "people", "priorities", "themes"}
)


def _lock_set(locks: list[str] | None) -> set[str]:
    return set(locks or [])


def is_insight_path_locked(locks: set[str], path: str) -> bool:
    """Return whether ``path`` is protected (exact or parent ``insights`` lock)."""
    if path in locks:
        return True
    if path.startswith("insights.") and "insights" in locks:
        return True
    return False


def clamp_sentiment(value: float | None) -> float | None:
    if value is None:
        return None
    return max(-1.0, min(1.0, float(value)))


def merge_reanalyze_with_locks(
    *,
    summary: str | None,
    sentiment_score: float | None,
    insights: JournalInsights | None,
    analysis: AnalysisResult,
    locks: list[str] | None,
    preserve_locked_fields: bool = True,
) -> tuple[str | None, float | None, JournalInsights]:
    """Apply a fresh analysis while keeping locked fields from the current entry.

    When ``preserve_locked_fields`` is false, locks are ignored (full overwrite from ``analysis``).
    """
    if not preserve_locked_fields:
        return (
            analysis.summary,
            clamp_sentiment(analysis.sentiment_score),
            journal_insights_from_analysis(analysis),
        )
    ls = _lock_set(locks)
    new_summary = summary if is_insight_path_locked(ls, "summary") else analysis.summary
    new_sentiment = (
        sentiment_score
        if is_insight_path_locked(ls, "sentiment_score")
        else clamp_sentiment(analysis.sentiment_score)
    )
    incoming = journal_insights_from_analysis(analysis)
    merged_insights = _merge_insights_subfields(insights, incoming, ls)
    return new_summary, new_sentiment, merged_insights


def _merge_insights_subfields(
    current: JournalInsights | None,
    incoming: JournalInsights,
    locks: set[str],
) -> JournalInsights:
    if is_insight_path_locked(locks, "insights"):
        return current or JournalInsights()

    base = current or JournalInsights()
    data: dict[str, Any] = {}
    for key in INSIGHT_SUBKEYS:
        path = f"insights.{key}"
        if is_insight_path_locked(locks, path):
            data[key] = getattr(base, key)
        else:
            data[key] = getattr(incoming, key)
    return JournalInsights.model_validate(data)


def apply_journal_entry_insight_patch(
    current: Mapping[str, Any],
    patch: Mapping[str, Any],
) -> dict[str, Any]:
    """Return a shallow-copied entry dict after applying lock-aware insight-related PATCH fields.

    Only handles: ``insights_field_locks``, ``summary``, ``sentiment_score``, ``insights``.
    Caller merges other entry fields separately.
    """
    out = dict(current)
    new_locks: list[str]
    if "insights_field_locks" in patch:
        raw = patch["insights_field_locks"]
        if raw is None:
            new_locks = []
        elif isinstance(raw, list):
            new_locks = [str(x) for x in raw]
        else:
            raise TypeError("insights_field_locks must be a list of strings or null")
    else:
        prev = out.get("insights_field_locks")
        new_locks = list(prev) if isinstance(prev, list) else []

    out["insights_field_locks"] = new_locks
    ls = _lock_set(new_locks)

    if "summary" in patch and not is_insight_path_locked(ls, "summary"):
        out["summary"] = patch["summary"]

    if "sentiment_score" in patch and not is_insight_path_locked(ls, "sentiment_score"):
        out["sentiment_score"] = patch["sentiment_score"]

    if "insights" in patch:
        cur_ins = journal_insights_from_mapping(out.get("insights"))
        patch_ins = patch["insights"]
        if patch_ins is None:
            if not is_insight_path_locked(ls, "insights"):
                out["insights"] = None
        else:
            merged = _patch_insights_partial(cur_ins, patch_ins, ls)
            out["insights"] = journal_insights_to_jsonable(merged)

    return out


def _patch_insights_partial(
    current: JournalInsights | None,
    patch: Mapping[str, Any] | JournalInsights,
    locks: set[str],
) -> JournalInsights | None:
    if is_insight_path_locked(locks, "insights"):
        return current

    base = current or JournalInsights()
    if isinstance(patch, JournalInsights):
        patch_dict = patch.model_dump()
    else:
        patch_dict = dict(patch)

    unknown = set(patch_dict.keys()) - INSIGHT_SUBKEYS
    if unknown:
        raise ValueError(f"Unknown insights keys in PATCH: {sorted(unknown)}")

    data: dict[str, Any] = {}
    for key in INSIGHT_SUBKEYS:
        path = f"insights.{key}"
        if key in patch_dict:
            if is_insight_path_locked(locks, path):
                data[key] = getattr(base, key)
            else:
                data[key] = patch_dict[key]
        else:
            data[key] = getattr(base, key)

    return JournalInsights.model_validate(data)
