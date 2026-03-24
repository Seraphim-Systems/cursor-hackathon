"""Integration tests for journal entry CRUD + ownership (P2.1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.api.deps import get_audio_storage, get_transcriber
from app.config import settings
from app.infrastructure.adapters.local_audio_storage import LocalAudioStorage
from app.infrastructure.adapters.stub_transcriber import StubTranscriber


def _mongo_available() -> bool:
    async def ping() -> None:
        client = AsyncIOMotorClient(settings.mongodb_uri)
        try:
            await client.admin.command("ping")
        finally:
            client.close()

    try:
        asyncio.run(ping())
    except Exception:
        return False
    return True


pytestmark = pytest.mark.skipif(not _mongo_available(), reason="MongoDB not reachable")


@pytest.fixture
def client() -> TestClient:
    from app.main import app

    with TestClient(app) as c:
        yield c


def _register(client: TestClient, suffix: str | None = None) -> tuple[str, str]:
    email = f"u{suffix or uuid.uuid4().hex[:12]}@example.com"
    r = client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    return data["access_token"], data["user"]["id"]


def test_entries_crud_and_ownership(client: TestClient) -> None:
    token_a, user_a = _register(client)
    token_b, _user_b = _register(client)

    h_a = {"Authorization": f"Bearer {token_a}"}
    h_b = {"Authorization": f"Bearer {token_b}"}

    r = client.post(
        "/api/entries",
        json={"source": "text", "cleaned_text": "hello"},
        headers=h_a,
    )
    assert r.status_code == 201
    entry = r.json()
    assert entry["user_id"] == user_a
    assert entry["source"] == "text"
    assert entry["cleaned_text"] == "hello"
    assert entry["insights"] is None
    eid = entry["id"]

    r = client.get("/api/entries", headers=h_a)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert any(x["id"] == eid for x in body["items"])

    r = client.get(f"/api/entries/{eid}", headers=h_b)
    assert r.status_code == 404

    r = client.patch(
        f"/api/entries/{eid}",
        json={"summary": "day one"},
        headers=h_a,
    )
    assert r.status_code == 200
    assert r.json()["summary"] == "day one"

    r = client.delete(f"/api/entries/{eid}", headers=h_b)
    assert r.status_code == 404

    r = client.delete(f"/api/entries/{eid}", headers=h_a)
    assert r.status_code == 204

    r = client.get(f"/api/entries/{eid}", headers=h_a)
    assert r.status_code == 404


def test_post_entry_multipart_audio_sets_storage_key(client: TestClient, tmp_path) -> None:
    """Multipart create persists audio, runs transcriber, sets `audio_storage_key` + `transcript` (P2.2–P2.3)."""
    client.app.dependency_overrides[get_audio_storage] = lambda: LocalAudioStorage(tmp_path)
    client.app.dependency_overrides[get_transcriber] = lambda: StubTranscriber()
    try:
        token, user_id = _register(client)
        h = {"Authorization": f"Bearer {token}"}
        r = client.post(
            "/api/entries",
            headers=h,
            data={"cleaned_text": "voice note", "source": "text"},
            files={"audio": ("note.webm", b"\x00\x01\x02", "audio/webm")},
        )
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["user_id"] == user_id
        assert data["source"] == "mixed"
        assert data["audio_storage_key"]
        assert data["transcript"]
        assert "sha256:" in data["transcript"]
        key = data["audio_storage_key"]
        assert (tmp_path / key).is_file()
    finally:
        client.app.dependency_overrides.pop(get_transcriber, None)
        client.app.dependency_overrides.pop(get_audio_storage, None)
