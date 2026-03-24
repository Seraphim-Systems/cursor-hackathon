"""Deterministic transcriber for tests and offline development."""

import hashlib

from app.domain.protocols import ITranscriber, TranscriptionResult


class StubTranscriber:
    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        digest = hashlib.sha256(audio_bytes).hexdigest()[:16]
        hint = (mime_type or "audio").split("/")[-1][:20]
        return TranscriptionResult(
            text=f"[stub transcript] sha256:{digest} ({hint})",
        )
