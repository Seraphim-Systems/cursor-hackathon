"""Motor client + Beanie initialization for the FastAPI app."""

from __future__ import annotations

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.infrastructure.persistence.database import DOCUMENT_MODELS


async def init_beanie_for_app() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    await init_beanie(
        database=db,
        document_models=DOCUMENT_MODELS,
    )
    return client


async def mongo_ping_ok(client: AsyncIOMotorClient) -> bool:
    try:
        await client.admin.command("ping")
    except Exception:
        return False
    return True
