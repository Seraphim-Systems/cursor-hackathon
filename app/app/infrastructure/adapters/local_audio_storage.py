"""Filesystem audio storage — keys are relative paths under the storage root."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from app.domain.protocols import IAudioStorage


def _safe_filename(hint: str) -> str:
    base = Path(hint or "audio").name
    base = re.sub(r"[^a-zA-Z0-9._-]+", "_", base)[:120]
    return base or "audio"


class LocalAudioStorage(IAudioStorage):
    def __init__(self, root: Path) -> None:
        self._root = root

    def _full(self, storage_key: str) -> Path:
        # prevent path traversal
        key = storage_key.replace("..", "").lstrip("/")
        return self._root / key

    async def save(self, *, user_id: str, filename_hint: str, data: bytes) -> str:
        uid = re.sub(r"[^\w-]+", "_", str(user_id))[:64]
        sub = self._root / uid
        sub.mkdir(parents=True, exist_ok=True)
        name = f"{uuid.uuid4().hex}_{_safe_filename(filename_hint)}"
        path = sub / name
        path.write_bytes(data)
        return f"{uid}/{name}"

    async def delete(self, storage_key: str) -> None:
        path = self._full(storage_key)
        if path.is_file():
            path.unlink()
