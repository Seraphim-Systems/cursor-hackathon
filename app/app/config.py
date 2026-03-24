"""Application settings.

Docker Compose injects these via environment variables (see repo `.env.example`).
`env_file=.env` supports optional local runs without Docker; never commit `.env`.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "journal"
    jwt_secret: str = "dev-secret-not-for-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    audio_storage_path: str = "/data/audio"
    cors_origins: str = "http://localhost:5173,http://localhost:80,http://localhost"

    # Optional cloud key (also used when AI base URL points to OpenAI-compatible hosts)
    openai_api_key: str | None = None

    # Transcription: "stub" | "http_stt" (generic multipart POST to local/container STT)
    transcription_provider: str = "http_stt"
    stt_base_url: str = "http://stt:9000"
    stt_transcribe_path: str = "/asr"
    stt_form_field: str = "audio_file"
    stt_timeout_seconds: float = 600.0

    # AI analysis: "stub" | "openai" (OpenAI-compatible Chat Completions HTTP API)
    ai_analysis_provider: str = "stub"
    ai_openai_base_url: str = "https://api.openai.com/v1"
    ai_openai_model: str = "gpt-4o-mini"
    ai_http_timeout_seconds: float = 120.0


settings = Settings()
