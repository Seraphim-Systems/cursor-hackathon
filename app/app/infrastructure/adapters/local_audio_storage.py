"""Filesystem-backed `IAudioStorage` for Docker volume mounts (e.g. `/data/audio`)."""

from __future__ import annotations

import asyncio
import re
import uuid
from pathlib import Path

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _segment(s: str, max_len: int = 120) -> str:
    cleaned = _SAFE_NAME.sub("_", s.strip()) or "user"
    return cleaned[:max_len]


def _safe_basename(hint: str) -> str:
    name = Path(hint or "audio").name
    name = _SAFE_NAME.sub("_", name) or "audio"
    return name[:200]


class LocalAudioStorage:
    """Stores blobs under `<root>/<user_segment>/<uuid>_<filename>`."""

    def __init__(self, root: str | Path) -> None:
        self._root = Path(root).resolve()

    async def save(self, *, user_id: str, filename_hint: str, data: bytes) -> str:
        if not data:
            raise ValueError("empty audio payload")
        user_seg = _segment(user_id)
        base = _safe_basename(filename_hint)
        key = f"{user_seg}/{uuid.uuid4().hex}_{base}"
        full = self._root / key
        await asyncio.to_thread(full.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(full.write_bytes, data)
        return key

    async def delete(self, storage_key: str) -> None:
        if not storage_key or ".." in storage_key:
            return
        full = (self._root / storage_key).resolve()
        try:
            full.relative_to(self._root)
        except ValueError:
            return

        def _unlink() -> None:
            if full.is_file():
                full.unlink()

        await asyncio.to_thread(_unlink)
