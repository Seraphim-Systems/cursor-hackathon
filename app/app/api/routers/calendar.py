"""Calendar aggregation (P2.7)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.domain.calendar_agg import (
    build_calendar_days,
    resolve_calendar_tz,
    utc_bounds_for_local_date_range,
)
from app.infrastructure.persistence.documents import JournalEntryDocument, UserDocument

router = APIRouter(tags=["calendar"])

MAX_CALENDAR_RANGE_DAYS = 400


class CalendarDayOut(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD in the user's calendar (or UTC if no tz)")
    entry_ids: list[str]
    count: int


class CalendarResponse(BaseModel):
    days: list[CalendarDayOut]


@router.get("/calendar", response_model=CalendarResponse)
async def get_calendar(
    user: UserDocument = Depends(get_current_user),
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
) -> CalendarResponse:
    if from_ > to:
        raise HTTPException(status_code=400, detail="'from' must be on or before 'to'")
    if (to - from_).days > MAX_CALENDAR_RANGE_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Date range must not exceed {MAX_CALENDAR_RANGE_DAYS} days",
        )

    tz = resolve_calendar_tz(user.settings.timezone)
    start_utc, end_utc_exclusive = utc_bounds_for_local_date_range(from_, to, tz)

    entries = await JournalEntryDocument.find(
        JournalEntryDocument.user_id == str(user.id),
        JournalEntryDocument.created_at >= start_utc,
        JournalEntryDocument.created_at < end_utc_exclusive,
    ).to_list()

    pairs = [(str(doc.id), doc.created_at) for doc in entries]
    raw_days = build_calendar_days(pairs, from_, to, tz)
    return CalendarResponse(
        days=[CalendarDayOut(**d) for d in raw_days],
    )
