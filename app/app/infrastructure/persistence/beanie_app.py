"""Motor client + Beanie initialization for the FastAPI app."""

from __future__ import annotations

import logging
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.infrastructure.persistence.database import DOCUMENT_MODELS
from app.infrastructure.persistence.documents import UserDocument
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
