"""API-level test for POST /api/entries/{id}/analyze with field locks (P2.5)."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from beanie import PydanticObjectId
from httpx import ASGITransport, AsyncClient
from jose import jwt

from app.api.deps import get_analyzer, get_current_user_id
from app.config import settings
from app.domain.protocols import AnalysisResult
from app.infrastructure.persistence.documents import JournalEntryDocument
from app.infrastructure.persistence.journal_entry_repository import JournalEntryRepository


def _bearer(sub: str) -> str:
    token = jwt.encode({"sub": sub}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    if isinstance(token, bytes):
        token = token.decode("ascii")
    return f"Bearer {token}"


def _empty_insights() -> dict:
    return {
        "key_points": ["edited_point"],
        "projects": [],
        "goals": [],
        "blockers": [],
        "people": [],
        "priorities": [],
        "themes": [],
    }


class _FixedAnalyzer:
    async def analyze(self, *, text: str) -> AnalysisResult:
        return AnalysisResult(
            summary="MODEL_SUMMARY",
            sentiment_score=-0.75,
            key_points=["model_a", "model_b"],
            projects=[{"name": "m-proj", "notes": ""}],
            goals=["mg"],
            blockers=[],
            people=[],
            priorities=[],
            themes=["mt"],
        )


@pytest.mark.asyncio
async def test_post_analyze_skips_locked_summary_refreshes_unlocked(analyze_only_app) -> None:
    entry_id = PydanticObjectId()
    owner_sub = str(PydanticObjectId())
    now = datetime.now(timezone.utc)
    entry = MagicMock(spec=JournalEntryDocument)
    entry.id = entry_id
    entry.user_id = owner_sub
    entry.source = "text"
    entry.cleaned_text = "journal body"
    entry.transcript = None
    entry.summary = "USER_LOCKED_SUMMARY"
    entry.sentiment_score = 0.1
    entry.insights = _empty_insights()
    entry.insights_field_locks = ["summary"]
    entry.created_at = now
    entry.updated_at = now
    entry.audio_storage_key = None
    entry.save = AsyncMock()

    analyze_only_app.dependency_overrides[get_current_user_id] = lambda: owner_sub
    analyze_only_app.dependency_overrides[get_analyzer] = lambda: _FixedAnalyzer()

    transport = ASGITransport(app=analyze_only_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with (
            patch.object(
                JournalEntryRepository,
                "get_owned",
                new=AsyncMock(return_value=entry),
            ),
            patch(
                "app.application.facades.entries_analyze.sync_projects_for_entry",
                new=AsyncMock(),
            ) as sync_proj,
        ):
            r = await client.post(
                f"/api/entries/{entry_id}/analyze",
                headers={"Authorization": _bearer(owner_sub)},
                json={"preserve_locked_fields": True},
            )

    assert r.status_code == 200, r.text
    assert entry.summary == "USER_LOCKED_SUMMARY"
    assert entry.sentiment_score == -0.75
    assert entry.insights["key_points"] == ["model_a", "model_b"]
    entry.save.assert_awaited_once()
    sync_proj.assert_awaited_once()


@pytest.mark.asyncio
async def test_post_analyze_skips_project_sync_when_insights_projects_locked(
    analyze_only_app,
) -> None:
    entry_id = PydanticObjectId()
    owner_sub = str(PydanticObjectId())
    entry = MagicMock(spec=JournalEntryDocument)
    entry.id = entry_id
    entry.user_id = owner_sub
    entry.source = "text"
    entry.cleaned_text = "journal body"
    entry.transcript = None
    entry.summary = None
    entry.sentiment_score = None
    entry.insights = _empty_insights()
    entry.insights_field_locks = ["insights.projects"]
    entry.save = AsyncMock()
    _ts = datetime.now(timezone.utc)
    entry.created_at = _ts
    entry.updated_at = _ts
    entry.audio_storage_key = None

    analyze_only_app.dependency_overrides[get_current_user_id] = lambda: owner_sub
    analyze_only_app.dependency_overrides[get_analyzer] = lambda: _FixedAnalyzer()

    transport = ASGITransport(app=analyze_only_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with (
            patch.object(
                JournalEntryRepository,
                "get_owned",
                new=AsyncMock(return_value=entry),
            ),
            patch(
                "app.application.facades.entries_analyze.sync_projects_for_entry",
                new=AsyncMock(),
            ) as sync_proj,
        ):
            r = await client.post(
                f"/api/entries/{entry_id}/analyze",
                headers={"Authorization": _bearer(owner_sub)},
                json={"preserve_locked_fields": True},
            )

    assert r.status_code == 200, r.text
    sync_proj.assert_not_called()


@pytest.mark.asyncio
async def test_post_analyze_preserve_false_overwrites_locked_fields(analyze_only_app) -> None:
    entry_id = PydanticObjectId()
    owner_sub = str(PydanticObjectId())
    now = datetime.now(timezone.utc)
    entry = MagicMock(spec=JournalEntryDocument)
    entry.id = entry_id
    entry.user_id = owner_sub
    entry.source = "text"
    entry.cleaned_text = "body"
    entry.transcript = None
    entry.summary = "USER_LOCKED_SUMMARY"
    entry.sentiment_score = 0.1
    entry.insights = _empty_insights()
    entry.insights_field_locks = ["summary"]
    entry.created_at = now
    entry.updated_at = now
    entry.audio_storage_key = None
    entry.save = AsyncMock()

    analyze_only_app.dependency_overrides[get_current_user_id] = lambda: owner_sub
    analyze_only_app.dependency_overrides[get_analyzer] = lambda: _FixedAnalyzer()

    transport = ASGITransport(app=analyze_only_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with (
            patch.object(
                JournalEntryRepository,
                "get_owned",
                new=AsyncMock(return_value=entry),
            ),
            patch(
                "app.application.facades.entries_analyze.sync_projects_for_entry",
                new=AsyncMock(),
            ),
        ):
            r = await client.post(
                f"/api/entries/{entry_id}/analyze",
                headers={"Authorization": _bearer(owner_sub)},
                json={"preserve_locked_fields": False},
            )

    assert r.status_code == 200, r.text
    assert entry.summary == "MODEL_SUMMARY"
    assert entry.sentiment_score == -0.75
