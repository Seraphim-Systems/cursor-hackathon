"""Bootstrap env before `app.config.settings` is imported by any test module."""

from __future__ import annotations
from fastapi import FastAPI
from app.api.routers.entries import router as entries_router

import os
import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-pytest")
os.environ.setdefault("MONGODB_DB_NAME", "journal_pytest")
os.environ.setdefault("TRANSCRIPTION_PROVIDER", "stub")
os.environ.setdefault("AI_ANALYSIS_PROVIDER", "stub")
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


@asynccontextmanager
async def _empty_lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield


@pytest.fixture
def analyze_only_app() -> FastAPI:
    """Entries routes only — no Mongo startup (for analyze API unit tests)."""
    app = FastAPI(lifespan=_empty_lifespan)
    app.include_router(entries_router, prefix="/api")
    return app
