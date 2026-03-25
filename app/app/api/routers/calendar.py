"""Calendar aggregation (P2.7)."""

from datetime import date, datetime, timezone
import json
from typing import Literal
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from app.api.deps import UserDep
from app.config import settings
from app.domain.calendar_agg import (
    build_calendar_days,
    resolve_calendar_tz,
    utc_bounds_for_local_date_range,
)
from app.infrastructure.persistence.documents import JournalEntryDocument, PeriodSummaryDocument
from app.application.facades.calendar_agg import analyze_aggregate

router = APIRouter(tags=["calendar"])

MAX_CALENDAR_RANGE_DAYS = 400


class CalendarDayOut(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD in the user's calendar (or UTC if no tz)")
    entry_ids: list[str]
    count: int


class CalendarResponse(BaseModel):
    days: list[CalendarDayOut]


class PeriodSummaryResponse(BaseModel):
    summary: str
    sentiment_trend: str
    key_achievements: list[str]
    top_themes: list[str]
    significant_people: list[str]


@router.get("/calendar", response_model=CalendarResponse)
async def get_calendar(
    user: UserDep,
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


@router.get("/calendar/summarize", response_model=PeriodSummaryResponse)
async def summarize_period(
    user: UserDep,
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    period_type: str = Query("month", description="year, month, week, or day"),
) -> PeriodSummaryResponse:
    # 1. Check for cached summary
    cached = await PeriodSummaryDocument.find_one(
        PeriodSummaryDocument.user_id == str(user.id),
        PeriodSummaryDocument.period_type == period_type,
        PeriodSummaryDocument.start_date == from_.isoformat(),
        PeriodSummaryDocument.end_date == to.isoformat(),
    )

    tz = resolve_calendar_tz(user.settings.timezone)
    start_utc, end_utc_exclusive = utc_bounds_for_local_date_range(from_, to, tz)

    # Find entries for this period
    entries = await JournalEntryDocument.find(
        JournalEntryDocument.user_id == str(user.id),
        JournalEntryDocument.created_at >= start_utc,
        JournalEntryDocument.created_at < end_utc_exclusive,
    ).to_list()

    entry_count = len(entries)

    # 2. Use cache if valid (exists and entry count matches)
    if cached and cached.last_entry_count == entry_count:
        return PeriodSummaryResponse(
            summary=cached.summary,
            sentiment_trend=cached.sentiment_trend,
            key_achievements=cached.key_achievements,
            top_themes=cached.top_themes,
            significant_people=cached.significant_people,
        )

    # 3. Only summarize if we have at least 1 entry
    if entry_count == 0:
        return PeriodSummaryResponse(
            summary="No entries for this period.",
            sentiment_trend="N/A",
            key_achievements=[],
            top_themes=[],
            significant_people=[],
        )

    # 4. Generate new summary
    texts = []
    for e in entries:
        t = (e.summary or e.cleaned_text or e.transcript or "").strip()
        if t:
            texts.append(t)

    period_name = f"{period_type} ({from_} to {to})"
    raw_content = await analyze_aggregate(
        texts=texts,
        period_name=period_name,
        api_key=settings.openai_api_key or "",
        base_url=settings.ai_openai_base_url,
        model=settings.ai_openai_model,
    )
    
    if isinstance(raw_content, str):
        try:
            data = json.loads(raw_content)
        except:
            data = {"summary": raw_content, "sentiment_trend": "Unknown", "key_achievements": [], "top_themes": [], "significant_people": []}
    else:
        data = raw_content

    # 5. Store in cache
    res = PeriodSummaryResponse(**data)
    if cached:
        cached.summary = res.summary
        cached.sentiment_trend = res.sentiment_trend
        cached.key_achievements = res.key_achievements
        cached.top_themes = res.top_themes
        cached.significant_people = res.significant_people
        cached.last_entry_count = entry_count
        cached.updated_at = datetime.now(timezone.utc)
        await cached.save()
    else:
        new_cached = PeriodSummaryDocument(
            user_id=str(user.id),
            period_type=period_type, # type: ignore
            start_date=from_.isoformat(),
            end_date=to.isoformat(),
            summary=res.summary,
            sentiment_trend=res.sentiment_trend,
            key_achievements=res.key_achievements,
            top_themes=res.top_themes,
            significant_people=res.significant_people,
            last_entry_count=entry_count,
        )
        await new_cached.insert()

    return res
