from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from fastapi import APIRouter, HTTPException, status

from app.api.deps import UserDep
from app.infrastructure.persistence.repositories import ProjectRepository

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    title: str
    normalized_name: str
    description: str | None = None
    status: str | None = None
    related_entry_ids: list[str]
    first_seen_at: str
    last_mentioned_at: str


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = Field(None, max_length=80)


class ProjectListOut(BaseModel):
    items: list[ProjectOut]


def _proj_out(p) -> ProjectOut:
    return ProjectOut(
        id=str(p.id),
        user_id=p.user_id,
        title=p.title,
        normalized_name=p.normalized_name,
        description=p.description,
        status=p.status,
        related_entry_ids=list(p.related_entry_ids),
        first_seen_at=p.first_seen_at.isoformat(),
        last_mentioned_at=p.last_mentioned_at.isoformat(),
    )


@router.get("", response_model=ProjectListOut)
async def list_projects(user: UserDep) -> ProjectListOut:
    repo = ProjectRepository()
    items = await repo.list_for_user(str(user.id))
    return ProjectListOut(items=[_proj_out(p) for p in items])


@router.patch("/{project_id}", response_model=ProjectOut)
async def patch_project(
    project_id: str,
    body: ProjectPatch,
    user: UserDep,
) -> ProjectOut:
    repo = ProjectRepository()
    doc = await repo.get_for_user(project_id, str(user.id))
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if body.title is not None:
        doc.title = body.title
    if body.description is not None:
        doc.description = body.description
    if body.status is not None:
        doc.status = body.status
    await doc.save()
    return _proj_out(doc)
