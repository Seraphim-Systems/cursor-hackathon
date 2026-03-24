"""Repositories for Beanie documents."""

from __future__ import annotations

from typing import Any

from beanie import PydanticObjectId

from app.infrastructure.persistence.documents import UserDocument
from app.schemas.user_settings import UserSettings

from app.infrastructure.persistence.documents import JournalEntryDocument, ProjectDocument, UserDocument
from app.infrastructure.persistence.documents import JournalEntryDocument, UserDocument
from app.infrastructure.persistence.project_document import ProjectDocument
from __future__ import annotations

from datetime import date, datetime, time, timezone
"""Repositories for Beanie documents."""

from __future__ import annotations

from typing import Any

from beanie import PydanticObjectId


def normalize_email(email: str) -> str:
    """Lowercase + trim for unique index and lookups (case-insensitive identity)."""

    return email.strip().lower()


class UserRepository:
    """CRUD for `UserDocument` (unique index on `email`)."""

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
        return await UserDocument.get(user_id)

    async def patch_settings(
        self,
        user_id: str | PydanticObjectId,
        partial: dict[str, Any],
    ) -> UserDocument | None:
        """Merge partial settings (JSON Merge Patch–style merge; extra keys allowed per contract)."""

        user = await UserDocument.get(user_id)
        if user is None:
            return None
        current = user.settings.model_dump()
        for key, value in partial.items():
            current[key] = value
        user.settings = UserSettings.model_validate(current)
        await user.save()
        return user

def oid(val: str) -> PydanticObjectId:
    return PydanticObjectId(val)


class UserRepository:
    async def get_by_id(self, user_id: str) -> UserDocument | None:
        try:
            return await UserDocument.get(oid(user_id))
        except (ValueError, TypeError):
            return None

    async def get_by_email(self, email: str) -> UserDocument | None:
        return await UserDocument.find_one(UserDocument.email == email.lower().strip())

    async def create(self, *, email: str, hashed_password: str) -> UserDocument:
        user = UserDocument(email=email.lower().strip(), hashed_password=hashed_password)
        await user.insert()
        return user


class JournalEntryRepository:
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
    async def find_by_normalized(self, user_id: str, normalized: str) -> ProjectDocument | None:
        return await ProjectDocument.find_one(
            ProjectDocument.user_id == user_id,
            ProjectDocument.normalized_name == normalized,
        )

    async def list_for_user(self, user_id: str) -> list[ProjectDocument]:
        return (
            await ProjectDocument.find(ProjectDocument.user_id == user_id)
            .sort(-ProjectDocument.last_mentioned_at)
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
from app.infrastructure.persistence.documents import UserDocument
from app.schemas.user_settings import UserSettings


def normalize_email(email: str) -> str:
    """Lowercase + trim for unique index and lookups (case-insensitive identity)."""

    return email.strip().lower()


class UserRepository:
    """CRUD for `UserDocument` (unique index on `email`)."""

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
        return await UserDocument.get(user_id)

    async def patch_settings(
        self,
        user_id: str | PydanticObjectId,
        partial: dict[str, Any],
    ) -> UserDocument | None:
        """Merge partial settings (JSON Merge Patch–style merge; extra keys allowed per contract)."""

        user = await UserDocument.get(user_id)
        if user is None:
            return None
        current = user.settings.model_dump()
        for key, value in partial.items():
            current[key] = value
        user.settings = UserSettings.model_validate(current)
        await user.save()
        return user
