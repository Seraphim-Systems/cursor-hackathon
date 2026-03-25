"""Deterministic analysis for tests and offline use."""

from app.domain.protocols import AnalysisResult, IAIAnalyzer


class StubAnalyzer:
    async def analyze(self, *, text: str) -> AnalysisResult:
        snippet = text.strip()[:80] + ("…" if len(text.strip()) > 80 else "")
        return AnalysisResult(
            summary=f"Stub summary for: {snippet or '(empty)'}",
            sentiment_score=0.0,
            key_points=["stub point a", "stub point b"],
            projects=[{"name": "stub-project", "notes": ""}],
            goals=["stub goal"],
            blockers=[],
            people=[],
            priorities=[],
            themes=["reflection"],
            impactful_factors=[],
        )

    async def analyze_trends(self, *, entries_data: list[dict]) -> dict:
        return {
            "summary": "Stub trends overview for recent entries.",
            "findings": ["Stub finding A: Pattern found.", "Stub finding B: Recurring event."],
            "beneficial_actions": ["Keep up the good work!", "Take a break if needed."]
        }
