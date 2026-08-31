import os
from groq import Groq
from dotenv import load_dotenv
import json
import re

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

EMAIL_SYSTEM_PROMPT = """You are an expert email writing assistant integrated into Simha AI.

Your job is to generate a professional, well-structured email based on the user's description.

RULES:
1. Extract or infer the recipient email if mentioned, otherwise leave blank.
2. Generate a concise, clear subject line.
3. Write a professional email body with proper greeting, body, and closing.
4. Adapt tone: formal for professional/business emails, semi-formal for general.
5. Keep the body clear and to the point.
6. Sign off with the user's name if provided, otherwise use "Best regards,\\n[Your Name]".

ALWAYS respond with ONLY valid JSON in this exact format:
{
  "to": "<recipient email or empty string>",
  "cc": "<cc email or empty string>",
  "subject": "<subject line>",
  "body": "<full email body with proper formatting>",
  "tone": "<formal|semi-formal|casual>",
  "suggestions": "<optional short tip for the user, max 1 sentence>"
}

Do NOT include any text outside the JSON. Do NOT use markdown code blocks."""


def generate_email_draft(prompt: str, sender_name: str = "") -> dict:
    """
    Generate a structured email draft from a natural language prompt.
    Returns a dict with: to, cc, subject, body, tone, suggestions
    """
    user_context = f"Sender name: {sender_name}\n\nUser request: {prompt}" if sender_name else f"User request: {prompt}"

    completion = client.chat.completions.create(
        model="qwen/qwen3.8-27b",
        messages=[
            {"role": "system", "content": EMAIL_SYSTEM_PROMPT},
            {"role": "user", "content": user_context},
        ],
        temperature=0.4,
        max_tokens=1024,
    )

    raw = completion.choices[0].message.content.strip()

    # Strip markdown code fences if model wraps response
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return a structured error so frontend can handle gracefully
        data = {
            "to": "",
            "cc": "",
            "subject": "Email Draft",
            "body": raw,
            "tone": "formal",
            "suggestions": "Please review and edit before sending.",
        }

    return data
