from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any, Literal

from beanie import PydanticObjectId

from app.infrastructure.persistence.documents import (
    InsightsEmbedded,
    JournalEntryDocument,
    UserDocument,
    PeriodSummaryDocument,
)
from app.infrastructure.persistence.project_document import ProjectDocument
from app.schemas.user_settings import UserSettings


def normalize_email(email: str) -> str:
    """Lowercase + trim for unique index and lookups (case-insensitive identity)."""
    return email.strip().lower()


def oid(val: str | PydanticObjectId) -> PydanticObjectId:
    if isinstance(val, PydanticObjectId):
        return val
    return PydanticObjectId(val)


class UserRepository:
    """CRUD for `UserDocument`."""

    async def create(
        self,
        *,
        email: str,
        hashed_password: str,
        is_admin: bool = False,
        settings: UserSettings | None = None,
    ) -> UserDocument:
        doc = UserDocument(
            email=normalize_email(email),
            hashed_password=hashed_password,
            is_admin=is_admin,
            settings=settings or UserSettings(),
        )
        await doc.insert()
        return doc

    async def find_by_email(self, email: str) -> UserDocument | None:
        return await UserDocument.find_one(UserDocument.email == normalize_email(email))

    async def find_by_id(self, user_id: str | PydanticObjectId) -> UserDocument | None:
        try:
            return await UserDocument.get(oid(user_id))
        except (ValueError, TypeError):
            return None

    async def patch_settings(
        self,
        user_id: str | PydanticObjectId,
        partial: dict[str, Any],
    ) -> UserDocument | None:
        """Merge partial settings (JSON Merge Patch–style merge)."""
        user = await self.find_by_id(user_id)
        if user is None:
            return None
        current = user.settings.model_dump()
        for key, value in partial.items():
            current[key] = value
        user.settings = UserSettings.model_validate(current)
        await user.save()
        return user


class JournalEntryRepository:
    """CRUD for `JournalEntryDocument`."""

    async def create(
        self,
        *,
        user_id: str,
        source: Literal["text", "audio", "mixed"] = "text",
        title: str = "",
        content: str = "",
        audio_storage_key: str | None = None,
        transcript: str | None = None,
        cleaned_text: str | None = None,
        summary: str | None = None,
        sentiment_score: float | None = None,
        insights: dict[str, Any] | None = None,
        insights_field_locks: list[str] | None = None,
    ) -> JournalEntryDocument:
        doc = JournalEntryDocument(
            user_id=user_id,
            source=source,
            title=title,
            content=content,
            audio_storage_key=audio_storage_key,
            transcript=transcript,
            cleaned_text=cleaned_text,
            summary=summary,
            sentiment_score=sentiment_score,
            insights=InsightsEmbedded.model_validate(insights or {}),
            insights_field_locks=insights_field_locks or [],
        )
        await doc.insert()
        return doc

    async def get_owned(self, entry_id: str, user_id: str) -> JournalEntryDocument | None:
        try:
            doc = await JournalEntryDocument.get(oid(entry_id))
        except (ValueError, TypeError):
            return None
        if doc is None or doc.user_id != user_id:
            return None
        return doc

    async def delete_owned(self, entry_id: str, user_id: str) -> bool:
        doc = await self.get_owned(entry_id, user_id)
        if doc is None:
            return False
        await doc.delete()
        return True

    async def list_for_user(
        self,
        user_id: str,
        *,
        skip: int = 0,
        limit: int = 50,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
    ) -> tuple[list[JournalEntryDocument], int]:
        queries: list[Any] = [JournalEntryDocument.user_id == user_id]
        if created_from is not None:
            queries.append(JournalEntryDocument.created_at >= created_from)
        if created_to is not None:
            queries.append(JournalEntryDocument.created_at <= created_to)

        cursor = JournalEntryDocument.find(*queries).sort(-JournalEntryDocument.created_at)
        total = await cursor.count()
        items = await cursor.skip(skip).limit(limit).to_list()
        return items, total


def get_journal_entry_repository() -> JournalEntryRepository:
    return JournalEntryRepository()


class ProjectRepository:
    """CRUD for `ProjectDocument`."""

    async def create(
        self,
        *,
        user_id: str,
        name: str,
        normalized_name: str = "",
        description: str = "",
    ) -> ProjectDocument:
        doc = ProjectDocument(
            user_id=user_id,
            name=name,
            normalized_name=normalized_name,
            description=description,
        )
        await doc.insert()
        return doc

    async def list_for_user(self, user_id: str) -> list[ProjectDocument]:
        return (
            await ProjectDocument.find(ProjectDocument.user_id == user_id)
            .sort(-ProjectDocument.created_at)
            .to_list()
        )

    async def get_owned(self, project_id: str, user_id: str) -> ProjectDocument | None:
        try:
            doc = await ProjectDocument.get(oid(project_id))
        except (ValueError, TypeError):
            return None
        if doc is None or doc.user_id != user_id:
            return None
        return doc

    async def find_by_normalized(self, user_id: str, normalized: str) -> ProjectDocument | None:
        return await ProjectDocument.find_one(
            ProjectDocument.user_id == user_id,
            ProjectDocument.normalized_name == normalized,
        )
