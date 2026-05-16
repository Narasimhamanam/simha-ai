from datetime import datetime, timezone
from fastapi import HTTPException
from database import get_users_collection

DAILY_CREDITS = 10.0

async def get_user_credits(email: str) -> dict:
    if not email or email == "guest" or email == "guest@local":
        return {"credits": DAILY_CREDITS, "is_pro": False}
    
    col = get_users_collection()
    if col is None:
        return {"credits": DAILY_CREDITS, "is_pro": False}
    
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user = await col.find_one({"email": email})
    
    if not user:
        await col.insert_one({
            "email": email,
            "credits": DAILY_CREDITS,
            "last_reset_date": today_str,
            "is_pro": False
        })
        return {"credits": DAILY_CREDITS, "is_pro": False}
    
    is_pro = user.get("is_pro", False)
    
    # Check if reset needed
    if user.get("last_reset_date") != today_str:
        await col.update_one(
            {"email": email},
            {"$set": {"credits": DAILY_CREDITS, "last_reset_date": today_str}}
        )
        return {"credits": DAILY_CREDITS, "is_pro": is_pro}
        
    return {"credits": float(user.get("credits", 0.0)), "is_pro": is_pro}

async def check_credits(email: str, minimum: float = 1.0) -> float:
    """Check if user has enough credits before starting a request."""
    info = await get_user_credits(email)
    if info.get("is_pro"):
        return 999999.0
        
    credits = info.get("credits", 0.0)
    if credits < minimum:
        raise HTTPException(status_code=402, detail="Daily credit limit reached. Resets tomorrow or upgrade to Pro.")
    return credits

async def deduct_credits(email: str, amount: float) -> float:
    """Deduct credits after generation."""
    if not email or email == "guest" or email == "guest@local":
        return DAILY_CREDITS
        
    info = await get_user_credits(email)
    if info.get("is_pro"):
        return 999999.0
        
    col = get_users_collection()
    if col is None:
        return DAILY_CREDITS
        
    current_credits = info.get("credits", 0.0)
    new_credits = max(0.0, current_credits - amount)
    
    await col.update_one(
        {"email": email},
        {"$set": {"credits": new_credits}}
    )
    return new_credits

def calculate_credits(query: str, answer: str = "") -> float:
    """
    Calculate credit cost based on question length and answer length.
    Base cost is 0.5. Every 500 characters adds 0.1 to the cost.
    """
    total_len = len(query or "") + len(answer or "")
    cost = 0.5 + (total_len / 500.0) * 0.1
    return round(cost, 2)
