"""Project persistence — used by HTTP layer and post-analyze sync."""

from datetime import datetime

from beanie import PydanticObjectId

from app.infrastructure.persistence.project_document import ProjectDocument


class ProjectRepository:
    async def find_by_user_and_normalized(
        self, user_id: str, normalized_name: str
    ) -> ProjectDocument | None:
        return await ProjectDocument.find_one(
            {"user_id": user_id, "normalized_name": normalized_name}
        )

    async def create(
        self,
        *,
        user_id: str,
        title: str,
        normalized_name: str,
        description: str | None,
        first_seen_at: datetime,
        last_mentioned_at: datetime,
        related_entry_ids: list[str],
        status: str | None = None,
    ) -> ProjectDocument:
        doc = ProjectDocument(
            user_id=user_id,
            title=title,
            normalized_name=normalized_name,
            description=description,
            first_seen_at=first_seen_at,
            last_mentioned_at=last_mentioned_at,
            related_entry_ids=related_entry_ids,
            status=status,
        )
        await doc.insert()
        return doc

    async def list_for_user(self, user_id: str) -> list[ProjectDocument]:
        return (
            await ProjectDocument.find({"user_id": user_id})
            .sort("-last_mentioned_at")
            .to_list()
        )

    async def get_for_user(self, user_id: str, project_id: str) -> ProjectDocument | None:
        try:
            oid = PydanticObjectId(project_id)
        except Exception:
            return None
        return await ProjectDocument.find_one({"_id": oid, "user_id": user_id})
