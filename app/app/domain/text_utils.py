"""Pure text helpers for composing journal content."""

import re


def collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def compose_cleaned_text(*, user_text: str | None, transcript: str | None) -> str:
    parts: list[str] = []
    if user_text and user_text.strip():
        parts.append(collapse_whitespace(user_text))
    if transcript and transcript.strip():
        parts.append(collapse_whitespace(transcript))
    return "\n\n".join(parts) if parts else ""
