"""User-scoped projects API (P2.6)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import UserDep
from app.api.schemas.project_api import ProjectListResponse, ProjectOut, ProjectPatchBody
from app.infrastructure.persistence.project_repository import ProjectRepository

router = APIRouter(prefix="/projects", tags=["projects"])


def _repo() -> ProjectRepository:
    return ProjectRepository()


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    user: UserDep,
    repo: Annotated[ProjectRepository, Depends(_repo)],
) -> ProjectListResponse:
    docs = await repo.list_for_user(str(user.id))
    return ProjectListResponse(items=[ProjectOut.from_document(d) for d in docs])


@router.patch("/{project_id}", response_model=ProjectOut)
async def patch_project(
    project_id: str,
    body: ProjectPatchBody,
    user: UserDep,
    repo: Annotated[ProjectRepository, Depends(_repo)],
) -> ProjectOut:
    doc = await repo.get_for_user(str(user.id), project_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if body.title is not None:
        doc.title = body.title
    if body.description is not None:
        doc.description = body.description
    if body.status is not None:
        doc.status = body.status
    await doc.save()
    return ProjectOut.from_document(doc)
