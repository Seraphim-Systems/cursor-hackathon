"""Tests for `LocalAudioStorage` (P2.2)."""

import pytest

from app.infrastructure.adapters.local_audio_storage import LocalAudioStorage


@pytest.mark.asyncio
async def test_local_audio_storage_writes_under_user_segment(tmp_path) -> None:
    root = tmp_path / "audio"
    storage = LocalAudioStorage(root)
    key = await storage.save(
        user_id="user-1",
        filename_hint="clip.webm",
        data=b"\x00\x01\x02",
    )
    assert key.startswith("user-1/")
    assert (root / key).is_file()
    assert (root / key).read_bytes() == b"\x00\x01\x02"


@pytest.mark.asyncio
async def test_local_audio_storage_delete_removes_file(tmp_path) -> None:
    storage = LocalAudioStorage(tmp_path)
    key = await storage.save(user_id="u", filename_hint="a.wav", data=b"x")
    await storage.delete(key)
    assert not (tmp_path / key).exists()
