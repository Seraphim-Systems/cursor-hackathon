"""Motor client + Beanie initialization for the FastAPI app."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.infrastructure.persistence.database import DOCUMENT_MODELS
from app.infrastructure.persistence.documents import (
    UserDocument,
    JournalEntryDocument,
    InsightsEmbedded,
    ProjectItem,
)
from app.infrastructure.security.password import hash_password

logger = logging.getLogger(__name__)


async def init_beanie_for_app() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    await init_beanie(
        database=db,
        document_models=DOCUMENT_MODELS,
    )
    await seed_admin()
    await seed_march_2026_entries()
    return client


async def mongo_ping_ok(client: AsyncIOMotorClient) -> bool:
    try:
        await client.admin.command("ping")
    except Exception:
        return False
    return True


async def seed_admin() -> None:
    """Seed admin user from settings if provided and none exists."""
    logger.info("Checking admin seeding: email=%s", settings.admin_email)
    if not settings.admin_email or not settings.admin_password:
        logger.info("Admin seeding skipped: email or password not provided")
        return

    admin = await UserDocument.find_one(UserDocument.is_admin == True)
    if admin:
        logger.info("Admin seeding skipped: admin already exists (%s)", admin.email)
        return

    # Check if a user with the same email exists
    email = settings.admin_email.strip().lower()
    existing = await UserDocument.find_one(UserDocument.email == email)
    if existing:
        logger.info("Upgrading user %s to admin", email)
        existing.is_admin = True
        await existing.save()
        return

    logger.info("Seeding new admin user: %s", email)
    new_admin = UserDocument(
        email=email,
        hashed_password=hash_password(settings.admin_password),
        is_admin=True,
    )
    await new_admin.insert()
    logger.info("Admin user seeded successfully")


async def seed_march_2026_entries() -> None:
    """Ensure admin user has some entries for March 2026 on startup."""
    if not settings.admin_email:
        return

    admin = await UserDocument.find_one(UserDocument.email == settings.admin_email.lower())
    if not admin:
        return

    user_id = str(admin.id)
    # Check if we already have entries for March 2026 to avoid over-seeding
    start_march = datetime(2026, 3, 1, tzinfo=timezone.utc)
    end_march = datetime(2026, 4, 1, tzinfo=timezone.utc)
    count = await JournalEntryDocument.find(
        JournalEntryDocument.user_id == user_id,
        JournalEntryDocument.created_at >= start_march,
        JournalEntryDocument.created_at < end_march,
    ).count()

    if count >= 3:
        logger.info("Skipping March 2026 entries seeding: already have %d entries", count)
        return

    logger.info("Seeding entries for March 2026 for admin...")
    seed_data = [
        {
            "day": 5,
            "text": "Visited the robotics lab today. Saw the new arm prototype in action. Sarah explained the kinematic model. We discussed how to integrate the force sensors.",
            "summary": "Lab visit and kinematic model discussion with Sarah regarding robotics prototype.",
            "themes": ["Work", "Robotics"],
            "people": ["Sarah"],
            "key_points": ["Robotics lab visit", "Kinematic model", "Force sensors"],
        },
        {
            "day": 12,
            "text": "Dinner with the team to celebrate the first milestone. Mike and Elena were there. We had some great pizza and talked about our favorite sci-fi movies.",
            "summary": "Team dinner celebration with Mike and Elena; social team building.",
            "themes": ["Social", "Celebration"],
            "people": ["Mike", "Elena"],
            "key_points": ["Milestone celebration", "Team building"],
        },
        {
            "day": 18,
            "text": "Spent the whole day debugging the sensor fusion algorithm. It's trickier than I thought to align the IMU and camera data perfectly.",
            "summary": "Intensive debugging of sensor fusion algorithm for IMU and camera data alignment.",
            "themes": ["Work", "Technical"],
            "people": [],
            "key_points": ["Sensor fusion", "IMU/Camera calibration"],
        },
        {
            "day": 25,
            "text": "The sensors are finally working in perfect harmony. We recorded some amazing datasets today. Ready for the next phase of the robotics project.",
            "summary": "Successful sensor integration and data recording; ready for project phase 2.",
            "themes": ["Work", "Success", "Robotics"],
            "people": ["Sarah"],
            "key_points": ["Sensors working", "Data recording", "Phase 2 ready"],
        },
    ]

    for data in seed_data:
        dt = datetime(2026, 3, data["day"], 12, 0, tzinfo=timezone.utc)
        insights = InsightsEmbedded(
            key_points=data["key_points"],
            themes=data["themes"],
            people=data["people"],
            projects=[ProjectItem(name="Robotics Project", notes="Continuous development")]
            if "Robotics" in data["themes"]
            else [],
        )
        entry = JournalEntryDocument(
            user_id=user_id,
            content=data["text"],
            cleaned_text=data["text"],
            summary=data["summary"],
            insights=insights,
            created_at=dt,
            updated_at=dt,
            source="text",
        )
        await entry.insert()

    logger.info("Seeded March 2026 entries for admin user.")
