"""Beanie documents and repository classes."""

from app.infrastructure.persistence.database import init_beanie, ping_mongo
from app.infrastructure.persistence.documents import UserDocument, JournalEntryDocument, PeriodSummaryDocument
from app.infrastructure.persistence.repositories import UserRepository, normalize_email
from app.infrastructure.persistence.project_document import ProjectDocument
from app.infrastructure.persistence.project_repository import ProjectRepository
from app.infrastructure.persistence.journal_entry_repository import JournalEntryRepository

__all__ = [
    "UserDocument",
    "JournalEntryDocument",
    "PeriodSummaryDocument",
    "ProjectDocument",
    "UserRepository",
    "ProjectRepository",
    "JournalEntryRepository",
    "init_beanie",
    "normalize_email",
    "ping_mongo",
]
