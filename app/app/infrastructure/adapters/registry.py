"""Construct transcription and AI adapters from settings."""

import logging

from app.config import Settings
from app.domain.protocols import IAIAnalyzer, IAudioStorage, ITranscriber
from app.infrastructure.adapters.local_audio_storage import LocalAudioStorage
from app.infrastructure.adapters.http_stt_transcriber import HttpSttTranscriber
from app.infrastructure.adapters.openai_compat_analyzer import OpenAiCompatAnalyzer
from app.infrastructure.adapters.openai_compat_transcriber import OpenAiCompatTranscriber
from app.infrastructure.adapters.stub_analyzer import StubAnalyzer
from app.infrastructure.adapters.stub_transcriber import StubTranscriber

logger = logging.getLogger(__name__)


def build_audio_storage(settings: Settings) -> IAudioStorage:
    return LocalAudioStorage(settings.audio_storage_path)


def build_transcriber(settings: Settings) -> ITranscriber:
    provider = settings.transcription_provider.lower().strip()
    if provider in ("stub", "none", "off"):
        return StubTranscriber()
    if provider in ("http_stt", "http", "local_stt", "whisper_asr"):
        return HttpSttTranscriber(
            base_url=settings.stt_base_url,
            path=settings.stt_transcribe_path,
            form_field=settings.stt_form_field,
            timeout_seconds=settings.stt_timeout_seconds,
        )
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
    provider = settings.ai_analysis_provider.lower().strip()
    if provider in ("stub", "none", "off"):
        return StubAnalyzer()
    if provider in ("openai", "openai_compat", "openai-compatible"):
        key = (settings.openai_api_key or "").strip()
        if not key:
            logger.warning("AI_ANALYSIS_PROVIDER=openai but OPENAI_API_KEY empty; using stub")
            return StubAnalyzer()
        return OpenAiCompatAnalyzer(
            api_key=key,
            base_url=settings.ai_openai_base_url,
            model=settings.ai_openai_model,
            timeout_seconds=settings.ai_http_timeout_seconds,
        )
    logger.warning("Unknown AI_ANALYSIS_PROVIDER=%r; using stub", settings.ai_analysis_provider)
    return StubAnalyzer()
