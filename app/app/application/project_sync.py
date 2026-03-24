"""Upsert projects from AI `insights.projects` after analysis (P2.6).

Call `sync_projects_for_entry` from the journal/analyze facade whenever new project
mentions are persisted on an entry (same transaction context as saving insights).
"""

from datetime import datetime

from app.domain.project_rules import normalize_project_name
from app.infrastructure.persistence.project_repository import ProjectRepository

_DEFAULT_MAX_RELATED = 100


async def sync_projects_for_entry(
    repo: ProjectRepository,
    *,
    user_id: str,
    entry_id: str,
    projects: list[dict],
    now: datetime,
    max_related_ids: int = _DEFAULT_MAX_RELATED,
) -> None:
    """Create project rows for new normalized names; bump `last_mentioned_at` on repeats."""
    for raw in projects:
        name = (raw.get("name") or "").strip()
        if not name:
            continue
        normalized = normalize_project_name(name)
        if not normalized:
            continue
        notes = (raw.get("notes") or "").strip() or None

        existing = await repo.find_by_user_and_normalized(user_id, normalized)
        if existing is None:
            await repo.create(
                user_id=user_id,
                title=name,
                normalized_name=normalized,
                description=notes,
                first_seen_at=now,
                last_mentioned_at=now,
                related_entry_ids=[entry_id],
            )
            continue

        existing.last_mentioned_at = now
        if entry_id not in existing.related_entry_ids:
            existing.related_entry_ids.append(entry_id)
            if len(existing.related_entry_ids) > max_related_ids:
                existing.related_entry_ids = existing.related_entry_ids[-max_related_ids:]
        await existing.save()
