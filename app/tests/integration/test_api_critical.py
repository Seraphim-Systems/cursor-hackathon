"""Critical HTTP flows: health, auth, entries, analyze (contract-aligned)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_ok(async_client: AsyncClient) -> None:
    r = await async_client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


@pytest.mark.asyncio
async def test_entries_analyze_respects_locked_fields(async_client: AsyncClient) -> None:
    reg = await async_client.post(
        "/api/auth/register",
        json={"email": "flow@example.com", "password": "password12"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create = await async_client.post(
        "/api/entries",
        data={"text": "first version of journal text for stub", "run_analysis": "true"},
        headers=headers,
    )
    assert create.status_code == 201
    entry_id = create.json()["id"]
    first_summary = create.json()["summary"]

    patch = await async_client.patch(
        f"/api/entries/{entry_id}",
        json={
            "insights_field_locks": ["summary"],
            "cleaned_text": "second version so stub summary would differ if summary were not locked",
        },
        headers=headers,
    )
    assert patch.status_code == 200

    again = await async_client.post(
        f"/api/entries/{entry_id}/analyze",
        json={"preserve_locked_fields": True},
        headers=headers,
    )
    assert again.status_code == 200
    assert again.json()["summary"] == first_summary


@pytest.mark.asyncio
async def test_unauthorized_entries_rejected(async_client: AsyncClient) -> None:
    r = await async_client.get("/api/entries")
    assert r.status_code in (401, 403)
