"""MongoDB + Beanie for integration tests (facade, API). Skips if DB unreachable."""

from __future__ import annotations

import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.infrastructure.persistence.documents import JournalEntryDocument, ProjectDocument, UserDocument
from app.main import app


@pytest_asyncio.fixture(scope="session")
async def mongo_client_session() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        await client.admin.command("ping")
    except Exception as exc:
        pytest.skip(f"MongoDB unavailable ({settings.mongodb_uri}): {exc}")

    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[UserDocument, JournalEntryDocument, ProjectDocument],
    )
    app.state.mongo = client
    yield client
    client.close()


@pytest_asyncio.fixture(autouse=True)
async def _clean_collections(mongo_client_session: AsyncIOMotorClient) -> None:
    await UserDocument.delete_all()
    await JournalEntryDocument.delete_all()
    await ProjectDocument.delete_all()
    yield


@pytest_asyncio.fixture
async def async_client(mongo_client_session: AsyncIOMotorClient) -> AsyncClient:
    _ = mongo_client_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
