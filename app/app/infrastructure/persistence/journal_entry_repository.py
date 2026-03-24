"""Journal entry persistence — queries scoped by `user_id`."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from beanie import PydanticObjectId

from app.infrastructure.persistence.documents import JournalEntryDocument


class JournalEntryRepository:
    async def insert(self, doc: JournalEntryDocument) -> JournalEntryDocument:
        await doc.insert()
        return doc

    async def get_owned(self, entry_id: str, user_id: str) -> JournalEntryDocument | None:
        try:
            oid = PydanticObjectId(entry_id)
        except (ValueError, TypeError):
            return None
        doc = await JournalEntryDocument.get(oid)
        if doc is None or doc.user_id != user_id:
            return None
        return doc

    async def create(
        self,
        *,
        user_id: str,
        source: Literal["text", "audio", "mixed"],
        audio_storage_key: str | None = None,
        transcript: str | None = None,
        cleaned_text: str | None = None,
        summary: str | None = None,
        sentiment_score: float | None = None,
        insights: dict | None = None,
        insights_field_locks: list[str] | None = None,
    ) -> JournalEntryDocument:
        now = datetime.now(timezone.utc)
        doc = JournalEntryDocument(
            user_id=user_id,
            source=source,
            created_at=now,
            updated_at=now,
            audio_storage_key=audio_storage_key,
            transcript=transcript,
            cleaned_text=cleaned_text,
            summary=summary,
            sentiment_score=sentiment_score,
            insights=dict(insights or {}),
            insights_field_locks=list(insights_field_locks or []),
        )
        await doc.insert()
        return doc

    async def list_for_user(
        self,
        *,
        user_id: str,
        limit: int,
        skip: int,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> tuple[list[JournalEntryDocument], int]:
        criteria: list = [JournalEntryDocument.user_id == user_id]
        if created_from is not None:
            criteria.append(JournalEntryDocument.created_at >= created_from)
        if created_to is not None:
            criteria.append(JournalEntryDocument.created_at <= created_to)
        query = JournalEntryDocument.find(*criteria)
        total = await query.count()
        items = (
            await query.sort(-JournalEntryDocument.created_at).skip(skip).limit(limit).to_list()
        )
        return items, total

    async def delete_owned(self, entry_id: str, user_id: str) -> bool:
        doc = await self.get_owned(entry_id, user_id)
        if doc is None:
            return False
        await doc.delete()
        return True


def get_journal_entry_repository() -> JournalEntryRepository:
    return JournalEntryRepository()
