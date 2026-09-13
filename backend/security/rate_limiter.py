import os
import time
from collections import defaultdict
from fastapi import Request, HTTPException

MAX_REQUESTS_PER_MINUTE = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "30"))

# In-memory sliding window request store: client_id -> list of timestamps
_request_history = defaultdict(list)


def rate_limit_check(request: Request, limit: int = MAX_REQUESTS_PER_MINUTE):
    """
    Sliding-window rate limiter per client IP / user identifier.
    Cleans up old timestamps and raises HTTP 429 if threshold is breached.
    """
    # Prefer client host IP, with fallback to forwarded headers
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    now = time.time()
    window_start = now - 60.0  # 1-minute window

    timestamps = _request_history[client_ip]

    # Filter out entries older than the window
    valid_timestamps = [t for t in timestamps if t > window_start]
    _request_history[client_ip] = valid_timestamps

    if len(valid_timestamps) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down and try again in a moment.",
        )

    _request_history[client_ip].append(now)
