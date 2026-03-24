import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.api.deps import AdminDep
from app.config import settings
from app.infrastructure.persistence.documents import JournalEntryDocument, UserDocument

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
async def admin_dashboard(admin: AdminDep) -> dict[str, Any]:
    """Admin-only dashboard data: user overview and file usage."""
    # User overview
    total_users = await UserDocument.count()
    total_entries = await JournalEntryDocument.count()

    # File usage (recursive walk of storage path)
    storage_root = Path(settings.audio_storage_path)
    file_count = 0
    total_bytes = 0
    if storage_root.exists():
        for root, _, files in os.walk(storage_root):
            for f in files:
                file_count += 1
                total_bytes += os.path.getsize(os.path.join(root, f))

    # Get recent users
    recent_users = await UserDocument.find_all().sort(-UserDocument.id).limit(10).to_list()
    user_list = [
        {"id": str(u.id), "email": u.email, "is_admin": u.is_admin}
        for u in recent_users
    ]

    return {
        "users": {
            "total": total_users,
            "recent": user_list,
        },
        "entries": {
            "total": total_entries,
        },
        "storage": {
            "path": str(storage_root),
            "file_count": file_count,
            "total_bytes": total_bytes,
            "total_mb": round(total_bytes / (1024 * 1024), 2),
        },
    }
