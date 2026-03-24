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
        )
