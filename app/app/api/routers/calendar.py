from __future__ import annotations

from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import UserDep
from app.infrastructure.persistence.repositories import JournalEntryRepository

router = APIRouter(prefix="/calendar", tags=["calendar"])


class CalendarDay(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str
    entry_ids: list[str]
    count: int


class CalendarOut(BaseModel):
    days: list[CalendarDay] = Field(default_factory=list)


@router.get("", response_model=CalendarOut)
async def calendar(
    user: UserDep,
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = Query(default=None),
) -> CalendarOut:
    repo = JournalEntryRepository()
    entries = await repo.list_for_user(
        str(user.id),
        skip=0,
        limit=5000,
        from_date=from_,
        to_date=to,
    )
    by_day: dict[str, list[str]] = defaultdict(list)
    for e in entries:
        d = e.created_at.date().isoformat()
        by_day[d].append(str(e.id))
    days = [
        CalendarDay(date=k, entry_ids=v, count=len(v)) for k, v in sorted(by_day.items())
    ]
    return CalendarOut(days=days)
