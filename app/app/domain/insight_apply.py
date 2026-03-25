"""Map AI analysis results onto entry fields using `insights_field_locks` semantics.

Lock paths (examples): `summary`, `sentiment_score`, `insights`, or granular
`insights.key_points`, `insights.projects`, etc.
"""

from __future__ import annotations

from app.domain.protocols import AnalysisResult
from app.infrastructure.persistence.documents import InsightsEmbedded, JournalEntryDocument, ProjectItem, InsightsImpactfulFactorEmbedded


INSIGHT_SUBKEYS = (
    "key_points",
    "projects",
    "goals",
    "blockers",
    "people",
    "priorities",
    "themes",
    "impactful_factors",
)


def analysis_result_to_insights_embedded(result: AnalysisResult) -> InsightsEmbedded:
    projects: list[ProjectItem] = []
    for p in result.projects:
        if isinstance(p, dict):
            name = str(p.get("name", "")).strip()
            if not name:
                continue
            projects.append(
                ProjectItem(
                    name=name,
                    notes=str(p.get("notes") or "")[:2000],
                ),
            )
        elif isinstance(p, str) and p.strip():
            projects.append(ProjectItem(name=p.strip(), notes=""))

    factors = []
    for f in result.impactful_factors:
        if isinstance(f, dict):
            factors.append(
                InsightsImpactfulFactorEmbedded(
                    name=str(f.get("name", "")),
                    impact=float(f.get("impact", 0)),
                    type=str(f.get("type", "topic"))
                )
            )

    return InsightsEmbedded(
        key_points=list(result.key_points),
        projects=projects,
        goals=list(result.goals),
        blockers=list(result.blockers),
        people=list(result.people),
        priorities=list(result.priorities),
        themes=list(result.themes),
        impactful_factors=factors,
    )


def apply_analysis_to_entry(
    entry: JournalEntryDocument,
    result: AnalysisResult,
    *,
    preserve_locked_fields: bool,
) -> None:
    """Mutates `entry` in memory (caller persists)."""
    locks = set(entry.insights_field_locks or [])
    if not preserve_locked_fields:
        locks = set()

    if "summary" not in locks:
        entry.summary = result.summary
    if "sentiment_score" not in locks:
        entry.sentiment_score = result.sentiment_score

    if "insights" in locks:
        return

    new_insights = analysis_result_to_insights_embedded(result)
    for key in INSIGHT_SUBKEYS:
        path = f"insights.{key}"
        if path in locks:
            continue
        setattr(entry.insights, key, getattr(new_insights, key))
