"""Normalize project names for deduplication."""

import re


def normalized_project_name(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s).strip("-")
    return s[:120] or "untitled"
