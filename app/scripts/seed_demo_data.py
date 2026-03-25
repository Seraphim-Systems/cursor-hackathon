#!/usr/bin/env python3
"""Seed demo data for local UI.

Creates (or reuses) a user, inserts a handful of entries across multiple dates,
then warms calendar summaries (day/month/year) so the tree view looks real.

Run from repo root (recommended, uses Docker):

  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
  docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm app \
    python scripts/seed_demo_data.py --email demo@local --password demo123
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import random
import sys
import time

import httpx

# Repo layout: app/scripts/this_file.py → app root on sys.path
_APP_ROOT = Path(__file__).resolve().parents[1]
if str(_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_APP_ROOT))


@dataclass(frozen=True)
class SeedEntry:
    created_at: datetime
    transcript: str
    summary: str


def _dt(y: int, m: int, d: int, hh: int = 21, mm: int = 30) -> datetime:
    return datetime(y, m, d, hh, mm, tzinfo=timezone.utc)


def build_seed_entries() -> list[SeedEntry]:
    # Keep it neutral: no advice, no diagnosis—just “what happened” style labels.
    entries: list[SeedEntry] = [
        SeedEntry(
            created_at=_dt(2025, 9, 3),
            summary="First week abroad: settling in, figuring out routines.",
            transcript=(
                "First week here. I'm getting used to the city and my classes. "
                "I keep thinking about how different everything feels—new schedule, new people, new language around me. "
                "I bought groceries, set up my desk, and I'm trying to keep my days simple."
            ),
        ),
        SeedEntry(
            created_at=_dt(2025, 9, 18),
            summary="Project kickoff: splitting tasks, unclear requirements.",
            transcript=(
                "Group project kickoff today. We split tasks but the requirements are still fuzzy. "
                "I wrote down what I think the deliverable is and what questions we need to ask. "
                "I want to avoid last-minute chaos, so I'm going to message the team tomorrow with a tighter plan."
            ),
        ),
        SeedEntry(
            created_at=_dt(2025, 10, 7),
            summary="Busy week: two deadlines, trying to protect evenings.",
            transcript=(
                "Two deadlines this week. I can feel my focus slipping when I try to do everything at once. "
                "Plan: finish the assignment draft early, then small edits later. "
                "Also I want to keep evenings lighter—walk, dinner, no screens right before bed."
            ),
        ),
        SeedEntry(
            created_at=_dt(2025, 11, 2),
            summary="Roommate coordination: chores, shared spaces, small friction.",
            transcript=(
                "We had that small roommate friction again about the kitchen. "
                "Nothing dramatic, just the same confusion about who's doing what. "
                "I think we need a simple schedule so we don't have to renegotiate every week."
            ),
        ),
        SeedEntry(
            created_at=_dt(2025, 12, 14),
            summary="End of term: wrapping projects, planning travel.",
            transcript=(
                "End of term feels like a pile of loose ends: final project, emails, travel planning. "
                "I listed what must happen this week versus what can wait. "
                "I just want a clean finish so I can actually rest."
            ),
        ),
        SeedEntry(
            created_at=_dt(2026, 1, 9),
            summary="New year reset: routines, sleep, and consistent study blocks.",
            transcript=(
                "New year reset. I'm not trying to reinvent everything—just consistent routines. "
                "Sleep on weekdays, 90-minute study blocks, and keeping weekends flexible. "
                "I want less mental clutter."
            ),
        ),
        SeedEntry(
            created_at=_dt(2026, 2, 5),
            summary="Social plans + workload: picking priorities for the month.",
            transcript=(
                "This month feels packed. Friends want to plan things and school is ramping up too. "
                "If I say yes to everything, I lose the week. "
                "I'm picking two social plans and protecting the rest for work and downtime."
            ),
        ),
        SeedEntry(
            created_at=_dt(2026, 3, 3),
            summary="Exam prep: review plan, practice problems, and pacing.",
            transcript=(
                "Exam prep day. I made a review plan: topics, practice problems, and a time budget. "
                "I want to pace it instead of cramming. "
                "The main thing is to start early and keep it steady."
            ),
        ),
        SeedEntry(
            created_at=_dt(2026, 3, 12),
            summary="A good day: work done early, long walk, clearer head.",
            transcript=(
                "Good day. I finished work earlier than expected and went for a long walk. "
                "It felt like I had space to think. "
                "I want more days like this—simple, calm, and not rushed."
            ),
        ),
    ]

    # Add a few extra “small” entries around March to make day view interesting.
    rng = random.Random(7)
    for i in range(3):
        day = 20 + i
        entries.append(
            SeedEntry(
                created_at=_dt(2026, 3, day, 20 + i, 10),
                summary=f"Quick capture: small note #{i + 1}.",
                transcript=(
                    "Quick capture. I'm noting this so I don't lose it later: "
                    f"small detail #{i + 1}, something to revisit when I have more time."
                ),
            )
        )
    rng.shuffle(entries)
    return sorted(entries, key=lambda e: e.created_at)


def _date_ymd(d: date) -> str:
    return d.isoformat()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed local demo data via the API.")
    parser.add_argument("--base-url", default="http://app:8000", help="API base URL (default: http://app:8000)")
    parser.add_argument("--email", default="demo@example.com", help="Demo account email")
    parser.add_argument("--password", default="demo12345", help="Demo account password (min 8 chars)")
    parser.add_argument("--skip-summaries", action="store_true", help="Only create entries (don’t warm calendar summaries)")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    email = args.email.strip()
    password = args.password

    if not email:
        raise SystemExit("--email must be non-empty")

    entries = build_seed_entries()
    print(f"Seeding {len(entries)} entries to {base} as {email!r} ...")

    with httpx.Client(timeout=60.0) as client:
        # 0) Wait for API to accept connections (dev stack can take a moment).
        deadline = time.time() + 45
        while True:
            try:
                rr = client.get(f"{base}/api/health", timeout=5.0)
                if rr.status_code == 200:
                    break
            except Exception:
                pass
            if time.time() > deadline:
                raise SystemExit(f"API not reachable at {base} (timed out waiting for /api/health).")
            time.sleep(0.5)

        # 1) Register (ignore if already exists)
        r = client.post(f"{base}/api/auth/register", json={"email": email, "password": password})
        if r.status_code not in (200, 201, 409):
            r.raise_for_status()

        # 2) Login
        r = client.post(f"{base}/api/auth/login", json={"email": email, "password": password})
        r.raise_for_status()
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3) Create entries
        created_ids: list[str] = []
        for e in entries:
            payload = {
                "source": "text",
                "created_at": e.created_at.isoformat(),
                "transcript": e.transcript,
                "summary": e.summary,
                "run_analysis": False,
            }
            rr = client.post(f"{base}/api/entries", json=payload, headers=headers)
            rr.raise_for_status()
            created_ids.append(rr.json()["id"])

        print(f"Created {len(created_ids)} entries.")

        if args.skip_summaries:
            print("Skipping summary warm-up (--skip-summaries).")
            return

        # 4) Warm summaries (day + month + year) based on entry dates
        days = sorted({e.created_at.date() for e in entries})
        months = sorted({date(d.year, d.month, 1) for d in days})
        years = sorted({d.year for d in days})

        def warm(from_ymd: str, to_ymd: str, period_type: str) -> None:
            q = {"from": from_ymd, "to": to_ymd, "period_type": period_type}
            rr = client.get(f"{base}/api/calendar/summarize", params=q, headers=headers, timeout=120.0)
            rr.raise_for_status()

        print("Warming calendar summaries (this can take a bit with OpenAI enabled)...")

        # Warm a few days (not all) to keep it quick.
        for d in days[-5:]:
            warm(_date_ymd(d), _date_ymd(d), "day")

        for m in months:
            # month range
            next_month = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
            last_day = next_month - timedelta(days=1)
            warm(_date_ymd(m), _date_ymd(last_day), "month")

        for y in years:
            warm(f"{y}-01-01", f"{y}-12-31", "year")

        print("Done. Open the UI and check Calendar + History.")


if __name__ == "__main__":
    main()

