"""Orchestrate journal entry lifecycle: storage, transcription, AI, project sync."""

from __future__ import annotations

from datetime import datetime, timezone

from app.domain.insight_apply import apply_analysis_to_entry
from app.domain.project_normalize import normalized_project_name
from app.domain.protocols import IAIAnalyzer, IAudioStorage, ITranscriber
from app.domain.text_utils import compose_cleaned_text
from app.infrastructure.persistence.documents import JournalEntryDocument, ProjectDocument, SourceKind
from app.infrastructure.persistence.repositories import JournalEntryRepository, ProjectRepository


class JournalFacade:
    def __init__(
        self,
        *,
        entries: JournalEntryRepository,
        projects: ProjectRepository,
        storage: IAudioStorage,
        transcriber: ITranscriber,
        analyzer: IAIAnalyzer,
    ) -> None:
        self._entries = entries
        self._projects = projects
        self._storage = storage
        self._transcriber = transcriber
        self._analyzer = analyzer

    def _touch(self, entry: JournalEntryDocument) -> None:
        entry.updated_at = datetime.now(timezone.utc)

    async def create_entry(
        self,
        *,
        user_id: str,
        text: str | None,
        audio_bytes: bytes | None,
        audio_filename: str | None,
        audio_content_type: str | None,
        run_analysis: bool,
    ) -> JournalEntryDocument:
        if not text and not audio_bytes:
            raise ValueError("Provide text and/or audio")

        transcript: str | None = None
        audio_key: str | None = None

        if audio_bytes:
            audio_key = await self._storage.save(
                user_id=user_id,
                filename_hint=audio_filename or "recording",
                data=audio_bytes,
            )
            tr = await self._transcriber.transcribe(
                audio_bytes=audio_bytes,
                mime_type=audio_content_type,
            )
            transcript = tr.text

        if audio_bytes and text and text.strip():
            source: SourceKind = "mixed"
        elif audio_bytes:
            source = "audio"
        else:
            source = "text"

        cleaned = compose_cleaned_text(user_text=text, transcript=transcript)
        if not cleaned:
            cleaned = ""

        entry = JournalEntryDocument(
            user_id=user_id,
            source=source,
            audio_storage_key=audio_key,
            transcript=transcript,
            cleaned_text=cleaned or None,
        )
        await entry.insert()

        if run_analysis and cleaned:
            await self._run_analysis(entry, preserve_locked_fields=False)
        else:
            self._touch(entry)
            await entry.save()

        return entry

    async def attach_audio_and_process(
        self,
        *,
        user_id: str,
        entry_id: str,
        audio_bytes: bytes,
        audio_filename: str | None,
        audio_content_type: str | None,
        run_analysis: bool,
    ) -> JournalEntryDocument:
        entry = await self._entries.get_for_user(entry_id, user_id)
        if entry is None:
            raise LookupError("entry not found")

        if entry.audio_storage_key:
            await self._storage.delete(entry.audio_storage_key)

        user_part = entry.cleaned_text if entry.source == "text" else None
        entry.audio_storage_key = await self._storage.save(
            user_id=user_id,
            filename_hint=audio_filename or "recording",
            data=audio_bytes,
        )
        tr = await self._transcriber.transcribe(
            audio_bytes=audio_bytes,
            mime_type=audio_content_type,
        )
        entry.transcript = tr.text
        entry.cleaned_text = (
            compose_cleaned_text(user_text=user_part, transcript=entry.transcript) or None
        )
        if entry.source == "text":
            entry.source = "mixed"
        elif entry.source != "mixed":
            entry.source = "audio"

        self._touch(entry)
        await entry.save()

        if run_analysis and entry.cleaned_text:
            await self._run_analysis(entry, preserve_locked_fields=True)

        return entry

    async def reanalyze_entry(
        self,
        *,
        user_id: str,
        entry_id: str,
        preserve_locked_fields: bool,
    ) -> JournalEntryDocument:
        entry = await self._entries.get_for_user(entry_id, user_id)
        if entry is None:
            raise LookupError("entry not found")
        body = (entry.cleaned_text or entry.transcript or "").strip()
        if not body:
            raise ValueError("nothing to analyze")
        await self._run_analysis(entry, preserve_locked_fields=preserve_locked_fields)
        return entry

    async def _run_analysis(
        self,
        entry: JournalEntryDocument,
        *,
        preserve_locked_fields: bool,
    ) -> None:
        text = (entry.cleaned_text or entry.transcript or "").strip()
        result = await self._analyzer.analyze(text=text)
        apply_analysis_to_entry(
            entry,
            result,
            preserve_locked_fields=preserve_locked_fields,
        )
        self._touch(entry)
        await entry.save()
        entry_id = str(entry.id)
        await self._sync_projects(entry.user_id, entry_id, result.projects)

    async def _sync_projects(self, user_id: str, entry_id: str, projects: list[dict]) -> None:
        now = datetime.now(timezone.utc)
        for raw in projects:
            if not isinstance(raw, dict):
                continue
            name = str(raw.get("name", "")).strip()
            if len(name) < 2:
                continue
            norm = normalized_project_name(name)
            if not norm:
                continue
            existing = await self._projects.find_by_normalized(user_id, norm)
            notes = str(raw.get("notes") or "").strip() or None
            if existing:
                existing.last_mentioned_at = now
                if notes and (existing.description is None or existing.description == ""):
                    existing.description = notes
                if entry_id not in existing.related_entry_ids:
                    existing.related_entry_ids.append(entry_id)
                    if len(existing.related_entry_ids) > 100:
                        existing.related_entry_ids = existing.related_entry_ids[-100:]
                await existing.save()
            else:
                doc = ProjectDocument(
                    user_id=user_id,
                    title=name[:200],
                    normalized_name=norm,
                    description=notes,
                    first_seen_at=now,
                    last_mentioned_at=now,
                    related_entry_ids=[entry_id],
                )
                await doc.insert()

    async def patch_entry(
        self,
        *,
        user_id: str,
        entry_id: str,
        cleaned_text: str | None = None,
        transcript: str | None = None,
        summary: str | None = None,
        sentiment_score: float | None = None,
        insights: dict | None = None,
        insights_field_locks: list[str] | None = None,
    ) -> JournalEntryDocument:
        entry = await self._entries.get_for_user(entry_id, user_id)
        if entry is None:
            raise LookupError("entry not found")
        if cleaned_text is not None:
            entry.cleaned_text = cleaned_text or None
        if transcript is not None:
            entry.transcript = transcript or None
        if summary is not None:
            entry.summary = summary
        if sentiment_score is not None:
            entry.sentiment_score = sentiment_score
        if insights_field_locks is not None:
            entry.insights_field_locks = list(insights_field_locks)
        if insights is not None:
            from app.infrastructure.persistence.documents import InsightsEmbedded

            entry.insights = InsightsEmbedded.model_validate(insights)
        self._touch(entry)
        await entry.save()
        return entry

    async def delete_entry(self, *, user_id: str, entry_id: str) -> bool:
        entry = await self._entries.get_for_user(entry_id, user_id)
        if entry is None:
            return False
        if entry.audio_storage_key:
            await self._storage.delete(entry.audio_storage_key)
        await entry.delete()
        return True
