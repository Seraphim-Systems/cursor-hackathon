import pytest

from app.application.facades.audio_upload_pipeline import save_audio_and_transcribe
from app.domain.protocols import TranscriptionResult
from app.infrastructure.adapters.stub_transcriber import StubTranscriber


class _MemoryAudioStorage:
    """Minimal IAudioStorage for facade tests."""

    def __init__(self) -> None:
        self.saved: list[tuple[str, str, bytes]] = []

    async def save(self, *, user_id: str, filename_hint: str, data: bytes) -> str:
        self.saved.append((user_id, filename_hint, data))
        return f"{user_id}/{filename_hint}"

    async def delete(self, storage_key: str) -> None:
        pass


@pytest.mark.asyncio
async def test_save_audio_and_transcribe_order_and_outputs() -> None:
    storage = _MemoryAudioStorage()
    transcriber = StubTranscriber()
    data = b"\x00\x01\x02"

    key, result = await save_audio_and_transcribe(
        audio_storage=storage,
        transcriber=transcriber,
        user_id="user-1",
        filename_hint="clip.webm",
        data=data,
        mime_type="audio/webm",
    )

    assert key == "user-1/clip.webm"
    assert len(storage.saved) == 1
    assert storage.saved[0] == ("user-1", "clip.webm", data)
    assert isinstance(result, TranscriptionResult)
    assert result.text
