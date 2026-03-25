import asyncio
import logging
from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from app.api.routers import admin, auth, calendar, entries, projects, settings as settings_router
from app.config import settings
from app.infrastructure.adapters.registry import build_analyzer, build_transcriber
from app.infrastructure.persistence.beanie_app import init_beanie_for_app, mongo_ping_ok
from app.infrastructure.persistence.documents import (
    JournalEntryDocument,
    ProjectDocument,
    UserDocument,
    PeriodSummaryDocument,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = await init_beanie_for_app()
    app.state.mongo_client = client
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
app.include_router(entries.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
async def health(request: Request) -> dict:
    """Liveness; DB connectivity + active transcription / analysis adapters."""
    transcriber = build_transcriber(settings)
    analyzer = build_analyzer(settings)
    database = "disconnected"
    client = getattr(request.app.state, "mongo_client", None)
    if client is not None and await mongo_ping_ok(client):
        database = "connected"
    return {
        "status": "ok",
        "database": database,
        "transcription_adapter": transcriber.__class__.__name__,
        "analysis_adapter": analyzer.__class__.__name__,
    }
