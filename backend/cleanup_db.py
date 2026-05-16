"""
cleanup_db.py
Clears ALL data from chats and documents collections in MongoDB.
Run this once to reset the database: python cleanup_db.py
"""

import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")


async def cleanup():
    print(f"Connecting to MongoDB: {DATABASE_NAME}...")
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=10000,
        tlsCAFile=certifi.where(),
    )
    db = client[DATABASE_NAME]

    # Count before deletion
    chats_count = await db["chats"].count_documents({})
    docs_count = await db["documents"].count_documents({})
    print(f"\nFound {chats_count} chats and {docs_count} documents")

    if chats_count == 0 and docs_count == 0:
        print("Database is already empty.")
        client.close()
        return

    # Delete all
    print("\nDeleting all data...")
    chat_result = await db["chats"].delete_many({})
    doc_result = await db["documents"].delete_many({})

    print(f"  Deleted {chat_result.deleted_count} chats")
    print(f"  Deleted {doc_result.deleted_count} documents")
    print("\n✅ Database cleared successfully!")
    print("Users can now log in fresh.")

    client.close()


if __name__ == "__main__":
    asyncio.run(cleanup())
