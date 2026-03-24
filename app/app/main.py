<<<<<<< HEAD
<<<<<<< Updated upstream
from contextlib import asynccontextmanager
from typing import Any

from beanie import init_beanie
=======
import asyncio
import logging
from contextlib import asynccontextmanager

>>>>>>> Stashed changes
=======
import asyncio
import logging
from contextlib import asynccontextmanager

>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

<<<<<<< HEAD
<<<<<<< Updated upstream
from app.api.routers import auth, calendar, entries, projects, settings as settings_router
from app.config import settings
from app.infrastructure.adapters import build_analyzer, build_transcriber
from app.infrastructure.persistence.documents import (
    JournalEntryDocument,
    ProjectDocument,
    UserDocument,
)

# Routers register on /api/*
=======
from app.api.routers import auth, settings as settings_router
from app.config import settings
from app.infrastructure.adapters import build_analyzer, build_transcriber
from app.infrastructure.persistence.database import init_beanie

logger = logging.getLogger(__name__)
>>>>>>> Stashed changes
=======
from app.api.routers import auth, settings as settings_router
from app.config import settings
from app.infrastructure.adapters import build_analyzer, build_transcriber
from app.infrastructure.persistence.database import init_beanie

logger = logging.getLogger(__name__)
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncIOMotorClient(settings.mongodb_uri)
<<<<<<< HEAD
<<<<<<< Updated upstream
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[UserDocument, JournalEntryDocument, ProjectDocument],
    )
    app.state.mongo = client
=======
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    app.state.mongo_client = client
    try:
        await client.admin.command("ping")
        await init_beanie(client)
    except Exception:
        logger.exception(
            "MongoDB ping or Beanie init failed; /api/health will report database disconnected"
        )
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    yield
    client.close()


app = FastAPI(
    title="Journal API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
<<<<<<< HEAD
<<<<<<< Updated upstream
app.include_router(entries.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")


@app.get("/api/health")
async def health(request: Request) -> dict[str, Any]:
    """Liveness, database ping, active adapters (see data contracts §Health)."""
    db_status = "disconnected"
    client: AsyncIOMotorClient | None = getattr(request.app.state, "mongo", None)
    if client is not None:
        try:
            await client.admin.command("ping")
            db_status = "connected"
        except Exception:
            db_status = "disconnected"

=======


@app.get("/api/health")
async def health(request: Request) -> dict:
    """Liveness; DB connectivity + active transcription / analysis adapters."""
>>>>>>> Stashed changes
=======


@app.get("/api/health")
async def health(request: Request) -> dict:
    """Liveness; DB connectivity + active transcription / analysis adapters."""
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    transcriber = build_transcriber(settings)
    analyzer = build_analyzer(settings)
    client = getattr(request.app.state, "mongo_client", None)
    db_status = "disconnected"
    if client is not None:
        try:
            await asyncio.wait_for(client.admin.command("ping"), timeout=2.0)
            db_status = "connected"
        except Exception:
            db_status = "disconnected"
    return {
        "status": "ok",
        "database": db_status,
        "transcription_adapter": transcriber.__class__.__name__,
        "analysis_adapter": analyzer.__class__.__name__,
    }
