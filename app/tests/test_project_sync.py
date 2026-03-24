"""Project upsert from AI insights.projects (P2.6)."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.application.project_sync import sync_projects_for_entry


@pytest.mark.asyncio
async def test_sync_creates_then_updates_last_mentioned() -> None:
    repo = MagicMock()
    now = datetime(2025, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    created = MagicMock()
    repo.find_by_user_and_normalized = AsyncMock(side_effect=[None, created])
    repo.create = AsyncMock(return_value=created)

    await sync_projects_for_entry(
        repo,
        user_id="u1",
        entry_id="e1",
        projects=[{"name": "Alpha Beta", "notes": "n1"}],
        now=now,
    )
    repo.create.assert_awaited_once()
    _, kwargs = repo.create.await_args
    assert kwargs["normalized_name"] == "alpha beta"
    assert kwargs["title"] == "Alpha Beta"
    assert kwargs["related_entry_ids"] == ["e1"]

    created.save = AsyncMock()
    created.related_entry_ids = ["e1"]
    await sync_projects_for_entry(
        repo,
        user_id="u1",
        entry_id="e1",
        projects=[{"name": "alpha  beta", "notes": ""}],
        now=now,
    )
    assert created.last_mentioned_at == now
    created.save.assert_awaited_once()
