import os
from datetime import datetime, timezone
from fastapi import HTTPException
from database import get_usages_collection
from services.entitlement import get_user_entitlement

FREE_DAILY_MESSAGES = int(os.getenv("FREE_DAILY_MESSAGES", "10"))
PREMIUM_DAILY_MESSAGES = int(os.getenv("PREMIUM_DAILY_MESSAGES", "100"))

FREE_DAILY_DOCS = int(os.getenv("FREE_DAILY_DOCUMENTS", "2"))
PREMIUM_DAILY_DOCS = int(os.getenv("PREMIUM_DAILY_DOCUMENTS", "20"))


async def get_or_create_daily_usage(email: str, today_str: str) -> dict:
    """Fetch or initialize the daily usage document for a user."""
    usages_col = get_usages_collection()
    if usages_col is None:
        return {"messages_count": 0, "document_requests": 0, "image_requests": 0}

    doc = await usages_col.find_one({"user_id": email, "date": today_str})
    if not doc:
        new_doc = {
            "user_id": email,
            "email": email,
            "date": today_str,
            "messages_count": 0,
            "tokens_estimated": 0,
            "document_requests": 0,
            "image_requests": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await usages_col.insert_one(new_doc)
        return new_doc
    return doc


async def check_user_quota(email: str, request_type: str = "message") -> dict:
    """
    Checks if user is within their daily usage quota.
    Raises HTTPException(402) if quota exceeded.
    """
    entitlement = await get_user_entitlement(email)
    is_premium = entitlement.get("is_active", False)

    message_limit = PREMIUM_DAILY_MESSAGES if is_premium else FREE_DAILY_MESSAGES
    doc_limit = PREMIUM_DAILY_DOCS if is_premium else FREE_DAILY_DOCS

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage_doc = await get_or_create_daily_usage(email, today_str)

    current_messages = usage_doc.get("messages_count", 0)
    current_docs = usage_doc.get("document_requests", 0)

    if request_type in ["message", "image", "wisdom"]:
        if current_messages >= message_limit:
            plan_name = "Free tier" if not is_premium else "Astra Pass"
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "QUOTA_EXCEEDED",
                    "message": f"Your daily Astra {request_type} limit ({message_limit} requests) has been reached.",
                    "plan": entitlement.get("plan"),
                    "can_upgrade": not is_premium,
                    "upgrade_url": "/pricing",
                },
            )
    elif request_type == "document":
        if current_docs >= doc_limit:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "DOC_QUOTA_EXCEEDED",
                    "message": f"Your daily document processing limit ({doc_limit} documents) has been reached.",
                    "plan": entitlement.get("plan"),
                    "can_upgrade": not is_premium,
                    "upgrade_url": "/pricing",
                },
            )

    return {
        "entitlement": entitlement,
        "is_premium": is_premium,
        "current_messages": current_messages,
        "message_limit": message_limit,
        "current_docs": current_docs,
        "doc_limit": doc_limit,
    }


async def record_user_usage(
    email: str,
    request_type: str = "message",
    tokens_estimated: int = 0,
):
    """
    Increments daily usage counters for the user.
    """
    if not email or email in ["guest", "guest@local"]:
        return

    usages_col = get_usages_collection()
    if usages_col is None:
        return

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    inc_fields = {"tokens_estimated": tokens_estimated}

    if request_type == "document":
        inc_fields["document_requests"] = 1
    elif request_type == "image":
        inc_fields["image_requests"] = 1
        inc_fields["messages_count"] = 1
    else:
        inc_fields["messages_count"] = 1

    await usages_col.update_one(
        {"user_id": email, "date": today_str},
        {
            "$inc": inc_fields,
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


async def get_usage_summary(email: str) -> dict:
    """
    Returns usage information for the frontend dashboard and status pills.
    """
    entitlement = await get_user_entitlement(email)
    is_premium = entitlement.get("is_active", False)

    message_limit = PREMIUM_DAILY_MESSAGES if is_premium else FREE_DAILY_MESSAGES
    doc_limit = PREMIUM_DAILY_DOCS if is_premium else FREE_DAILY_DOCS

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage_doc = await get_or_create_daily_usage(email, today_str)

    current_messages = usage_doc.get("messages_count", 0)
    current_docs = usage_doc.get("document_requests", 0)

    return {
        "plan": entitlement.get("plan", "FREE"),
        "subscription_status": entitlement.get("subscription_status", "INACTIVE"),
        "is_premium": is_premium,
        "days_remaining": entitlement.get("days_remaining", 0),
        "access_expires_at": entitlement.get("access_expires_at"),
        "messages_used": current_messages,
        "messages_limit": message_limit,
        "documents_used": current_docs,
        "documents_limit": doc_limit,
        "quota_reached": current_messages >= message_limit,
    }
