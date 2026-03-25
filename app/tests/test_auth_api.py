"""Auth HTTP routes (requires MongoDB; skipped if unreachable)."""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.main import app


def _can_connect(uri: str) -> bool:
    client: MongoClient | None = None
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=2500)
        client.admin.command("ping")
        return True
    except Exception:
        return False
    finally:
        if client is not None:
            client.close()


def _mongo_uri() -> str:
    return os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017")


@pytest.fixture
def auth_client(monkeypatch: pytest.MonkeyPatch):
    uri = _mongo_uri()
    if not _can_connect(uri):
        pytest.skip(f"MongoDB not reachable at {uri}")
    from app.config import settings

    monkeypatch.setenv("MONGODB_URI", uri)
    db_name = f"journal_test_auth_{uuid.uuid4().hex}"
    monkeypatch.setattr(settings, "mongodb_db_name", db_name)

    with TestClient(app) as client:
        yield client


def test_register_login_me_flow(auth_client: TestClient) -> None:
    email = f"u-{uuid.uuid4().hex[:12]}@example.com"
    password = "a-valid-password-1"

    r = auth_client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert r.status_code == 201
    reg = r.json()
    assert reg["token_type"] == "bearer"
    assert "access_token" in reg
    assert reg["user"]["email"] == email.lower()
    token = reg["access_token"]

    r_me = auth_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r_me.status_code == 200
    me = r_me.json()
    assert me["user"]["email"] == email.lower()
    assert me["user"]["is_admin"] is False
    assert me["settings"]["timezone"] == "UTC"

    r_login = auth_client.post(
        "/api/auth/login",
        json={"email": email.upper(), "password": password},
    )
    assert r_login.status_code == 200
    assert r_login.json()["user"]["email"] == email.lower()


def test_me_without_token_returns_401(auth_client: TestClient) -> None:
    r = auth_client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_invalid_token_returns_401(auth_client: TestClient) -> None:
    r = auth_client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )
    assert r.status_code == 401


def test_login_invalid_password_returns_401(auth_client: TestClient) -> None:
    email = f"login-{uuid.uuid4().hex[:12]}@example.com"
    auth_client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct-horse-battery"},
    )
    r = auth_client.post(
        "/api/auth/login",
        json={"email": email, "password": "wrong"},
    )
    assert r.status_code == 401


def test_register_duplicate_email_returns_409(auth_client: TestClient) -> None:
    email = f"dup-{uuid.uuid4().hex[:12]}@example.com"
    body = {"email": email, "password": "same-password-1"}
    assert auth_client.post("/api/auth/register", json=body).status_code == 201
    r2 = auth_client.post("/api/auth/register", json=body)
    assert r2.status_code == 409
