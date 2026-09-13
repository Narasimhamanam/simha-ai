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
_users_collection = None
_payments_collection = None
_entitlements_collection = None
_usages_collection = None
_audit_logs_collection = None


def _reset_client():
    """Force-reset the cached client so next call recreates it."""
    global _client, _chat_collection, _documents_collection, _users_collection
    global _payments_collection, _entitlements_collection, _usages_collection, _audit_logs_collection
    _client = None
    _chat_collection = None
    _documents_collection = None
    _users_collection = None
    _payments_collection = None
    _entitlements_collection = None
    _usages_collection = None
    _audit_logs_collection = None


def _get_db():
    global _client
    mongo_url = os.getenv("MONGO_URL") or MONGO_URL
    database_name = os.getenv("DATABASE_NAME") or DATABASE_NAME
    if not mongo_url or not database_name:
        return None
    if _client is None:
        _client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            tlsCAFile=certifi.where(),
        )
        print("Mongo DB Connected Successfully")
    return _client[database_name]


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


def get_users_collection():
    global _users_collection
    db = _get_db()
    if db is None:
        return None
    if _users_collection is None:
        _users_collection = db["users"]
    return _users_collection


def get_payments_collection():
    global _payments_collection
    db = _get_db()
    if db is None:
        return None
    if _payments_collection is None:
        _payments_collection = db["payments"]
    return _payments_collection


def get_entitlements_collection():
    global _entitlements_collection
    db = _get_db()
    if db is None:
        return None
    if _entitlements_collection is None:
        _entitlements_collection = db["entitlements"]
    return _entitlements_collection


def get_usages_collection():
    global _usages_collection
    db = _get_db()
    if db is None:
        return None
    if _usages_collection is None:
        _usages_collection = db["usages"]
    return _usages_collection


def get_audit_logs_collection():
    global _audit_logs_collection
    db = _get_db()
    if db is None:
        return None
    if _audit_logs_collection is None:
        _audit_logs_collection = db["audit_logs"]
    return _audit_logs_collection


async def ensure_indexes():
    """Ensure essential indexes exist for performance, idempotency, and security."""
    try:
        users = get_users_collection()
        if users is not None:
            await users.create_index("email", unique=True, sparse=True)

        payments = get_payments_collection()
        if payments is not None:
            await payments.create_index("merchant_transaction_id", unique=True, sparse=True)
            await payments.create_index("order_id")
            await payments.create_index("user_id")

        entitlements = get_entitlements_collection()
        if entitlements is not None:
            await entitlements.create_index([("user_id", 1), ("status", 1)])
            await entitlements.create_index("expires_at")

        usages = get_usages_collection()
        if usages is not None:
            await usages.create_index([("user_id", 1), ("date", 1)], unique=True, sparse=True)

        chats = get_chat_collection()
        if chats is not None:
            await chats.create_index("user_email")

        docs = get_documents_collection()
        if docs is not None:
            await docs.create_index("user_email")
    except Exception as e:
        print(f"[DB] ensure_indexes notice: {e}")
