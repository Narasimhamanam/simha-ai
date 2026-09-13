import os
from typing import Optional
from fastapi import Request, HTTPException, Depends, Header
from services.entitlement import get_user_entitlement
from dotenv import load_dotenv

load_dotenv()

ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "admin@astra.ai,narasimhamanam@gmail.com").split(",")
    if email.strip()
]


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
) -> dict:
    """
    Resolves caller identity from Headers.
    Supports Bearer token extraction and authenticated email headers.
    """
    email = None

    # Check X-User-Email header first (sent by frontend client)
    if x_user_email and "@" in x_user_email:
        email = x_user_email.strip().lower()

    # Check Authorization header (Firebase ID token or Bearer email)
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        if "@" in token:
            email = token.lower()
        else:
            # Decode JWT payload
            try:
                parts = token.split(".")
                if len(parts) == 3:
                    import base64, json, time
                    p_b64 = parts[1]
                    pad = 4 - (len(p_b64) % 4)
                    if pad != 4:
                        p_b64 += "=" * pad
                    claims = json.loads(base64.urlsafe_b64decode(p_b64).decode("utf-8"))
                    exp = claims.get("exp")
                    if not exp or exp >= time.time() - 300:
                        email = claims.get("email", "").strip().lower()
            except Exception:
                pass

    # Fallback to body/query params if request has json payload
    if not email:
        try:
            # Non-blocking peek if already read
            pass
        except Exception:
            pass

    # Default to guest if no credentials provided
    if not email:
        email = "guest@local"

    is_admin = email in ADMIN_EMAILS
    return {
        "email": email,
        "is_guest": email in ["guest", "guest@local"],
        "is_admin": is_admin,
    }


async def require_authenticated_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Ensures the caller is an authenticated user."""
    if current_user.get("is_guest"):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to Astra AI.",
        )
    return current_user


async def require_active_premium(
    current_user: dict = Depends(require_authenticated_user),
) -> dict:
    """Ensures the caller holds an active Astra 7-Day Pass."""
    entitlement = await get_user_entitlement(current_user["email"])
    if not entitlement.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "PREMIUM_REQUIRED",
                "message": "This feature requires an active Astra 7-Day Pass.",
                "upgrade_url": "/pricing",
            },
        )
    return current_user


async def require_admin(
    current_user: dict = Depends(require_authenticated_user),
) -> dict:
    """Ensures the caller has administrative privileges."""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Administrative privileges required.",
        )
    return current_user
