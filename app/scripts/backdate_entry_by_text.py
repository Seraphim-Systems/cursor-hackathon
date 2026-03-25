#!/usr/bin/env python3
"""Move matching journal entries back in time (e.g. for local testing / History layout).

Uses the same MongoDB settings as the API (`app.config.settings`).

Example (from the `app/` directory, with `.env` or env vars set):

  python scripts/backdate_entry_by_text.py --apply
  python scripts/backdate_entry_by_text.py --needle "hola brotato" --days 365 --apply
"""

from __future__ import annotations

import argparse
import sys
from datetime import timedelta
from pathlib import Path

# Repo layout: app/scripts/this_file.py → app root on sys.path
_APP_ROOT = Path(__file__).resolve().parents[1]
if str(_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_APP_ROOT))

from pymongo import MongoClient

from app.config import settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Back-date entries whose text matches a substring.")
    parser.add_argument(
        "--needle",
        default="hola brotato",
        help="Case-insensitive substring to match in transcript, cleaned_text, summary, or content",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=365,
        help="Subtract this many days from created_at and updated_at (default: 365)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write to MongoDB; without this flag, only prints what would change",
    )
    args = parser.parse_args()

    needle = args.needle.strip()
    if not needle:
        print("error: --needle must be non-empty", file=sys.stderr)
        sys.exit(1)

    client = MongoClient(settings.mongodb_uri)
    col = client[settings.mongodb_db_name]["entries"]
    rx = {"$regex": needle, "$options": "i"}
    query = {
        "$or": [
            {"transcript": rx},
            {"cleaned_text": rx},
            {"summary": rx},
            {"content": rx},
            {"title": rx},
        ]
    }

    doc = col.find_one(query)
    if doc is None:
        print(f"No entry found matching {needle!r} in transcript/cleaned_text/summary/content/title.")
        sys.exit(1)

    oid = doc["_id"]
    created = doc.get("created_at")
    updated = doc.get("updated_at") or created
    if created is None:
        print("Entry has no created_at; aborting.")
        sys.exit(1)

    delta = timedelta(days=args.days)
    new_created = created - delta
    new_updated = updated - delta if updated is not None else new_created

    print(f"Match _id={oid}")
    print(f"  created_at: {created} -> {new_created}")
    print(f"  updated_at: {updated} -> {new_updated}")

    if not args.apply:
        print("\nDry run only. Re-run with --apply to write.")
        return

    col.update_one({"_id": oid}, {"$set": {"created_at": new_created, "updated_at": new_updated}})
    print("\nUpdated.")


if __name__ == "__main__":
    main()
