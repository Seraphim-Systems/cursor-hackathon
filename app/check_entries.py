import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.infrastructure.persistence.database import DOCUMENT_MODELS
from app.infrastructure.persistence.documents import UserDocument, JournalEntryDocument

async def main():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    await init_beanie(database=db, document_models=DOCUMENT_MODELS)
    users = await UserDocument.find_all().to_list()
    for u in users:
        count = await JournalEntryDocument.find(JournalEntryDocument.user_id == str(u.id)).count()
        print(f"Email: {u.email}, Entries: {count}")

if __name__ == "__main__":
    asyncio.run(main())
