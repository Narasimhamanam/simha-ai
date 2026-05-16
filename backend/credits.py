from datetime import datetime, timezone
from fastapi import HTTPException
from database import get_users_collection

DAILY_CREDITS = 10.0

async def get_user_credits(email: str) -> float:
    if not email or email == "guest" or email == "guest@local":
        return DAILY_CREDITS
    
    col = get_users_collection()
    if col is None:
        return DAILY_CREDITS
    
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user = await col.find_one({"email": email})
    
    if not user:
        await col.insert_one({
            "email": email,
            "credits": DAILY_CREDITS,
            "last_reset_date": today_str
        })
        return DAILY_CREDITS
    
    # Check if reset needed
    if user.get("last_reset_date") != today_str:
        await col.update_one(
            {"email": email},
            {"$set": {"credits": DAILY_CREDITS, "last_reset_date": today_str}}
        )
        return DAILY_CREDITS
        
    return float(user.get("credits", 0.0))

async def check_credits(email: str, minimum: float = 1.0) -> float:
    """Check if user has enough credits before starting a request."""
    credits = await get_user_credits(email)
    if credits < minimum:
        raise HTTPException(status_code=402, detail="Daily credit limit reached. Credits reset tomorrow.")
    return credits

async def deduct_credits(email: str, amount: float) -> float:
    """Deduct credits after generation."""
    if not email or email == "guest" or email == "guest@local":
        return DAILY_CREDITS
        
    col = get_users_collection()
    if col is None:
        return DAILY_CREDITS
        
    current_credits = await get_user_credits(email)
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
