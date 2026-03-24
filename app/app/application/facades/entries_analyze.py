"""Re-run AI analysis on a journal entry."""

from __future__ import annotations

from datetime import datetime, timezone

from app.application.project_sync import sync_projects_for_entry
from app.domain.analysis_merge import merge_analysis_into_entry
from app.domain.entry_insight_merge import is_insight_path_locked
from app.domain.protocols import IAIAnalyzer
from app.infrastructure.persistence.documents import JournalEntryDocument
from app.infrastructure.persistence.project_repository import ProjectRepository


def _should_sync_projects_after_analyze(
    field_locks: list[str] | None, preserve_locked_fields: bool
) -> bool:
    if not preserve_locked_fields:
        return True
    ls = {p.strip() for p in (field_locks or []) if p.strip()}
    return not is_insight_path_locked(ls, "insights") and not is_insight_path_locked(
        ls, "insights.projects"
    )


async def reanalyze_journal_entry(
    *,
    entry: JournalEntryDocument,
    preserve_locked_fields: bool,
    analyzer: IAIAnalyzer,
) -> JournalEntryDocument:
    text = (entry.cleaned_text or entry.transcript or "").strip()
    new_result = await analyzer.analyze(text=text)
    summary, sentiment, insights_dict = merge_analysis_into_entry(
        existing_summary=entry.summary,
        existing_sentiment_score=entry.sentiment_score,
        existing_insights=entry.insights or None,
        new_result=new_result,
        field_locks=entry.insights_field_locks,
        preserve_locked_fields=preserve_locked_fields,
    )
    entry.summary = summary
    entry.sentiment_score = sentiment
    entry.insights = insights_dict or {}
    entry.updated_at = datetime.now(timezone.utc)
    await entry.save()
    if _should_sync_projects_after_analyze(
        entry.insights_field_locks, preserve_locked_fields
    ):
        repo = ProjectRepository()
        await sync_projects_for_entry(
            repo,
            user_id=str(entry.user_id),
            entry_id=str(entry.id),
            projects=new_result.projects,
            now=entry.updated_at,
        )
    return entry
