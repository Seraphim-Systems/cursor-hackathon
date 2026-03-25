"""Outbound port protocols — implemented by infrastructure adapters."""

from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel, Field


class TranscriptionResult(BaseModel):
    text: str


class AnalysisResult(BaseModel):
    summary: str | None
    sentiment_score: float | None = None
    key_points: list[str]
    projects: list[dict]
    goals: list[str]
    blockers: list[str]
    people: list[str]
    priorities: list[str]
    themes: list[str]
    impactful_factors: list[dict] = Field(default_factory=list)


class IAudioStorage(Protocol):
    async def save(self, *, user_id: str, filename_hint: str, data: bytes) -> str: ...

    async def delete(self, storage_key: str) -> None: ...

    async def read_bytes(self, storage_key: str) -> bytes | None: ...


class ITranscriber(Protocol):
    async def transcribe(
        self, *, audio_bytes: bytes, mime_type: str | None
    ) -> TranscriptionResult: ...


class IAIAnalyzer(Protocol):
    async def analyze(self, *, text: str) -> AnalysisResult: ...

    async def analyze_trends(self, *, entries_data: list[dict]) -> dict: ...
