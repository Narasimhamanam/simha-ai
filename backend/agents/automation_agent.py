import httpx
import re
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

URL_SYSTEM_PROMPT = """You are a smart research assistant. You are given the raw text content of a webpage.

Your job is to produce a clear, structured summary. Respond ONLY with valid JSON:
{
  "title": "<page title or inferred topic>",
  "summary": "<2-3 paragraph summary of the main content>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>", "<point 4>", "<point 5>"],
  "category": "<article|documentation|research|news|tutorial|other>",
  "reading_time_minutes": <estimated original reading time as integer>
}

Do NOT include markdown fences. Only valid JSON."""

CALENDAR_SYSTEM_PROMPT = """You are a calendar scheduling assistant. Extract structured event details from the user's natural language request.

Respond ONLY with valid JSON:
{
  "title": "<event title>",
  "description": "<event description or agenda>",
  "date": "<YYYY-MM-DD>",
  "start_time": "<HH:MM in 24h format>",
  "end_time": "<HH:MM in 24h format, default 1 hour after start>",
  "attendees": ["<email1>", "<email2>"],
  "location": "<location or empty string>",
  "suggestions": "<optional tip for the user>"
}

Rules:
- If no specific date mentioned, assume the next occurrence of the mentioned day
- If year not mentioned, assume current year 2026
- If no time mentioned, default to 10:00
- Duration defaults to 1 hour unless specified
- Extract attendee emails if mentioned
- Do NOT use markdown fences"""


async def summarize_url(url: str) -> dict:
    """Fetch a URL and summarize its content using Groq."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    }

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client_http:
        response = await client_http.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    # Strip HTML tags simply
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Truncate to ~6000 chars to stay within token limits
    text = text[:6000]

    if len(text) < 100:
        raise ValueError("Page has too little readable content.")

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": URL_SYSTEM_PROMPT},
            {"role": "user", "content": f"URL: {url}\n\nPage content:\n{text}"},
        ],
        temperature=0.3,
        max_tokens=1024,
    )

    import json
    raw = completion.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except Exception:
        return {
            "title": url,
            "summary": raw,
            "key_points": [],
            "category": "other",
            "reading_time_minutes": 0,
        }


def generate_calendar_event(prompt: str, sender_name: str = "") -> dict:
    """Parse natural language into a structured Google Calendar event."""
    import json

    context = f"User name: {sender_name}\n\nRequest: {prompt}" if sender_name else f"Request: {prompt}"

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": CALENDAR_SYSTEM_PROMPT},
            {"role": "user", "content": context},
        ],
        temperature=0.2,
        max_tokens=512,
    )

    raw = completion.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except Exception:
        return {
            "title": "New Event",
            "description": prompt,
            "date": "",
            "start_time": "10:00",
            "end_time": "11:00",
            "attendees": [],
            "location": "",
            "suggestions": "Please review and edit before creating.",
        }
