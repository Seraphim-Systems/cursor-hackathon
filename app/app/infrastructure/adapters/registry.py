"""Factory functions for transcription and AI adapters (stub + optional HTTP)."""

import json

import json

import httpx
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)

from app.config import Settings
from app.domain.protocols import AnalysisResult, IAIAnalyzer, ITranscriber, TranscriptionResult


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
        return HttpSttTranscriber(
            base_url=settings.stt_base_url,
            path=settings.stt_transcribe_path,
            form_field=settings.stt_form_field,
            timeout_seconds=settings.stt_timeout_seconds,
        )
=======

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
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    return StubTranscriber()


def build_analyzer(settings: Settings) -> IAIAnalyzer:
<<<<<<< HEAD
    if settings.ai_analysis_provider == "openai" and settings.openai_api_key:
        return OpenAiCompatAnalyzer(
            api_key=settings.openai_api_key,
            base_url=settings.ai_openai_base_url,
            model=settings.ai_openai_model,
            timeout_seconds=settings.ai_http_timeout_seconds,
        )
=======
    _ = settings
>>>>>>> 804c3f6 (Implement user authentication and settings management with FastAPI)
    return StubAnalyzer()
