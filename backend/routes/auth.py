import os
import time
import json
import base64
import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel

from database import get_users_collection
from security.auth import ADMIN_EMAILS, get_current_user
from services.entitlement import get_user_entitlement

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SessionInitRequest(BaseModel):
    id_token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    avatar: Optional[str] = None


def decode_jwt_unverified(token: str) -> dict:
    """
    Safely decodes JWT payload claims without requiring third-party libraries.
    Extracts uid, email, exp, name, picture.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload_b64 = parts[1]
        # Pad base64 if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
        payload_json = base64.urlsafe_b64decode(payload_b64).decode("utf-8")
        return json.loads(payload_json)
    except Exception:
        return {}


@router.post("/session")
async def create_or_sync_session(
    request: SessionInitRequest,
    req: Request,
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    """
    Establishes or syncs an authenticated session from Firebase credentials.
    Idempotent: updates existing user or creates new user record in MongoDB.
    Returns the user profile and current entitlement status.
    """
    # 1. Resolve Token & Claims
    token = request.id_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    claims = {}
    if token:
        claims = decode_jwt_unverified(token)

    # Validate expiration if exp claim is present
    exp = claims.get("exp")
    if exp and exp < time.time() - 300: # 5 min grace for clock skew
        raise HTTPException(status_code=401, detail="Firebase token has expired. Please refresh session.")

    email = (
        claims.get("email")
        or request.email
        or x_user_email
        or ""
    ).strip().lower()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid user email is required to establish session.")

    uid = claims.get("sub") or claims.get("user_id") or email
    name = claims.get("name") or request.name or email.split("@")[0]
    avatar = claims.get("picture") or request.avatar or ""

    is_admin = email in ADMIN_EMAILS

    # 2. Sync with MongoDB users collection
    users_col = get_users_collection()
    user_doc = None
    if users_col is not None:
        try:
            user_doc = await users_col.find_one({"email": email})
            now = datetime.datetime.now(datetime.timezone.utc)
            if not user_doc:
                # First-time login: create new user
                new_user = {
                    "uid": uid,
                    "email": email,
                    "name": name,
                    "avatar": avatar,
                    "plan": "FREE",
                    "subscription_status": "INACTIVE",
                    "created_at": now,
                    "last_login_at": now,
                }
                await users_col.insert_one(new_user)
                user_doc = new_user
            else:
                # Update last login and profile info
                update_fields = {"last_login_at": now}
                if name and not user_doc.get("name"):
                    update_fields["name"] = name
                if avatar and not user_doc.get("avatar"):
                    update_fields["avatar"] = avatar
                if uid and not user_doc.get("uid"):
                    update_fields["uid"] = uid
                await users_col.update_one({"email": email}, {"$set": update_fields})
        except Exception as e:
            print(f"[Auth Route] MongoDB sync notice: {e}")

    # 3. Retrieve entitlement
    entitlement = await get_user_entitlement(email)

    return {
        "status": "authenticated",
        "user": {
            "uid": uid,
            "email": email,
            "name": name,
            "avatar": avatar,
            "is_admin": is_admin,
            "plan": entitlement.get("plan", "FREE"),
            "subscription_status": entitlement.get("subscription_status", "INACTIVE"),
            "is_active_premium": entitlement.get("is_active", False),
            "days_remaining": entitlement.get("days_remaining", 0),
        },
        "entitlement": entitlement,
    }


@router.get("/me")
async def get_session_profile(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile and active entitlement."""
    email = current_user["email"]
    entitlement = await get_user_entitlement(email)
    users_col = get_users_collection()
    user_doc = None
    if users_col is not None:
        try:
            user_doc = await users_col.find_one({"email": email})
        except Exception:
            pass

    return {
        "email": email,
        "is_admin": current_user.get("is_admin", False),
        "is_guest": current_user.get("is_guest", False),
        "name": user_doc.get("name", email.split("@")[0]) if user_doc else email.split("@")[0],
        "avatar": user_doc.get("avatar", "") if user_doc else "",
        "plan": entitlement.get("plan", "FREE"),
        "is_active_premium": entitlement.get("is_active", False),
        "days_remaining": entitlement.get("days_remaining", 0),
    }
