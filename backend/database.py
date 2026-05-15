import certifi
import os

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")

_client: AsyncIOMotorClient | None = None
_chat_collection = None


def _reset_client():
    """Force-reset the cached client so next call recreates it."""
    global _client, _chat_collection
    _client = None
    _chat_collection = None


def get_chat_collection():
    """
    Lazy getter. Creates the Motor client on first call.
    On Render cold start with missing env vars this returns None safely.
    """
    global _client, _chat_collection

    if not MONGO_URL or not DATABASE_NAME:
        return None

    if _chat_collection is not None:
        return _chat_collection

    if _client is None:
        _client = AsyncIOMotorClient(
            MONGO_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            tlsCAFile=certifi.where(),
        )
        print("Mongo DB Connected Successfully")

    db = _client[DATABASE_NAME]
    _chat_collection = db["chats"]
    return _chat_collection
