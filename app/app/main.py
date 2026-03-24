from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.infrastructure.adapters import build_analyzer, build_transcriber

app = FastAPI(
    title="Journal API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    """Liveness; shows which transcription / analysis adapters are active."""
    transcriber = build_transcriber(settings)
    analyzer = build_analyzer(settings)
    return {
        "status": "ok",
        "database": "disconnected",
        "transcription_adapter": transcriber.__class__.__name__,
        "analysis_adapter": analyzer.__class__.__name__,
    }
