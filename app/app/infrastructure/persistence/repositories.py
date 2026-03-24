from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any

from beanie import PydanticObjectId

from app.infrastructure.persistence.documents import (
    JournalEntryDocument,
    ProjectDocument,
    UserDocument,
)
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
        settings: UserSettings | None = None,
    ) -> UserDocument:
        doc = UserDocument(
            email=normalize_email(email),
            hashed_password=hashed_password,
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
        content: str,
        title: str = "",
    ) -> JournalEntryDocument:
        doc = JournalEntryDocument(
            user_id=user_id,
            content=content,
            title=title,
        )
        await doc.insert()
        return doc

    async def get_for_user(self, entry_id: str, user_id: str) -> JournalEntryDocument | None:
        try:
            doc = await JournalEntryDocument.get(oid(entry_id))
        except (ValueError, TypeError):
            return None
        if doc is None or doc.user_id != user_id:
            return None
        return doc

    async def list_for_user(
        self,
        user_id: str,
        *,
        skip: int = 0,
        limit: int = 50,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[JournalEntryDocument]:
        queries: list[Any] = [JournalEntryDocument.user_id == user_id]
        if from_date is not None:
            start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
            queries.append(JournalEntryDocument.created_at >= start)
        if to_date is not None:
            end = datetime.combine(to_date, time.max, tzinfo=timezone.utc)
            queries.append(JournalEntryDocument.created_at <= end)

        return (
            await JournalEntryDocument.find(*queries)
            .sort(-JournalEntryDocument.created_at)
            .skip(skip)
            .limit(limit)
            .to_list()
        )

    async def count_for_user(self, user_id: str) -> int:
        return await JournalEntryDocument.find(JournalEntryDocument.user_id == user_id).count()


class ProjectRepository:
    """CRUD for `ProjectDocument`."""

    async def create(
        self,
        *,
        user_id: str,
        name: str,
        description: str = "",
    ) -> ProjectDocument:
        doc = ProjectDocument(
            user_id=user_id,
            name=name,
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

    async def get_for_user(self, project_id: str, user_id: str) -> ProjectDocument | None:
        try:
            doc = await ProjectDocument.get(oid(project_id))
        except (ValueError, TypeError):
            return None
        if doc is None or doc.user_id != user_id:
            return None
        return doc
