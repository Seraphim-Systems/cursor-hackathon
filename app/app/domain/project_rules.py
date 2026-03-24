"""Pure project naming rules — no I/O (domain layer)."""

import re
import unicodedata


def normalize_project_name(name: str) -> str:
    """Lowercase, Unicode NFC, collapse whitespace for deduplication keys."""
    s = unicodedata.normalize("NFC", (name or "").strip().lower())
    return re.sub(r"\s+", " ", s).strip()
