"""Lock-aware insight merge (P2.4) — re-analyze and PATCH semantics."""

import pytest

from app.domain.entry_insight_merge import (
    apply_journal_entry_insight_patch,
    clamp_sentiment,
    is_insight_path_locked,
    merge_reanalyze_with_locks,
)
from app.domain.journal_insights import JournalInsights, journal_insights_from_analysis
from app.domain.protocols import AnalysisResult


def test_is_insight_path_locked_exact_and_parent() -> None:
    locks = {"summary", "insights", "insights.goals"}
    assert is_insight_path_locked(locks, "summary")
    assert is_insight_path_locked(locks, "insights.goals")
    assert is_insight_path_locked({"insights"}, "insights.key_points")
    assert not is_insight_path_locked({"insights.goals"}, "insights.key_points")


def test_clamp_sentiment() -> None:
    assert clamp_sentiment(2.0) == 1.0
    assert clamp_sentiment(-9.0) == -1.0
    assert clamp_sentiment(None) is None


def test_merge_reanalyze_respects_summary_and_insights_locks() -> None:
    current_insights = JournalInsights(
        key_points=["keep me"],
        goals=["old goal"],
        themes=["t1"],
    )
    analysis = AnalysisResult(
        summary="new summary",
        sentiment_score=0.8,
        key_points=["ai a", "ai b"],
        projects=[],
        goals=["new goal"],
        blockers=[],
        people=[],
        priorities=[],
        themes=["ai theme"],
    )
    locks = ["summary", "insights.key_points", "insights.goals"]

    new_s, new_sent, new_ins = merge_reanalyze_with_locks(
        summary="user summary",
        sentiment_score=-0.5,
        insights=current_insights,
        analysis=analysis,
        locks=locks,
    )

    assert new_s == "user summary"
    assert new_sent == 0.8
    assert new_ins.key_points == ["keep me"]
    assert new_ins.goals == ["old goal"]
    assert new_ins.themes == ["ai theme"]


def test_merge_reanalyze_preserve_false_ignores_locks() -> None:
    cur = JournalInsights(key_points=["old"], goals=["g"])
    analysis = AnalysisResult(
        summary="new_s",
        sentiment_score=0.5,
        key_points=["n1"],
        projects=[],
        goals=["ng"],
        blockers=[],
        people=[],
        priorities=[],
        themes=[],
    )
    s, sent, ins = merge_reanalyze_with_locks(
        summary="locked_summary",
        sentiment_score=-0.1,
        insights=cur,
        analysis=analysis,
        locks=["summary", "insights", "insights.key_points"],
        preserve_locked_fields=False,
    )
    assert s == "new_s"
    assert sent == 0.5
    assert ins.key_points == ["n1"]
    assert ins.goals == ["ng"]


def test_merge_reanalyze_whole_insights_locked() -> None:
    cur = JournalInsights(key_points=["x"], goals=["g"])
    analysis = AnalysisResult(
        summary="s",
        sentiment_score=0.0,
        key_points=[],
        projects=[],
        goals=[],
        blockers=[],
        people=[],
        priorities=[],
        themes=[],
    )
    _, _, ins = merge_reanalyze_with_locks(
        summary=None,
        sentiment_score=None,
        insights=cur,
        analysis=analysis,
        locks=["insights"],
    )
    assert ins == cur


def test_patch_updates_unlocked_insights_subfield() -> None:
    current = {
        "summary": "s",
        "sentiment_score": 0.0,
        "insights_field_locks": ["insights.key_points"],
        "insights": {
            "key_points": ["a"],
            "projects": [],
            "goals": ["old"],
            "blockers": [],
            "people": [],
            "priorities": [],
            "themes": [],
        },
    }
    out = apply_journal_entry_insight_patch(
        current,
        {"insights": {"goals": ["new goal"]}},
    )
    assert out["insights"]["goals"] == ["new goal"]
    assert out["insights"]["key_points"] == ["a"]


def test_patch_skips_locked_insights_subfield() -> None:
    current = {
        "insights_field_locks": ["insights.goals"],
        "insights": {
            "key_points": [],
            "projects": [],
            "goals": ["preserved"],
            "blockers": [],
            "people": [],
            "priorities": [],
            "themes": [],
        },
    }
    out = apply_journal_entry_insight_patch(
        current,
        {"insights": {"goals": ["hacker"]}},
    )
    assert out["insights"]["goals"] == ["preserved"]


def test_patch_can_unlock_then_edit_in_one_request() -> None:
    current = {
        "insights_field_locks": ["insights.goals"],
        "insights": {
            "key_points": [],
            "projects": [],
            "goals": ["old"],
            "blockers": [],
            "people": [],
            "priorities": [],
            "themes": [],
        },
    }
    out = apply_journal_entry_insight_patch(
        current,
        {
            "insights_field_locks": [],
            "insights": {"goals": ["edited"]},
        },
    )
    assert out["insights_field_locks"] == []
    assert out["insights"]["goals"] == ["edited"]


def test_journal_insights_matches_contract_shape() -> None:
    """Analyzer output maps to schema-aligned model (no extra keys)."""
    r = AnalysisResult(
        summary="x",
        sentiment_score=0.1,
        key_points=["k"],
        projects=[{"name": "P", "notes": "n"}],
        goals=[],
        blockers=[],
        people=[],
        priorities=[],
        themes=["t"],
    )
    ins = journal_insights_from_analysis(r)
    d = ins.model_dump(mode="json")
    assert set(d.keys()) == {
        "key_points",
        "projects",
        "goals",
        "blockers",
        "people",
        "priorities",
        "themes",
    }
    assert d["projects"] == [{"name": "P", "notes": "n"}]


def test_patch_rejects_unknown_insights_keys() -> None:
    current = {"insights_field_locks": [], "insights": None}
    with pytest.raises(ValueError, match="Unknown insights keys"):
        apply_journal_entry_insight_patch(
            current,
            {"insights": {"extra_field": []}},
        )
