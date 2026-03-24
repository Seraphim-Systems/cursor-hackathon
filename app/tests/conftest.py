"""Bootstrap env before `app.config.settings` is imported by any test module."""

from __future__ import annotations

import os

os.environ.setdefault("JWT_SECRET", "test-secret-pytest")
os.environ.setdefault("MONGODB_DB_NAME", "journal_pytest")
os.environ.setdefault("TRANSCRIPTION_PROVIDER", "stub")
os.environ.setdefault("AI_ANALYSIS_PROVIDER", "stub")
