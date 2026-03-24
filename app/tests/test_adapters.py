import httpx
import pytest
import respx

from app.domain.protocols import TranscriptionResult
from app.infrastructure.adapters.http_stt_transcriber import HttpSttTranscriber as StandaloneHttpStt
from app.infrastructure.adapters.registry import (
    HttpSttTranscriber,
    StubAnalyzer,
    StubTranscriber,
    build_analyzer,
    build_transcriber,
)
from app.config import Settings


def test_build_transcriber_stub() -> None:
    s = Settings(
        transcription_provider="stub",
        jwt_secret="x",
    )
    t = build_transcriber(s)
    assert isinstance(t, StubTranscriber)


def test_build_transcriber_http_stt() -> None:
    s = Settings(
        transcription_provider="http_stt",
        stt_base_url="http://stt:9000",
        jwt_secret="x",
    )
    t = build_transcriber(s)
    assert isinstance(t, HttpSttTranscriber)


def test_build_analyzer_stub() -> None:
    s = Settings(
        ai_analysis_provider="stub",
        jwt_secret="x",
    )
    a = build_analyzer(s)
    assert isinstance(a, StubAnalyzer)


def test_build_analyzer_openai_without_key_falls_back() -> None:
    s = Settings(
        ai_analysis_provider="openai",
        openai_api_key=None,
        jwt_secret="x",
    )
    a = build_analyzer(s)
    assert isinstance(a, StubAnalyzer)


@pytest.mark.asyncio
@respx.mock
async def test_http_stt_plain_text_body() -> None:
    respx.post("http://stt-local:9000/asr").mock(
        return_value=httpx.Response(200, text="  transcribed line  \n"),
    )
    t = StandaloneHttpStt(base_url="http://stt-local:9000", path="/asr")
    r = await t.transcribe(audio_bytes=b"\x00\x01", mime_type="audio/wav")
    assert isinstance(r, TranscriptionResult)
    assert r.text == "transcribed line"


@pytest.mark.asyncio
@respx.mock
async def test_http_stt_json_body() -> None:
    respx.post("http://stt-local:9000/asr").mock(
        return_value=httpx.Response(
            200,
            json={"text": "from json"},
            headers={"content-type": "application/json"},
        ),
    )
    t = StandaloneHttpStt(base_url="http://stt-local:9000")
    r = await t.transcribe(audio_bytes=b"x", mime_type=None)
    assert r.text == "from json"
