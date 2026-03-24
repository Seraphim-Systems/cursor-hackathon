"""Post-upload pipeline: persist audio bytes, then transcribe (P2.3).

Call this from the entries multipart handler once `IAudioStorage` saves the file;
the returned `TranscriptionResult.text` maps to `JournalEntry.transcript`.
"""

from app.domain.protocols import IAudioStorage, ITranscriber, TranscriptionResult


async def save_audio_and_transcribe(
    *,
    audio_storage: IAudioStorage,
    transcriber: ITranscriber,
    user_id: str,
    filename_hint: str,
    data: bytes,
    mime_type: str | None,
) -> tuple[str, TranscriptionResult]:
    storage_key = await audio_storage.save(
        user_id=user_id, filename_hint=filename_hint, data=data
    )
    transcript = await transcriber.transcribe(audio_bytes=data, mime_type=mime_type)
    return storage_key, transcript
