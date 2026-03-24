"""Generic HTTP STT client: multipart upload to any compatible ASR webservice.

Works with whisper-asr-webservice (`POST /asr`, form field `audio_file`) and similar servers.
"""

import json
import logging
from urllib.parse import urljoin

import httpx

from app.domain.protocols import ITranscriber, TranscriptionResult

logger = logging.getLogger(__name__)


def audio_filename_for_mime(mime_type: str | None) -> str:
    if not mime_type:
        return "audio.bin"
    m = mime_type.lower().split("/")[-1].split(";")[0].strip()
    if m in ("wav", "wave", "x-wav"):
        return "audio.wav"
    if m in ("mpeg", "mp3", "mp4", "webm", "ogg", "flac", "m4a"):
        return f"audio.{m.replace('x-', '')}"
    return "audio.bin"


class HttpSttTranscriber:
    """POST audio as multipart; reads plain-text or JSON `{ "text": "..." }` bodies."""

    def __init__(
        self,
        *,
        base_url: str,
        path: str = "/asr",
        form_field: str = "audio_file",
        timeout_seconds: float = 600.0,
    ) -> None:
        self._base = base_url.rstrip("/") + "/"
        self._path = path.lstrip("/")
        self._form_field = form_field
        self._timeout = timeout_seconds

    async def transcribe(self, *, audio_bytes: bytes, mime_type: str | None) -> TranscriptionResult:
        url = urljoin(self._base, self._path)
        filename = audio_filename_for_mime(mime_type)
        # whisper-asr-webservice: default `output=txt` returns plain text body.
        params = {"task": "transcribe", "output": "txt"}
        files = {self._form_field: (filename, audio_bytes, mime_type or "application/octet-stream")}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(url, params=params, files=files)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.warning("STT request failed: %s", e)
                raise

        text = _extract_text(response)
        return TranscriptionResult(text=text)


def _extract_text(response: httpx.Response) -> str:
    content_type = (response.headers.get("content-type") or "").lower()
    raw = response.text.strip()

    if "application/json" in content_type or raw.startswith("{"):
        try:
            data = response.json()
        except json.JSONDecodeError:
            return raw
        if isinstance(data, dict):
            t = data.get("text")
            if isinstance(t, str):
                return t.strip()
        return raw

    return raw
