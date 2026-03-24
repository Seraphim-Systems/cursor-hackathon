"""Factory functions for transcription and AI adapters (stub + optional HTTP / OpenAI-compatible)."""

from app.config import Settings
from app.domain.protocols import IAIAnalyzer, ITranscriber
from app.infrastructure.adapters.http_stt_transcriber import HttpSttTranscriber
from app.infrastructure.adapters.openai_compat_analyzer import OpenAiCompatAnalyzer
from app.infrastructure.adapters.stub_analyzer import StubAnalyzer
from app.infrastructure.adapters.stub_transcriber import StubTranscriber


def build_transcriber(settings: Settings) -> ITranscriber:
    if settings.transcription_provider == "http_stt":
        return HttpSttTranscriber(
            base_url=settings.stt_base_url,
            path=settings.stt_transcribe_path,
            form_field=settings.stt_form_field,
            timeout_seconds=settings.stt_timeout_seconds,
        )
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
