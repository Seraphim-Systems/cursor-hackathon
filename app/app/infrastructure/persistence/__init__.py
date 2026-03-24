"""Beanie documents and repository classes."""

from app.infrastructure.persistence.database import init_beanie, ping_mongo
from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository, normalize_email
from app.infrastructure.persistence.project_document import ProjectDocument
from app.infrastructure.persistence.project_repository import ProjectRepository

__all__ = [
    "UserDocument",
    "UserRepository",
    "init_beanie",
    "normalize_email",
    "ping_mongo",
]

__all__ = ["ProjectDocument", "ProjectRepository"]
