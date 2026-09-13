from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from database import get_users_collection, get_entitlements_collection

PASS_DURATION_DAYS = 7


async def get_user_entitlement(email: str) -> Dict[str, Any]:
    """
    Evaluates and returns user's active entitlement.
    Automatically transitions expired passes to FREE without data loss.
    """
    if not email or email in ["guest", "guest@local"]:
        return {
            "plan": "FREE",
            "subscription_status": "INACTIVE",
            "access_started_at": None,
            "access_expires_at": None,
            "days_remaining": 0,
            "is_active": False,
        }

    users_col = get_users_collection()
    if users_col is None:
        return {
            "plan": "FREE",
            "subscription_status": "INACTIVE",
            "access_started_at": None,
            "access_expires_at": None,
            "days_remaining": 0,
            "is_active": False,
        }

    now = datetime.now(timezone.utc)
    user = await users_col.find_one({"email": email})

    if not user:
        # Create default Free user record
        await users_col.insert_one({
            "email": email,
            "plan": "FREE",
            "subscription_status": "INACTIVE",
            "access_started_at": None,
            "access_expires_at": None,
            "created_at": now,
            "updated_at": now,
        })
        return {
            "plan": "FREE",
            "subscription_status": "INACTIVE",
            "access_started_at": None,
            "access_expires_at": None,
            "days_remaining": 0,
            "is_active": False,
        }

    expires_at = user.get("access_expires_at")
    plan = user.get("plan", "FREE")

    # If user has an expiration date set
    if expires_at:
        # Convert to timezone-aware UTC datetime if needed
        if isinstance(expires_at, str):
            try:
                expires_at_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            except Exception:
                expires_at_dt = now - timedelta(days=1)
        elif isinstance(expires_at, datetime):
            expires_at_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_dt = now - timedelta(days=1)

        # Active check
        if expires_at_dt > now:
            time_left = expires_at_dt - now
            days_remaining = max(1, time_left.days + (1 if time_left.seconds > 0 else 0))
            return {
                "plan": "ASTRA_7_DAY",
                "subscription_status": "ACTIVE",
                "access_started_at": user.get("access_started_at").isoformat() if isinstance(user.get("access_started_at"), datetime) else user.get("access_started_at"),
                "access_expires_at": expires_at_dt.isoformat(),
                "days_remaining": days_remaining,
                "is_active": True,
            }
        else:
            # Pass has expired! Automatically update status to EXPIRED
            if user.get("subscription_status") != "EXPIRED":
                await users_col.update_one(
                    {"email": email},
                    {
                        "$set": {
                            "plan": "FREE",
                            "subscription_status": "EXPIRED",
                            "updated_at": now,
                        }
                    },
                )
            return {
                "plan": "FREE",
                "subscription_status": "EXPIRED",
                "access_started_at": user.get("access_started_at").isoformat() if isinstance(user.get("access_started_at"), datetime) else user.get("access_started_at"),
                "access_expires_at": expires_at_dt.isoformat(),
                "days_remaining": 0,
                "is_active": False,
            }

    # Backward compatibility with legacy is_pro flag
    if user.get("is_pro"):
        return {
            "plan": "ASTRA_7_DAY",
            "subscription_status": "ACTIVE",
            "access_started_at": None,
            "access_expires_at": None,
            "days_remaining": 7,
            "is_active": True,
        }

    return {
        "plan": "FREE",
        "subscription_status": "INACTIVE",
        "access_started_at": None,
        "access_expires_at": None,
        "days_remaining": 0,
        "is_active": False,
    }


async def activate_7_day_pass(
    user_email: str,
    source_payment_id: str,
    days: int = PASS_DURATION_DAYS,
) -> Dict[str, Any]:
    """
    Grants 7-day Astra Pass to user and persists in DB.
    Uses strict server time. If user has active time remaining,
    safely stacks the 7 days on top of their existing expiry.
    """
    now = datetime.now(timezone.utc)
    users_col = get_users_collection()
    entitlements_col = get_entitlements_collection()

    user = await users_col.find_one({"email": user_email}) if users_col is not None else None
    base_time = now

    if user and user.get("access_expires_at"):
        existing_exp = user.get("access_expires_at")
        if isinstance(existing_exp, str):
            try:
                dt = datetime.fromisoformat(existing_exp.replace("Z", "+00:00"))
                if dt > now:
                    base_time = dt
            except Exception:
                pass
        elif isinstance(existing_exp, datetime):
            dt = existing_exp if existing_exp.tzinfo else existing_exp.replace(tzinfo=timezone.utc)
            if dt > now:
                base_time = dt

    expires_at = base_time + timedelta(days=days)
    started_at = user.get("access_started_at") if (user and base_time > now and user.get("access_started_at")) else now

    if users_col is not None:
        await users_col.update_one(
            {"email": user_email},
            {
                "$set": {
                    "plan": "ASTRA_7_DAY",
                    "subscription_status": "ACTIVE",
                    "access_started_at": started_at,
                    "access_expires_at": expires_at,
                    "is_pro": True,
                    "updated_at": now,
                }
            },
            upsert=True,
        )

    if entitlements_col is not None:
        await entitlements_col.insert_one({
            "user_id": user_email,
            "email": user_email,
            "plan": "ASTRA_7_DAY",
            "starts_at": started_at,
            "expires_at": expires_at,
            "status": "ACTIVE",
            "source_payment_id": source_payment_id,
            "created_at": now,
        })

    days_remaining = max(1, (expires_at - now).days + (1 if (expires_at - now).seconds > 0 else 0))

    return {
        "plan": "ASTRA_7_DAY",
        "subscription_status": "ACTIVE",
        "access_started_at": started_at.isoformat() if isinstance(started_at, datetime) else started_at,
        "access_expires_at": expires_at.isoformat(),
        "days_remaining": days_remaining,
        "is_active": True,
    }

