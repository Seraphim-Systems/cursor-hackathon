"""JournalFacade with mocked IAudioStorage / ITranscriber / IAIAnalyzer; real MongoDB."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.application.facades.auth_facade import AuthFacade
from app.application.facades.journal_facade import JournalFacade
from app.domain.protocols import AnalysisResult, TranscriptionResult
from app.infrastructure.persistence.documents import ProjectDocument
from app.infrastructure.persistence.repositories import (
    JournalEntryRepository,
    ProjectRepository,
    UserRepository,
)


def _empty_analysis(
    *,
    summary: str | None = "s",
    sentiment: float | None = 0.0,
    projects: list[dict] | None = None,
) -> AnalysisResult:
    return AnalysisResult(
        summary=summary,
        sentiment_score=sentiment,
        key_points=[],
        projects=projects or [],
        goals=[],
        blockers=[],
        people=[],
        priorities=[],
        themes=[],
    )


@pytest.mark.asyncio
async def test_create_entry_with_audio_invokes_storage_and_transcriber(mongo_client_session) -> None:
    auth = AuthFacade(users=UserRepository())
    user = await auth.register(email="audio@example.com", password="password12")

    storage = AsyncMock()
    storage.save = AsyncMock(return_value="user/u1/rec.wav")
    transcriber = AsyncMock()
    transcriber.transcribe = AsyncMock(return_value=TranscriptionResult(text=" spoken "))
    analyzer = AsyncMock()
    analyzer.analyze = AsyncMock(return_value=_empty_analysis(summary="sum"))

    facade = JournalFacade(
        entries=JournalEntryRepository(),
        projects=ProjectRepository(),
        storage=storage,
        transcriber=transcriber,
        analyzer=analyzer,
    )

    await facade.create_entry(
        user_id=str(user.id),
        text=None,
        audio_bytes=b"\x00\x01",
        audio_filename="a.wav",
        audio_content_type="audio/wav",
        run_analysis=True,
    )

    storage.save.assert_awaited_once()
    transcriber.transcribe.assert_awaited_once()
    analyzer.analyze.assert_awaited()


@pytest.mark.asyncio
async def test_reanalyze_preserves_locked_summary(mongo_client_session) -> None:
    auth = AuthFacade(users=UserRepository())
    user = await auth.register(email="locks@example.com", password="password12")

    analyzer = AsyncMock()
    analyzer.analyze = AsyncMock(
        side_effect=[
            _empty_analysis(summary="first"),
            _empty_analysis(summary="second"),
        ],
    )
    storage = AsyncMock()
    transcriber = AsyncMock()

    facade = JournalFacade(
        entries=JournalEntryRepository(),
        projects=ProjectRepository(),
        storage=storage,
        transcriber=transcriber,
        analyzer=analyzer,
    )

    entry = await facade.create_entry(
        user_id=str(user.id),
        text="hello world",
        audio_bytes=None,
        audio_filename=None,
        audio_content_type=None,
        run_analysis=True,
    )
    assert entry.summary == "first"

    await facade.patch_entry(
        user_id=str(user.id),
        entry_id=str(entry.id),
        insights_field_locks=["summary"],
    )

    updated = await facade.reanalyze_entry(
        user_id=str(user.id),
        entry_id=str(entry.id),
        preserve_locked_fields=True,
    )
    assert updated.summary == "first"
    assert analyzer.analyze.await_count == 2


@pytest.mark.asyncio
async def test_sync_projects_dedupes_same_normalized_name(mongo_client_session) -> None:
    auth = AuthFacade(users=UserRepository())
    user = await auth.register(email="proj@example.com", password="password12")

    analyzer = AsyncMock()
    analyzer.analyze = AsyncMock(
        return_value=_empty_analysis(
            projects=[
                {"name": "My Project", "notes": "a"},
                {"name": "my  project", "notes": "b"},
            ],
        ),
    )
    storage = AsyncMock()
    transcriber = AsyncMock()

    facade = JournalFacade(
        entries=JournalEntryRepository(),
        projects=ProjectRepository(),
        storage=storage,
        transcriber=transcriber,
        analyzer=analyzer,
    )

    await facade.create_entry(
        user_id=str(user.id),
        text="note",
        audio_bytes=None,
        audio_filename=None,
        audio_content_type=None,
        run_analysis=True,
    )

    rows = await ProjectDocument.find(ProjectDocument.user_id == str(user.id)).to_list()
    assert len(rows) == 1
    assert rows[0].title.startswith("My")
