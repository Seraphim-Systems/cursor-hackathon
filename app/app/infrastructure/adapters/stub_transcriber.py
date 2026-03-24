"""Deterministic transcriber for tests and offline development."""

from app.domain.protocols import ITranscriber, TranscriptionResult


class StubTranscriber:
    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        hint = (mime_type or "audio").split("/")[-1][:20]
        return TranscriptionResult(
            text=f"[stub transcript] received {len(audio_bytes)} bytes ({hint}).",
        )
