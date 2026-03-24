"""Factory functions for transcription and AI adapters (stub + optional HTTP)."""

import json

import httpx

from app.config import Settings
from app.domain.protocols import AnalysisResult, IAIAnalyzer, ITranscriber, TranscriptionResult, IAudioStorage

from app.infrastructure.adapters.local_audio_storage import LocalAudioStorage
from app.infrastructure.adapters.http_stt_transcriber import HttpSttTranscriber
from app.infrastructure.adapters.openai_compat_analyzer import OpenAiCompatAnalyzer
from app.infrastructure.adapters.openai_compat_transcriber import OpenAiCompatTranscriber
from app.infrastructure.adapters.stub_analyzer import StubAnalyzer
from app.infrastructure.adapters.stub_transcriber import StubTranscriber

class StubTranscriber(ITranscriber):
    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        return TranscriptionResult(text="[stub transcript]")


class HttpSttTranscriber(ITranscriber):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings


    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        base = self._settings.stt_base_url.rstrip("/")
        path = self._settings.stt_transcribe_path
        if not path.startswith("/"):
            path = "/" + path
        url = f"{base}{path}"
        field = self._settings.stt_form_field
        timeout = self._settings.stt_timeout_seconds
        files = {field: ("audio.bin", audio_bytes, mime_type or "application/octet-stream")}
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, files=files)
            response.raise_for_status()
        text = _extract_text_from_stt_response(response)
        return TranscriptionResult(text=text)


def _extract_text_from_stt_response(response: httpx.Response) -> str:
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        data = response.json()
        if isinstance(data, dict):
            for key in ("text", "transcription", "result"):
                val = data.get(key)
                if isinstance(val, str):
                    return val
        return json.dumps(data)
    return response.text


class StubAnalyzer(IAIAnalyzer):
    async def analyze(self, *, text: str) -> AnalysisResult:
        return AnalysisResult(
            summary=None,
            sentiment_score=None,
            key_points=[],
            projects=[],
            goals=[],
            blockers=[],
            people=[],
            priorities=[],
            themes=[],
        )


def build_audio_storage(settings: Settings) -> IAudioStorage:
    return LocalAudioStorage(settings.audio_storage_path)


def build_transcriber(settings: Settings) -> ITranscriber:
    if settings.transcription_provider == "http_stt":
        return HttpSttTranscriber(
            base_url=settings.stt_base_url,
            path=settings.stt_transcribe_path,
            form_field=settings.stt_form_field,
            timeout_seconds=settings.stt_timeout_seconds,
        )

class StubTranscriber(ITranscriber):
    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        return TranscriptionResult(text="[stub transcript]")


class HttpSttTranscriber(ITranscriber):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        base = self._settings.stt_base_url.rstrip("/")
        path = self._settings.stt_transcribe_path
        if not path.startswith("/"):
            path = "/" + path
        url = f"{base}{path}"
        field = self._settings.stt_form_field
        timeout = self._settings.stt_timeout_seconds
        files = {field: ("audio.bin", audio_bytes, mime_type or "application/octet-stream")}
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, files=files)
            response.raise_for_status()
        text = _extract_text_from_stt_response(response)
        return TranscriptionResult(text=text)


def _extract_text_from_stt_response(response: httpx.Response) -> str:
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        data = response.json()
        if isinstance(data, dict):
            for key in ("text", "transcription", "result"):
                val = data.get(key)
                if isinstance(val, str):
                    return val
        return json.dumps(data)
    return response.text


class StubAnalyzer(IAIAnalyzer):
    async def analyze(self, *, text: str) -> AnalysisResult:
        return AnalysisResult(
            summary=None,
            sentiment_score=None,
            key_points=[],
            projects=[],
            goals=[],
            blockers=[],
            people=[],
            priorities=[],
            themes=[],
        )


def build_transcriber(settings: Settings) -> ITranscriber:
    if settings.transcription_provider == "http_stt":
        return HttpSttTranscriber(settings)
    if provider in ("openai", "openai_compat", "openai-compatible"):
        key = (settings.openai_api_key or "").strip()
        if not key:
            logger.warning("TRANSCRIPTION_PROVIDER=openai but OPENAI_API_KEY empty; using stub")
            return StubTranscriber()
        return OpenAiCompatTranscriber(
            api_key=key,
            base_url=settings.ai_openai_base_url,
            model=settings.transcription_openai_model,
            timeout_seconds=settings.stt_timeout_seconds,
        )
    logger.warning("Unknown TRANSCRIPTION_PROVIDER=%r; using stub", settings.transcription_provider)
    return StubTranscriber()


def build_analyzer(settings: Settings) -> IAIAnalyzer:
    if settings.ai_analysis_provider == "openai" and settings.openai_api_key:
        return OpenAiCompatAnalyzer(
            api_key=settings.openai_api_key,
            base_url=settings.ai_openai_base_url,
            model=settings.ai_openai_model,
            timeout_seconds=settings.ai_http_timeout_seconds,
        )
    return StubAnalyzer()
