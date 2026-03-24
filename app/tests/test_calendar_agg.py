from datetime import date, datetime, timezone

from zoneinfo import ZoneInfo

from app.domain.calendar_agg import (
    build_calendar_days,
    resolve_calendar_tz,
    utc_bounds_for_local_date_range,
)


def test_resolve_calendar_tz_defaults() -> None:
    assert resolve_calendar_tz(None).key == "UTC"
    assert resolve_calendar_tz("").key == "UTC"
    assert resolve_calendar_tz("  ").key == "UTC"


def test_resolve_calendar_tz_invalid_falls_back_utc() -> None:
    assert resolve_calendar_tz("Not/A/Zone").key == "UTC"


def test_utc_bounds_for_local_date_range_single_day_utc() -> None:
    tz = ZoneInfo("UTC")
    start, end_excl = utc_bounds_for_local_date_range(date(2025, 3, 24), date(2025, 3, 24), tz)
    assert start == datetime(2025, 3, 24, 0, 0, tzinfo=timezone.utc)
    assert end_excl == datetime(2025, 3, 25, 0, 0, tzinfo=timezone.utc)


def test_build_calendar_days_buckets_by_local_date() -> None:
    tz = ZoneInfo("America/New_York")
    # 2025-03-24 02:00 UTC → still 2025-03-23 evening in New York
    pairs = [
        ("a", datetime(2025, 3, 24, 2, 0, tzinfo=timezone.utc)),
        ("b", datetime(2025, 3, 24, 12, 0, tzinfo=timezone.utc)),
    ]
    days = build_calendar_days(pairs, date(2025, 3, 23), date(2025, 3, 24), tz)
    assert len(days) == 2
    assert days[0]["date"] == "2025-03-23"
    assert days[0]["entry_ids"] == ["a"]
    assert days[0]["count"] == 1
    assert days[1]["date"] == "2025-03-24"
    assert set(days[1]["entry_ids"]) == {"b"}


def test_build_calendar_days_fills_empty_days() -> None:
    tz = ZoneInfo("UTC")
    days = build_calendar_days([], date(2025, 1, 1), date(2025, 1, 3), tz)
    assert [d["date"] for d in days] == ["2025-01-01", "2025-01-02", "2025-01-03"]
    assert all(d["count"] == 0 and d["entry_ids"] == [] for d in days)


def test_build_calendar_days_naive_created_at_treated_as_utc() -> None:
    tz = ZoneInfo("UTC")
    pairs = [("x", datetime(2025, 6, 1, 15, 0))]
    days = build_calendar_days(pairs, date(2025, 6, 1), date(2025, 6, 1), tz)
    assert days[0]["entry_ids"] == ["x"]
