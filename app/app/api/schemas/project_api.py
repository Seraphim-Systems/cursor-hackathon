"""Pydantic shapes for project REST handlers."""

from datetime import datetime

from pydantic import BaseModel, Field


class ProjectOut(BaseModel):
    id: str
    user_id: str
    title: str
    normalized_name: str
    description: str | None = None
    first_seen_at: datetime
    last_mentioned_at: datetime
    related_entry_ids: list[str] = Field(default_factory=list)
    status: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_document(cls, doc: object) -> "ProjectOut":
        return cls(
            id=str(doc.id),
            user_id=doc.user_id,
            title=doc.title,
            normalized_name=doc.normalized_name,
            description=doc.description,
            first_seen_at=doc.first_seen_at,
            last_mentioned_at=doc.last_mentioned_at,
            related_entry_ids=list(doc.related_entry_ids),
            status=doc.status,
        )


class ProjectListResponse(BaseModel):
    items: list[ProjectOut]


class ProjectPatchBody(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
