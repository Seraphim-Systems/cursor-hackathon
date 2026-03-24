"""MongoDB client and Beanie initialization."""

from __future__ import annotations
from beanie import init_beanie as beanie_init
from motor.motor_asyncio import AsyncIOMotorClient

from app.infrastructure.persistence.documents import JournalEntryDocument, UserDocument
from app.infrastructure.persistence.project_document import ProjectDocument

from app.config import settings
from app.infrastructure.persistence.documents import UserDocument

DOCUMENT_MODELS = [UserDocument, JournalEntryDocument, ProjectDocument]

async def init_beanie(
    client: AsyncIOMotorClient,
    *,
    database_name: str | None = None,
) -> None:
    """Register Beanie models. Use `database_name` in tests to isolate collections."""

    db = database_name or settings.mongodb_db_name
    await beanie_init(
        database=client[db],
        document_models=[UserDocument],
    )


async def ping_mongo(client: AsyncIOMotorClient) -> bool:
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False
