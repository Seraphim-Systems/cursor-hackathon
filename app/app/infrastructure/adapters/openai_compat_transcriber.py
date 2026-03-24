"""Speech-to-text via OpenAI-compatible `POST /audio/transcriptions` (Whisper).

Works with `https://api.openai.com/v1` and hosts that expose the same path and JSON
`{"text": "..."}` response (some gateways and Azure-style deployments differ; set base URL accordingly).
"""

import json
import logging

import httpx

from app.domain.protocols import TranscriptionResult
from app.infrastructure.adapters.http_stt_transcriber import audio_filename_for_mime

logger = logging.getLogger(__name__)


class OpenAiCompatTranscriber:
    """Multipart upload to `{base_url}/audio/transcriptions`."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "whisper-1",
        timeout_seconds: float = 600.0,
    ) -> None:
        self._api_key = api_key
        self._base = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout_seconds

    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        url = f"{self._base}/audio/transcriptions"
        filename = audio_filename_for_mime(mime_type)
        files = {
            "file": (filename, audio_bytes, mime_type or "application/octet-stream"),
        }
        data = {"model": self._model}
        headers = {"Authorization": f"Bearer {self._api_key}"}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(url, headers=headers, files=files, data=data)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.warning("OpenAI transcription request failed: %s", e)
                raise

        return TranscriptionResult(text=_parse_transcription_body(response))


def _parse_transcription_body(response: httpx.Response) -> str:
    content_type = (response.headers.get("content-type") or "").lower()
    raw = response.text.strip()

    if "application/json" in content_type or raw.startswith("{"):
        try:
            payload = response.json()
        except json.JSONDecodeError:
            return raw
        if isinstance(payload, dict):
            t = payload.get("text")
            if isinstance(t, str):
                return t.strip()
        return raw

    return raw
