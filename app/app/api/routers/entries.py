from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.api.deps import JournalFacadeDep, UserDep
from app.api.schemas.entries import JournalEntryResponse, entry_to_response
from app.infrastructure.persistence.repositories import JournalEntryRepository

router = APIRouter(prefix="/entries", tags=["entries"])


class AnalyzeBody(BaseModel):
    preserve_locked_fields: bool = True


class EntryPatchBody(BaseModel):
    cleaned_text: str | None = None
    transcript: str | None = None
    summary: str | None = None
    sentiment_score: float | None = Field(None, ge=-1, le=1)
    insights: dict | None = None
    insights_field_locks: list[str] | None = None


class EntryListOut(BaseModel):
    items: list[JournalEntryResponse]
    total: int | None = None


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    user: UserDep,
    facade: JournalFacadeDep,
    text: str | None = Form(None),
    audio: UploadFile | None = File(None),
    run_analysis: bool = Form(True),
) -> JournalEntryResponse:
    audio_bytes: bytes | None = None
    audio_filename: str | None = None
    audio_ct: str | None = None
    if audio is not None:
        audio_bytes = await audio.read()
        audio_filename = audio.filename
        audio_ct = audio.content_type

    try:
        entry = await facade.create_entry(
            user_id=str(user.id),
            text=text,
            audio_bytes=audio_bytes,
            audio_filename=audio_filename,
            audio_content_type=audio_ct,
            run_analysis=run_analysis,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return entry_to_response(entry)


@router.get("", response_model=EntryListOut)
async def list_entries(
    user: UserDep,
    limit: int = 50,
    offset: int = 0,
) -> EntryListOut:
    repo = JournalEntryRepository()
    items = await repo.list_for_user(str(user.id), skip=offset, limit=min(limit, 100))
    total = await repo.count_for_user(str(user.id))
    return EntryListOut(
        items=[entry_to_response(e) for e in items],
        total=total,
    )


@router.get("/{entry_id}", response_model=JournalEntryResponse)
async def get_entry(entry_id: str, user: UserDep) -> JournalEntryResponse:
    repo = JournalEntryRepository()
    doc = await repo.get_for_user(entry_id, str(user.id))
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry_to_response(doc)


@router.patch("/{entry_id}", response_model=JournalEntryResponse)
async def patch_entry(
    entry_id: str,
    body: EntryPatchBody,
    user: UserDep,
    facade: JournalFacadeDep,
) -> JournalEntryResponse:
    try:
        doc = await facade.patch_entry(
            user_id=str(user.id),
            entry_id=entry_id,
            cleaned_text=body.cleaned_text,
            transcript=body.transcript,
            summary=body.summary,
            sentiment_score=body.sentiment_score,
            insights=body.insights,
            insights_field_locks=body.insights_field_locks,
        )
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return entry_to_response(doc)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(entry_id: str, user: UserDep, facade: JournalFacadeDep) -> None:
    ok = await facade.delete_entry(user_id=str(user.id), entry_id=entry_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")


@router.post("/{entry_id}/audio", response_model=JournalEntryResponse)
async def upload_entry_audio(
    entry_id: str,
    user: UserDep,
    facade: JournalFacadeDep,
    audio: UploadFile = File(...),
    run_analysis: bool = Form(True),
) -> JournalEntryResponse:
    audio_bytes = await audio.read()
    try:
        doc = await facade.attach_audio_and_process(
            user_id=str(user.id),
            entry_id=entry_id,
            audio_bytes=audio_bytes,
            audio_filename=audio.filename,
            audio_content_type=audio.content_type,
            run_analysis=run_analysis,
        )
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return entry_to_response(doc)


@router.post("/{entry_id}/analyze", response_model=JournalEntryResponse)
async def analyze_entry(
    entry_id: str,
    user: UserDep,
    facade: JournalFacadeDep,
    body: AnalyzeBody | None = None,
) -> JournalEntryResponse:
    preserve = True if body is None else body.preserve_locked_fields
    try:
        doc = await facade.reanalyze_entry(
            user_id=str(user.id),
            entry_id=entry_id,
            preserve_locked_fields=preserve,
        )
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return entry_to_response(doc)
