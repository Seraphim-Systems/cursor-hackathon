"""Calendar day bucketing — pure logic (no FastAPI / persistence imports)."""

from collections import defaultdict
from datetime import date, datetime, timedelta, time, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def resolve_calendar_tz(tz_name: str | None) -> ZoneInfo:
    """IANA id from user settings, or UTC when missing / invalid."""
    if not tz_name or not tz_name.strip():
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(tz_name.strip())
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def utc_bounds_for_local_date_range(from_d: date, to_d: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Inclusive local [from_d, to_d] → UTC half-open interval [start, end) for queries."""
    start_local = datetime.combine(from_d, time.min, tzinfo=tz)
    end_local_exclusive = datetime.combine(to_d, time.min, tzinfo=tz) + timedelta(days=1)
    return (
        start_local.astimezone(timezone.utc),
        end_local_exclusive.astimezone(timezone.utc),
    )


def build_calendar_days(
    entry_id_and_created: list[tuple[str, datetime]],
    from_d: date,
    to_d: date,
    tz: ZoneInfo,
) -> list[dict[str, Any]]:
    """
    One object per calendar day in [from_d, to_d] (chronological), with entry_ids and count.
    """
    buckets: dict[date, list[str]] = defaultdict(list)
    for entry_id, created_at in entry_id_and_created:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        local_day = created_at.astimezone(tz).date()
        if from_d <= local_day <= to_d:
            buckets[local_day].append(entry_id)

    out: list[dict[str, Any]] = []
    d = from_d
    while d <= to_d:
        ids = buckets.get(d, [])
        out.append({"date": d.isoformat(), "entry_ids": ids, "count": len(ids)})
        d += timedelta(days=1)
    return out
