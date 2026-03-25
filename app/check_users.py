import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.infrastructure.persistence.database import DOCUMENT_MODELS
from app.infrastructure.persistence.documents import UserDocument

async def main():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    await init_beanie(database=db, document_models=DOCUMENT_MODELS)
    users = await UserDocument.find_all().to_list()
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"Email: {u.email}, Admin: {u.is_admin}")

if __name__ == "__main__":
    asyncio.run(main())
