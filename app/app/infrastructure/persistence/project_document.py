"""Beanie model for user projects (auto-upserted from insights, user-editable)."""

from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class ProjectDocument(Document):
    user_id: str
    title: str
    normalized_name: str
    description: str | None = None
    first_seen_at: datetime
    last_mentioned_at: datetime
    related_entry_ids: list[str] = Field(default_factory=list)
    status: str | None = None

    class Settings:
        name = "projects"
        indexes = [
            IndexModel(
                [("user_id", 1), ("normalized_name", 1)],
                unique=True,
            ),
            IndexModel([("user_id", 1), ("last_mentioned_at", -1)]),
        ]
