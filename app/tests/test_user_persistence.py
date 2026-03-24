"""User document + repository tests (requires MongoDB; skipped if unreachable)."""

from __future__ import annotations

import os
import uuid

import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

from app.infrastructure.persistence.database import init_beanie
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository
from app.schemas.user_settings import UserSettings


async def _can_connect(uri: str) -> bool:
    client: AsyncIOMotorClient | None = None
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2500)
        await client.admin.command("ping")
        return True
    except Exception:
        return False
    finally:
        if client is not None:
            client.close()


def _mongo_uri() -> str:
    return os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017")


@pytest.fixture
async def mongo_setup():
    uri = _mongo_uri()
    if not await _can_connect(uri):
        pytest.skip(f"MongoDB not reachable at {uri}")
    db_name = f"journal_test_{uuid.uuid4().hex}"
    client = AsyncIOMotorClient(uri)
    await init_beanie(client, database_name=db_name)
    yield client, db_name
    await client.drop_database(db_name)
    client.close()


@pytest.mark.asyncio
async def test_create_and_find_by_email_normalizes_case(mongo_setup) -> None:
    _, _ = mongo_setup
    repo = UserRepository()
    created = await repo.create(email="User@Example.com", hashed_password="h")
    assert str(created.email) == "user@example.com"
    found = await repo.find_by_email("USER@EXAMPLE.COM")
    assert found is not None
    assert str(found.id) == str(created.id)


@pytest.mark.asyncio
async def test_unique_email_index(mongo_setup) -> None:
    _, _ = mongo_setup
    repo = UserRepository()
    await repo.create(email="a@b.co", hashed_password="h1")
    with pytest.raises(DuplicateKeyError):
        await repo.create(email="A@B.CO", hashed_password="h2")


@pytest.mark.asyncio
async def test_settings_defaults_match_contract_fields(mongo_setup) -> None:
    _, _ = mongo_setup
    repo = UserRepository()
    u = await repo.create(email="s@test.dev", hashed_password="x")
    s = u.settings
    assert s.timezone == "UTC"
    assert s.week_starts_on == "monday"
    assert s.notifications_enabled is True


@pytest.mark.asyncio
async def test_patch_settings_merge(mongo_setup) -> None:
    _, _ = mongo_setup
    repo = UserRepository()
    u = await repo.create(email="patch@test.dev", hashed_password="x")
    updated = await repo.patch_settings(u.id, {"timezone": "Europe/Berlin", "theme": "dark"})
    assert updated is not None
    assert updated.settings.timezone == "Europe/Berlin"
    assert updated.settings.theme == "dark"
