from app.domain.insight_apply import apply_analysis_to_entry
from app.domain.protocols import AnalysisResult
from app.infrastructure.persistence.documents import InsightsEmbedded, JournalEntryDocument


def test_apply_respects_field_locks() -> None:
    entry = JournalEntryDocument.model_construct(
        user_id="u1",
        source="text",
        summary="old summary",
        insights_field_locks=["summary", "insights.key_points"],
        insights=InsightsEmbedded(key_points=["preserved"]),
    )
    result = AnalysisResult(
        summary="new summary",
        sentiment_score=0.5,
        key_points=["from ai"],
        projects=[{"name": "P", "notes": ""}],
        goals=["g"],
        blockers=[],
        people=[],
        priorities=[],
        themes=["t"],
    )
    apply_analysis_to_entry(entry, result, preserve_locked_fields=True)
    assert entry.summary == "old summary"
    assert entry.sentiment_score == 0.5
    assert entry.insights.key_points == ["preserved"]
    assert entry.insights.goals == ["g"]
    assert len(entry.insights.projects) == 1
    assert entry.insights.themes == ["t"]


def test_insights_root_lock_preserves_entire_insights_block() -> None:
    entry = JournalEntryDocument.model_construct(
        user_id="u1",
        source="text",
        insights=InsightsEmbedded(key_points=["keep"]),
        insights_field_locks=["insights"],
    )
    result = AnalysisResult(
        summary="new sum",
        sentiment_score=0.1,
        key_points=["would overwrite"],
        projects=[{"name": "P", "notes": ""}],
        goals=["g"],
        blockers=[],
        people=[],
        priorities=[],
        themes=["t"],
    )
    apply_analysis_to_entry(entry, result, preserve_locked_fields=True)
    assert entry.summary == "new sum"
    assert entry.insights.key_points == ["keep"]
