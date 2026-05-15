import certifi
import os

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")

_client: AsyncIOMotorClient | None = None
_chat_collection = None
_documents_collection = None


def _reset_client():
    """Force-reset the cached client so next call recreates it."""
    global _client, _chat_collection, _documents_collection
    _client = None
    _chat_collection = None
    _documents_collection = None


def _get_db():
    global _client
    if not MONGO_URL or not DATABASE_NAME:
        return None
    if _client is None:
        _client = AsyncIOMotorClient(
            MONGO_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            tlsCAFile=certifi.where(),
        )
        print("Mongo DB Connected Successfully")
    return _client[DATABASE_NAME]


def get_chat_collection():
    global _chat_collection
    db = _get_db()
    if db is None:
        return None
    if _chat_collection is None:
        _chat_collection = db["chats"]
    return _chat_collection


def get_documents_collection():
    global _documents_collection
    db = _get_db()
    if db is None:
        return None
    if _documents_collection is None:
        _documents_collection = db["documents"]
    return _documents_collection
