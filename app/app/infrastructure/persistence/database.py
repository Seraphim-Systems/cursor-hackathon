"""Central list of Beanie document models for ``init_beanie``."""

from __future__ import annotations

from app.infrastructure.persistence.documents import JournalEntryDocument, UserDocument
from app.infrastructure.persistence.project_document import ProjectDocument

DOCUMENT_MODELS = [UserDocument, JournalEntryDocument, ProjectDocument]
