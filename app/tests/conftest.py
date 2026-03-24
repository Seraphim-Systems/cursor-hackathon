"""Pytest configuration and shared fixtures."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI

os.environ.setdefault("MONGODB_DB_NAME", "journal_pytest")

from app.api.routers.entries import router as entries_router


@asynccontextmanager
async def _empty_lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield


@pytest.fixture
def analyze_only_app() -> FastAPI:
    """Entries routes only — no Mongo startup (for analyze API unit tests)."""
    app = FastAPI(lifespan=_empty_lifespan)
    app.include_router(entries_router, prefix="/api")
    return app
