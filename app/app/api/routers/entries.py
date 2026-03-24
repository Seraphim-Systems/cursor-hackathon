"""Journal entry routes — CRUD (P2.1) + analyze (P2.4+)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import get_analyzer, get_audio_storage, get_current_user_id, get_transcriber
from app.api.schemas.entries import (
    JournalEntryCreateBody,
    JournalEntryListResponse,
    JournalEntryOut,
    JournalEntryPatchBody,
    journal_entry_to_out,
)
from app.application.facades.audio_upload_pipeline import save_audio_and_transcribe
from app.application.facades.entries_analyze import reanalyze_journal_entry
from app.domain.entry_insight_merge import apply_journal_entry_insight_patch
from app.domain.protocols import IAIAnalyzer, IAudioStorage, ITranscriber
from app.infrastructure.persistence.journal_entry_repository import (
    JournalEntryRepository,
    get_journal_entry_repository,
)

router = APIRouter(prefix="/entries", tags=["entries"])

_INSIGHT_PATCH_KEYS = frozenset(
    {"summary", "sentiment_score", "insights", "insights_field_locks"},
)


class AnalyzeEntryBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preserve_locked_fields: bool = Field(
        default=True,
        description="When true, do not overwrite fields listed in insights_field_locks.",
    )


def _repo_dep() -> JournalEntryRepository:
    return get_journal_entry_repository()


@router.get("", response_model=JournalEntryListResponse)
async def list_entries(
    user_id: Annotated[str, Depends(get_current_user_id)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    created_from: datetime | None = Query(default=None, alias="from"),
    created_to: datetime | None = Query(default=None, alias="to"),
) -> JournalEntryListResponse:
    items, total = await repo.list_for_user(
        user_id=user_id,
        limit=limit,
        skip=offset,
        created_from=created_from,
        created_to=created_to,
    )
    return JournalEntryListResponse(
        items=[journal_entry_to_out(e) for e in items],
        total=total,
    )


@router.post("", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
async def create_entry(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
    storage: Annotated[IAudioStorage, Depends(get_audio_storage)],
    transcriber: Annotated[ITranscriber, Depends(get_transcriber)],
) -> JournalEntryOut:
    """Create an entry from JSON or multipart (optional `audio` part per DATA_CONTRACTS §Entries)."""
    content_type = (request.headers.get("content-type") or "").split(";", 1)[0].strip().lower()

    if content_type == "application/json":
        body = JournalEntryCreateBody.model_validate(await request.json())
        insights_dict = body.insights.model_dump() if body.insights is not None else None
        doc = await repo.create(
            user_id=user_id,
            source=body.source,
            audio_storage_key=body.audio_storage_key,
            transcript=body.transcript,
            cleaned_text=body.cleaned_text,
            summary=body.summary,
            sentiment_score=body.sentiment_score,
            insights=insights_dict,
            insights_field_locks=body.insights_field_locks,
        )
        return journal_entry_to_out(doc)

    if content_type == "multipart/form-data":
        form = await request.form()
        meta_raw = form.get("metadata")
        if isinstance(meta_raw, str) and meta_raw.strip():
            body = JournalEntryCreateBody.model_validate_json(meta_raw)
        else:
            raw_source = form.get("source")
            src: Literal["text", "audio", "mixed"] = "text"
            if isinstance(raw_source, str) and raw_source in ("text", "audio", "mixed"):
                src = raw_source  # type: ignore[assignment]
            ct_val = form.get("cleaned_text")
            cleaned = (
                str(ct_val).strip()
                if ct_val is not None and isinstance(ct_val, str) and str(ct_val).strip()
                else None
            )
            body = JournalEntryCreateBody(
                source=src,
                cleaned_text=cleaned,
                audio_storage_key=None,
                transcript=None,
                summary=None,
                sentiment_score=None,
                insights=None,
                insights_field_locks=None,
            )

        up = form.get("audio")
        audio_bytes = b""
        filename_hint = "audio"
        if up is not None and hasattr(up, "read"):
            audio_bytes = await up.read()
            filename_hint = getattr(up, "filename", None) or filename_hint

        has_audio = len(audio_bytes) > 0
        has_text = bool(body.cleaned_text and body.cleaned_text.strip())
        resolved_source: Literal["text", "audio", "mixed"]
        if has_audio and has_text:
            resolved_source = "mixed"
        elif has_audio:
            resolved_source = "audio"
        else:
            resolved_source = body.source

        audio_key = body.audio_storage_key
        transcript_val = body.transcript
        if has_audio:
            mime_type = getattr(up, "content_type", None) if up is not None else None
            try:
                audio_key, t_result = await save_audio_and_transcribe(
                    audio_storage=storage,
                    transcriber=transcriber,
                    user_id=user_id,
                    filename_hint=str(filename_hint),
                    data=audio_bytes,
                    mime_type=mime_type,
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                ) from e
            transcript_val = t_result.text

        insights_dict = body.insights.model_dump() if body.insights is not None else None
        doc = await repo.create(
            user_id=user_id,
            source=resolved_source,
            audio_storage_key=audio_key,
            transcript=transcript_val,
            cleaned_text=body.cleaned_text,
            summary=body.summary,
            sentiment_score=body.sentiment_score,
            insights=insights_dict,
            insights_field_locks=body.insights_field_locks,
        )
        return journal_entry_to_out(doc)

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Content-Type must be application/json or multipart/form-data",
    )


@router.get("/{entry_id}", response_model=JournalEntryOut)
async def get_entry(
    entry_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
) -> JournalEntryOut:
    doc = await repo.get_owned(entry_id, user_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return journal_entry_to_out(doc)


@router.patch("/{entry_id}", response_model=JournalEntryOut)
async def patch_entry(
    entry_id: str,
    body: JournalEntryPatchBody,
    user_id: Annotated[str, Depends(get_current_user_id)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
) -> JournalEntryOut:
    entry = await repo.get_owned(entry_id, user_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    patch_data = body.model_dump(exclude_unset=True)
    insight_patch = {k: patch_data[k] for k in _INSIGHT_PATCH_KEYS if k in patch_data}
    if "insights" in insight_patch and insight_patch["insights"] is not None:
        ins_val = insight_patch["insights"]
        if hasattr(ins_val, "model_dump"):
            insight_patch["insights"] = ins_val.model_dump(mode="json")

    if insight_patch:
        current = {
            "summary": entry.summary,
            "sentiment_score": entry.sentiment_score,
            "insights": entry.insights or None,
            "insights_field_locks": list(entry.insights_field_locks),
        }
        updated = apply_journal_entry_insight_patch(current, insight_patch)
        entry.summary = updated["summary"]
        entry.sentiment_score = updated["sentiment_score"]
        raw_ins = updated.get("insights")
        entry.insights = raw_ins if raw_ins is not None else {}
        entry.insights_field_locks = list(updated.get("insights_field_locks") or [])

    for key, value in patch_data.items():
        if key in _INSIGHT_PATCH_KEYS:
            continue
        setattr(entry, key, value)

    entry.updated_at = datetime.now(timezone.utc)
    await entry.save()
    return journal_entry_to_out(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
) -> None:
    deleted = await repo.delete_owned(entry_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")


@router.post("/{entry_id}/analyze")
async def analyze_entry(
    entry_id: str,
    body: AnalyzeEntryBody,
    user_id: Annotated[str, Depends(get_current_user_id)],
    analyzer: Annotated[IAIAnalyzer, Depends(get_analyzer)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
) -> dict:
    """Re-run structured analysis; locked paths keep prior values (see DATA_CONTRACTS §Insights)."""
    entry = await repo.get_owned(entry_id, user_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    updated = await reanalyze_journal_entry(
        entry=entry,
        preserve_locked_fields=body.preserve_locked_fields,
        analyzer=analyzer,
    )
    return journal_entry_to_out(updated).model_dump(mode="json")


@router.post("/{entry_id}/upload-audio", response_model=JournalEntryOut)
async def upload_entry_audio(
    entry_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    repo: Annotated[JournalEntryRepository, Depends(_repo_dep)],
    audio_storage: Annotated[IAudioStorage, Depends(get_audio_storage)],
    transcriber: Annotated[ITranscriber, Depends(get_transcriber)],
    audio: UploadFile = File(..., description="Raw audio (webm, wav, mp3, etc.)"),
) -> JournalEntryOut:
    """Save audio under `AUDIO_STORAGE_PATH`, run `ITranscriber`, persist `audio_storage_key` + `transcript`."""
    entry = await repo.get_owned(entry_id, user_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    data = await audio.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file",
        )

    hint = audio.filename or "upload.bin"
    mime = audio.content_type
    try:
        storage_key, t_result = await save_audio_and_transcribe(
            audio_storage=audio_storage,
            transcriber=transcriber,
            user_id=user_id,
            filename_hint=hint,
            data=data,
            mime_type=mime,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    entry.audio_storage_key = storage_key
    entry.transcript = t_result.text
    if entry.cleaned_text and entry.cleaned_text.strip():
        entry.source = "mixed"
    else:
        entry.source = "audio"
    entry.updated_at = datetime.now(timezone.utc)
    await entry.save()
    return journal_entry_to_out(entry)
